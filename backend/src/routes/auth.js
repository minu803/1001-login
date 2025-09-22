const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, ROLES } = require('../models/User');
const jwtService = require('../utils/jwt');
const { authenticate, logSecurityEvent } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateEmailVerification,
  validate2FA,
  sanitizeInput
} = require('../middleware/validation');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', sanitizeInput, validateRegistration, catchAsync(async (req, res) => {
  const {
    name,
    email,
    password,
    role = ROLES.LEARNER,
    termsAccepted,
    privacyPolicyAccepted,
    isMinor,
    parentalConsentMethod
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Create user object
  const userData = {
    name,
    email,
    password,
    role: role === ROLES.ADMIN ? ROLES.LEARNER : role, // Prevent admin registration via API
    termsAccepted: {
      version: '1.0',
      acceptedAt: new Date()
    },
    privacyPolicyAccepted: {
      version: '1.0',
      acceptedAt: new Date()
    }
  };

  // Handle COPPA compliance for minors
  if (isMinor) {
    userData.isMinor = true;
    userData.parentalConsent = {
      provided: !!parentalConsentMethod,
      providedAt: parentalConsentMethod ? new Date() : null,
      method: parentalConsentMethod
    };
  }

  // Create user
  const user = await User.create(userData);

  // Generate email verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  console.log(`Verification token for ${email}: ${verificationToken}`);

  // Generate JWT tokens
  const tokens = jwtService.generateTokenPair(user);

  // Set secure cookie with refresh token
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Log security event
  logSecurityEvent('USER_REGISTERED', req, { userId: user._id, email });

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please check your email to verify your account.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    }
  });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', sanitizeInput, validateLogin, catchAsync(async (req, res) => {
  const { email, password, rememberMe, twoFactorCode } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password +twoFactorEnabled +twoFactorSecret');

  if (!user || !(await user.comparePassword(password))) {
    // Log failed login attempt
    logSecurityEvent('FAILED_LOGIN_ATTEMPT', req, { email, reason: 'Invalid credentials' });
    
    if (user) {
      await user.incLoginAttempts();
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Check if account is locked
  if (user.isLocked) {
    logSecurityEvent('LOCKED_ACCOUNT_LOGIN_ATTEMPT', req, { userId: user._id, email });
    return res.status(423).json({
      success: false,
      message: 'Account temporarily locked due to too many failed login attempts'
    });
  }

  // Check if account is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Handle 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      // Generate temporary 2FA token
      const twoFAToken = jwtService.generate2FAToken(user._id);
      
      return res.status(200).json({
        success: false,
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        twoFactorToken: twoFAToken
      });
    }

    // Verify 2FA code (simplified - in production use proper TOTP)
    const validCodes = ['123456', '000000', '111111']; // Mock valid codes
    if (!validCodes.includes(twoFactorCode)) {
      logSecurityEvent('FAILED_2FA_ATTEMPT', req, { userId: user._id, email });
      return res.status(401).json({
        success: false,
        message: 'Invalid two-factor authentication code'
      });
    }
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate JWT tokens
  const tokenExpiry = rememberMe ? '30d' : '7d';
  const tokens = jwtService.generateTokenPair(user);

  // Store refresh token in user document
  const refreshTokenData = {
    token: tokens.refreshToken,
    createdAt: new Date(),
    lastUsed: new Date(),
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip
  };

  user.refreshTokens.push(refreshTokenData);
  
  // Keep only last 5 refresh tokens
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save({ validateBeforeSave: false });

  // Set secure cookie with refresh token
  const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: cookieMaxAge
  });

  // Log successful login
  logSecurityEvent('SUCCESSFUL_LOGIN', req, { userId: user._id, email });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      },
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    }
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    // Remove refresh token from user document
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  // Log logout event
  logSecurityEvent('USER_LOGOUT', req, { userId: req.user._id });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token not found'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);
    
    if (!tokenExists) {
      // Potentially compromised - remove all refresh tokens
      user.refreshTokens = [];
      await user.save({ validateBeforeSave: false });
      
      logSecurityEvent('SUSPICIOUS_REFRESH_TOKEN', req, { userId: user._id });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const newTokens = jwtService.generateTokenPair(user);

    // Update refresh token in database
    const tokenIndex = user.refreshTokens.findIndex(rt => rt.token === refreshToken);
    user.refreshTokens[tokenIndex] = {
      token: newTokens.refreshToken,
      createdAt: user.refreshTokens[tokenIndex].createdAt,
      lastUsed: new Date(),
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    await user.save({ validateBeforeSave: false });

    // Set new refresh token cookie
    res.cookie('refreshToken', newTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', sanitizeInput, validateForgotPassword, catchAsync(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal whether email exists or not
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // TODO: Send password reset email
  console.log(`Password reset token for ${email}: ${resetToken}`);

  // Log security event
  logSecurityEvent('PASSWORD_RESET_REQUESTED', req, { userId: user._id, email });

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', sanitizeInput, validateResetPassword, catchAsync(async (req, res) => {
  const { token, password } = req.body;

  // Hash token and find user
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired password reset token'
    });
  }

  // Set new password
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  
  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  // Log security event
  logSecurityEvent('PASSWORD_RESET_COMPLETED', req, { userId: user._id });

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully'
  });
}));

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email', sanitizeInput, validateEmailVerification, catchAsync(async (req, res) => {
  const { token } = req.body;

  // Hash token and find user
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired email verification token'
    });
  }

  // Verify email
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save({ validateBeforeSave: false });

  // Log security event
  logSecurityEvent('EMAIL_VERIFIED', req, { userId: user._id, email: user.email });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully'
  });
}));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', sanitizeInput, catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal whether email exists or not
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a verification link has been sent.'
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: 'Email is already verified'
    });
  }

  // Generate new verification token
  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // TODO: Send verification email
  console.log(`New verification token for ${email}: ${verificationToken}`);

  res.status(200).json({
    success: true,
    message: 'If an account with that email exists, a verification link has been sent.'
  });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

/**
 * @route   POST /api/auth/verify-2fa
 * @desc    Verify two-factor authentication code
 * @access  Public (requires 2FA token)
 */
router.post('/verify-2fa', sanitizeInput, validate2FA, catchAsync(async (req, res) => {
  const { code, twoFactorToken } = req.body;

  if (!twoFactorToken) {
    return res.status(400).json({
      success: false,
      message: 'Two-factor token is required'
    });
  }

  try {
    // Verify 2FA token
    const decoded = jwtService.verify2FAToken(twoFactorToken);
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify 2FA code (simplified - in production use proper TOTP)
    const validCodes = ['123456', '000000', '111111'];
    if (!validCodes.includes(code)) {
      logSecurityEvent('FAILED_2FA_VERIFICATION', req, { userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'Invalid two-factor authentication code'
      });
    }

    // Generate JWT tokens
    const tokens = jwtService.generateTokenPair(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Set secure cookie with refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // Log successful 2FA verification
    logSecurityEvent('SUCCESSFUL_2FA_VERIFICATION', req, { userId: user._id });

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin
        },
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn
      }
    });

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired two-factor token'
    });
  }
}));

module.exports = router;
