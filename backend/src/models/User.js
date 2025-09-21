const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Define user roles and permissions
const ROLES = {
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR', 
  CREATOR: 'CREATOR',
  LEARNER: 'LEARNER'
};

const PERMISSIONS = {
  // User management
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_USERS: 'VIEW_USERS',
  DELETE_USERS: 'DELETE_USERS',
  
  // Content management
  CREATE_CONTENT: 'CREATE_CONTENT',
  EDIT_CONTENT: 'EDIT_CONTENT',
  DELETE_CONTENT: 'DELETE_CONTENT',
  MODERATE_CONTENT: 'MODERATE_CONTENT',
  
  // System management
  MANAGE_ROLES: 'MANAGE_ROLES',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_SETTINGS: 'MANAGE_SETTINGS',
  
  // Basic permissions
  VIEW_CONTENT: 'VIEW_CONTENT',
  COMMENT: 'COMMENT',
  RATE_CONTENT: 'RATE_CONTENT'
};

// Role-permission mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.COMMENT,
    PERMISSIONS.RATE_CONTENT
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MODERATE_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.COMMENT,
    PERMISSIONS.RATE_CONTENT
  ],
  [ROLES.CREATOR]: [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.COMMENT,
    PERMISSIONS.RATE_CONTENT
  ],
  [ROLES.LEARNER]: [
    PERMISSIONS.VIEW_CONTENT,
    PERMISSIONS.COMMENT,
    PERMISSIONS.RATE_CONTENT
  ]
};

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.LEARNER
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  passwordResetToken: String,
  passwordResetExpire: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  profile: {
    avatar: String,
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    preferences: {
      language: {
        type: String,
        default: 'en'
      },
      theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        push: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  // OAuth providers
  providers: [{
    provider: {
      type: String,
      enum: ['google', 'facebook', 'github', 'apple', 'microsoft', 'linkedin']
    },
    providerId: String,
    email: String,
    displayName: String,
    linkedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorBackupCodes: {
    type: [String],
    select: false
  },
  // Session management
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: Date,
    userAgent: String,
    ipAddress: String
  }],
  // COPPA compliance for users under 13
  isMinor: {
    type: Boolean,
    default: false
  },
  parentalConsent: {
    provided: {
      type: Boolean,
      default: false
    },
    providedAt: Date,
    method: String // 'email', 'form', etc.
  },
  // Legal compliance
  termsAccepted: {
    version: String,
    acceptedAt: Date
  },
  privacyPolicyAccepted: {
    version: String,
    acceptedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.twoFactorSecret;
      delete ret.twoFactorBackupCodes;
      delete ret.refreshTokens;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate email verification token
userSchema.methods.createEmailVerificationToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.emailVerificationExpire = Date.now() + (parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) || 24 * 60 * 60 * 1000);
  
  return resetToken;
};

// Method to generate password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.passwordResetExpire = Date.now() + (parseInt(process.env.PASSWORD_RESET_EXPIRE) || 10 * 60 * 1000);
  
  return resetToken;
};

// Method to handle failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = ROLE_PERMISSIONS[this.role] || [];
  return rolePermissions.includes(permission);
};

// Method to get all user permissions
userSchema.methods.getPermissions = function() {
  return ROLE_PERMISSIONS[this.role] || [];
};

// Method to add OAuth provider
userSchema.methods.addProvider = function(provider, providerId, email, displayName) {
  const existingProvider = this.providers.find(p => p.provider === provider);
  
  if (existingProvider) {
    existingProvider.providerId = providerId;
    existingProvider.email = email;
    existingProvider.displayName = displayName;
    existingProvider.linkedAt = new Date();
  } else {
    this.providers.push({
      provider,
      providerId,
      email,
      displayName
    });
  }
};

// Static method to find user by email or provider
userSchema.statics.findByEmailOrProvider = function(email, provider, providerId) {
  const query = {
    $or: [
      { email: email },
      { 
        providers: {
          $elemMatch: {
            provider: provider,
            providerId: providerId
          }
        }
      }
    ]
  };
  
  return this.findOne(query);
};

module.exports = {
  User: mongoose.model('User', userSchema),
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS
};
