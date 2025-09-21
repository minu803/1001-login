const { body, param, query, validationResult } = require('express-validator');
const { formatValidationErrors } = require('./errorHandler');

// Custom validation middleware to handle results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: formatValidationErrors(errors)
    });
  }
  next();
};

// Common validation patterns
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

const nameValidation = body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .withMessage('Name must be between 2 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name can only contain letters, spaces, apostrophes, and hyphens');

// User registration validation
const validateRegistration = [
  nameValidation,
  emailValidation,
  passwordValidation,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('role')
    .optional()
    .isIn(['ADMIN', 'MODERATOR', 'CREATOR', 'LEARNER'])
    .withMessage('Invalid role specified'),
  body('termsAccepted')
    .isBoolean()
    .withMessage('Terms acceptance must be a boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
  body('privacyPolicyAccepted')
    .isBoolean()
    .withMessage('Privacy policy acceptance must be a boolean')
    .custom((value) => {
      if (!value) {
        throw new Error('You must accept the privacy policy');
      }
      return true;
    }),
  body('isMinor')
    .optional()
    .isBoolean()
    .withMessage('Minor status must be a boolean'),
  body('parentalConsentMethod')
    .if(body('isMinor').equals(true))
    .notEmpty()
    .withMessage('Parental consent method is required for minors'),
  handleValidationErrors
];

// User login validation
const validateLogin = [
  emailValidation,
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
  body('twoFactorCode')
    .optional()
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('Two-factor code must be 6 digits'),
  handleValidationErrors
];

// Forgot password validation
const validateForgotPassword = [
  emailValidation,
  handleValidationErrors
];

// Reset password validation
const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  passwordValidation,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  handleValidationErrors
];

// Change password validation
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  passwordValidation,
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  handleValidationErrors
];

// Email verification validation
const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors
];

// Update profile validation
const validateUpdateProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, apostrophes, and hyphens'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('profile.bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('profile.preferences.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'])
    .withMessage('Invalid language code'),
  body('profile.preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either light or dark'),
  body('profile.preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),
  body('profile.preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be a boolean'),
  handleValidationErrors
];

// Two-factor authentication validation
const validate2FA = [
  body('code')
    .isNumeric()
    .isLength({ min: 6, max: 6 })
    .withMessage('Two-factor code must be 6 digits'),
  handleValidationErrors
];

// User ID parameter validation
const validateUserId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['createdAt', '-createdAt', 'name', '-name', 'email', '-email'])
    .withMessage('Invalid sort option'),
  handleValidationErrors
];

// Search validation
const validateSearch = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s@.-]+$/)
    .withMessage('Search query contains invalid characters'),
  query('role')
    .optional()
    .isIn(['ADMIN', 'MODERATOR', 'CREATOR', 'LEARNER'])
    .withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active filter must be a boolean'),
  query('isEmailVerified')
    .optional()
    .isBoolean()
    .withMessage('Email verified filter must be a boolean'),
  handleValidationErrors
];

// Role update validation (admin only)
const validateRoleUpdate = [
  validateUserId[0],
  body('role')
    .isIn(['ADMIN', 'MODERATOR', 'CREATOR', 'LEARNER'])
    .withMessage('Invalid role specified'),
  handleValidationErrors
];

// Account status validation (admin only)
const validateAccountStatus = [
  validateUserId[0],
  body('isActive')
    .isBoolean()
    .withMessage('Account status must be a boolean'),
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be between 1 and 500 characters'),
  handleValidationErrors
];

// Custom sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Remove any HTML tags from string inputs
  const sanitizeString = (str) => {
    if (typeof str === 'string') {
      return str.replace(/<[^>]*>/g, '').trim();
    }
    return str;
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateEmailVerification,
  validateUpdateProfile,
  validate2FA,
  validateUserId,
  validatePagination,
  validateSearch,
  validateRoleUpdate,
  validateAccountStatus,
  sanitizeInput,
  handleValidationErrors
};
