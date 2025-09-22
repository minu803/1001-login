const express = require('express');
const { User } = require('../models/User');
const { authenticate, requireEmailVerification, requireOwnershipOrAdmin } = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const {
  validateUpdateProfile,
  validateChangePassword,
  validateUserId,
  sanitizeInput
} = require('../middleware/validation');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate('refreshTokens', '-token');
  
  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
}));

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', sanitizeInput, validateUpdateProfile, catchAsync(async (req, res) => {
  const allowedFields = ['name', 'profile'];
  const updates = {};

  // Only include allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // If email is being updated, require verification
  if (req.body.email && req.body.email !== req.user.email) {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    
    updates.email = req.body.email;
    updates.isEmailVerified = false;
    
    // Generate new verification token
    const user = await User.findById(req.user._id);
    const verificationToken = user.createEmailVerificationToken();
    updates.emailVerificationToken = user.emailVerificationToken;
    updates.emailVerificationExpire = user.emailVerificationExpire;
    
    // TODO: Send verification email
    console.log(`Email verification token for ${req.body.email}: ${verificationToken}`);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user
    }
  });
}));

/**
 * @route   PUT /api/user/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', sanitizeInput, validateChangePassword, catchAsync(async (req, res) => {
  const { currentPassword, password } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCurrentPasswordCorrect = await user.comparePassword(currentPassword);
  
  if (!isCurrentPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = password;
  await user.save();

  // Remove all refresh tokens to force re-login on other devices
  user.refreshTokens = [];
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Password changed successfully'
  });
}));

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete('/account', requireEmailVerification, catchAsync(async (req, res) => {
  // Soft delete - deactivate account
  await User.findByIdAndUpdate(req.user._id, {
    isActive: false,
    email: `deleted_${Date.now()}_${req.user.email}`, // Prevent email conflicts
    refreshTokens: [] // Remove all sessions
  });

  // Clear cookies
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    message: 'Account deactivated successfully'
  });
}));

/**
 * @route   GET /api/user/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const sessions = user.refreshTokens.map(token => ({
    id: token._id,
    createdAt: token.createdAt,
    lastUsed: token.lastUsed,
    userAgent: token.userAgent,
    ipAddress: token.ipAddress,
    isCurrent: token.token === req.cookies.refreshToken
  }));

  res.status(200).json({
    success: true,
    data: {
      sessions
    }
  });
}));

/**
 * @route   DELETE /api/user/sessions/:sessionId
 * @desc    Revoke a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const user = await User.findById(req.user._id);
  
  // Find and remove the session
  const sessionIndex = user.refreshTokens.findIndex(
    token => token._id.toString() === sessionId
  );

  if (sessionIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Session not found'
    });
  }

  const revokedToken = user.refreshTokens[sessionIndex];
  user.refreshTokens.splice(sessionIndex, 1);
  await user.save({ validateBeforeSave: false });

  // If it's the current session, clear the cookie
  if (revokedToken.token === req.cookies.refreshToken) {
    res.clearCookie('refreshToken');
  }

  res.status(200).json({
    success: true,
    message: 'Session revoked successfully'
  });
}));

/**
 * @route   DELETE /api/user/sessions
 * @desc    Revoke all sessions except current
 * @access  Private
 */
router.delete('/sessions', catchAsync(async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken;
  
  await User.findByIdAndUpdate(req.user._id, {
    refreshTokens: currentRefreshToken 
      ? user.refreshTokens.filter(token => token.token === currentRefreshToken)
      : []
  });

  res.status(200).json({
    success: true,
    message: 'All other sessions revoked successfully'
  });
}));

/**
 * @route   POST /api/user/enable-2fa
 * @desc    Enable two-factor authentication
 * @access  Private
 */
router.post('/enable-2fa', requireEmailVerification, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.twoFactorEnabled) {
    return res.status(400).json({
      success: false,
      message: 'Two-factor authentication is already enabled'
    });
  }

  // In production, you would generate TOTP secret here
  const secret = 'MOCK_2FA_SECRET'; // This should be generated using speakeasy or similar
  const backupCodes = Array.from({ length: 10 }, () => 
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );

  user.twoFactorEnabled = true;
  user.twoFactorSecret = secret;
  user.twoFactorBackupCodes = backupCodes;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Two-factor authentication enabled successfully',
    data: {
      backupCodes: backupCodes // Show backup codes only once
    }
  });
}));

/**
 * @route   POST /api/user/disable-2fa
 * @desc    Disable two-factor authentication
 * @access  Private
 */
router.post('/disable-2fa', catchAsync(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to disable 2FA'
    });
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  const isPasswordCorrect = await user.comparePassword(password);
  
  if (!isPasswordCorrect) {
    return res.status(400).json({
      success: false,
      message: 'Incorrect password'
    });
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = [];

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Two-factor authentication disabled successfully'
  });
}));

/**
 * @route   GET /api/user/:id
 * @desc    Get user by ID (public profile info only)
 * @access  Private
 */
router.get('/:id', validateUserId, catchAsync(async (req, res) => {
  const user = await User.findById(req.params.id).select(
    'name email role profile.avatar profile.bio createdAt isActive'
  );

  if (!user || !user.isActive) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: {
      user
    }
  });
}));

module.exports = router;
