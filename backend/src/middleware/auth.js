const { User, PERMISSIONS } = require('../models/User');
const jwtService = require('../utils/jwt');

/**
 * Middleware to authenticate users via JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check for token in various places
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    try {
      // Verify token
      const decoded = jwtService.verifyAccessToken(token);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('+twoFactorEnabled');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      if (user.isLocked) {
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked due to failed login attempts'
        });
      }

      // Attach user to request object
      req.user = user;
      next();

    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to authorize users based on roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check specific permissions
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permission}`
      });
    }

    next();
  };
};

/**
 * Middleware to check multiple permissions (user needs ALL of them)
 */
const requireAllPermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasAllPermissions = permissions.every(permission => 
      req.user.hasPermission(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has ANY of the specified permissions
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasAnyPermission = permissions.some(permission => 
      req.user.hasPermission(permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permissions (any): ${permissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      try {
        const decoded = jwtService.verifyAccessToken(token);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive && !user.isLocked) {
          req.user = user;
        }
      } catch (tokenError) {
        // Token is invalid, but we continue without user
        console.log('Optional auth token invalid:', tokenError.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Middleware to ensure email is verified
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

/**
 * Middleware to check if user owns the resource or has admin rights
 */
const requireOwnershipOrAdmin = (getResourceUserId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    try {
      const resourceUserId = await getResourceUserId(req);
      
      // Allow if user owns the resource or is admin
      if (req.user._id.toString() === resourceUserId.toString() || 
          req.user.hasPermission(PERMISSIONS.MANAGE_USERS)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
      
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

/**
 * Middleware to log security events
 */
const logSecurityEvent = (eventType) => {
  return (req, res, next) => {
    const securityEvent = {
      type: eventType,
      userId: req.user ? req.user._id : null,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      endpoint: req.path,
      method: req.method
    };

    console.log('Security Event:', securityEvent);
    // In production, you'd save this to a security logs collection
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  optionalAuth,
  requireEmailVerification,
  requireOwnershipOrAdmin,
  logSecurityEvent
};
