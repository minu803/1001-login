const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
  constructor() {
    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpire = process.env.JWT_EXPIRE || '15m';
    this.refreshTokenExpire = process.env.JWT_REFRESH_EXPIRE || '7d';
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        type: 'access'
      },
      this.accessTokenSecret,
      { 
        expiresIn: this.accessTokenExpire,
        issuer: '1001-stories',
        audience: 'web-app'
      }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        type: 'refresh',
        jti: crypto.randomUUID() // JWT ID for token revocation
      },
      this.refreshTokenSecret,
      { 
        expiresIn: this.refreshTokenExpire,
        issuer: '1001-stories',
        audience: 'web-app'
      }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair(user) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpiration(accessToken)
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded.exp;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(email) {
    return jwt.sign(
      { 
        email,
        type: 'email_verification',
        purpose: 'verify_email'
      },
      this.accessTokenSecret,
      { 
        expiresIn: '24h',
        issuer: '1001-stories',
        audience: 'email-verification'
      }
    );
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);
      
      if (decoded.type !== 'email_verification') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired email verification token');
    }
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(email) {
    return jwt.sign(
      { 
        email,
        type: 'password_reset',
        purpose: 'reset_password'
      },
      this.accessTokenSecret,
      { 
        expiresIn: '1h',
        issuer: '1001-stories',
        audience: 'password-reset'
      }
    );
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);
      
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Generate 2FA token (short-lived)
   */
  generate2FAToken(userId) {
    return jwt.sign(
      { 
        id: userId,
        type: '2fa_pending',
        purpose: 'two_factor_auth'
      },
      this.accessTokenSecret,
      { 
        expiresIn: '5m',
        issuer: '1001-stories',
        audience: '2fa-verification'
      }
    );
  }

  /**
   * Verify 2FA token
   */
  verify2FAToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret);
      
      if (decoded.type !== '2fa_pending') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired 2FA token');
    }
  }
}

module.exports = new JWTService();
