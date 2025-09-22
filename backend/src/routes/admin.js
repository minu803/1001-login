const express = require('express');
const { User, ROLES, PERMISSIONS } = require('../models/User');
const { 
  authenticate, 
  authorize, 
  requirePermission,
  requireAnyPermission,
  logSecurityEvent 
} = require('../middleware/auth');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const {
  validateUserId,
  validateRoleUpdate,
  validateAccountStatus,
  validatePagination,
  validateSearch,
  sanitizeInput
} = require('../middleware/validation');

const router = express.Router();

// All admin routes require authentication and specific permissions
router.use(authenticate);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin/Moderator
 */
router.get('/users', 
  requireAnyPermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS),
  validatePagination,
  validateSearch,
  catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = {};
    
    if (req.query.q) {
      query.$or = [
        { name: { $regex: req.query.q, $options: 'i' } },
        { email: { $regex: req.query.q, $options: 'i' } }
      ];
    }
    
    if (req.query.role) {
      query.role = req.query.role;
    }
    
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }
    
    if (req.query.isEmailVerified !== undefined) {
      query.isEmailVerified = req.query.isEmailVerified === 'true';
    }

    // Sort options
    let sort = {};
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-') 
        ? req.query.sort.substring(1) 
        : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort[sortField] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    const users = await User.find(query)
      .select('-refreshTokens -emailVerificationToken -passwordResetToken')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          count: users.length,
          totalRecords: total
        }
      }
    });
  })
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user details by ID
 * @access  Admin/Moderator
 */
router.get('/users/:id',
  requireAnyPermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS),
  validateUserId,
  catchAsync(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select('-refreshTokens -emailVerificationToken -passwordResetToken -twoFactorSecret -twoFactorBackupCodes');

    if (!user) {
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
  })
);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put('/users/:id/role',
  requirePermission(PERMISSIONS.MANAGE_ROLES),
  sanitizeInput,
  validateRoleUpdate,
  catchAsync(async (req, res) => {
    const { role } = req.body;

    // Prevent role changes on own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log security event
    logSecurityEvent('ROLE_CHANGED', req, { 
      targetUserId: user._id,
      newRole: role,
      changedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: {
        user
      }
    });
  })
);

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user account status (activate/deactivate)
 * @access  Admin only
 */
router.put('/users/:id/status',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  sanitizeInput,
  validateAccountStatus,
  catchAsync(async (req, res) => {
    const { isActive, reason } = req.body;

    // Prevent status changes on own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own account status'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive;

    // If deactivating, clear all sessions
    if (!isActive) {
      user.refreshTokens = [];
    }

    await user.save({ validateBeforeSave: false });

    // Log security event
    logSecurityEvent(isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', req, { 
      targetUserId: user._id,
      reason: reason || 'No reason provided',
      changedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user
      }
    });
  })
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (hard delete - use with caution)
 * @access  Admin only
 */
router.delete('/users/:id',
  requirePermission(PERMISSIONS.DELETE_USERS),
  validateUserId,
  catchAsync(async (req, res) => {
    // Prevent deletion of own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of other admins (unless super admin)
    if (user.role === ROLES.ADMIN && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log security event
    logSecurityEvent('USER_DELETED', req, { 
      deletedUserId: user._id,
      deletedUserEmail: user.email,
      deletedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  })
);

/**
 * @route   POST /api/admin/users/:id/unlock
 * @desc    Unlock user account (remove login attempts and lock)
 * @access  Admin/Moderator
 */
router.post('/users/:id/unlock',
  requireAnyPermission(PERMISSIONS.MANAGE_USERS, PERMISSIONS.MODERATE_CONTENT),
  validateUserId,
  catchAsync(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $unset: { loginAttempts: 1, lockUntil: 1 }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log security event
    logSecurityEvent('ACCOUNT_UNLOCKED', req, { 
      targetUserId: user._id,
      unlockedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User account unlocked successfully',
      data: {
        user
      }
    });
  })
);

/**
 * @route   POST /api/admin/users/:id/force-logout
 * @desc    Force logout user (remove all sessions)
 * @access  Admin only
 */
router.post('/users/:id/force-logout',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validateUserId,
  catchAsync(async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { refreshTokens: [] },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Log security event
    logSecurityEvent('FORCE_LOGOUT', req, { 
      targetUserId: user._id,
      forcedBy: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'User sessions terminated successfully'
    });
  })
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get user statistics
 * @access  Admin/Moderator
 */
router.get('/stats',
  requireAnyPermission(PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_USERS),
  catchAsync(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      lockedUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({ lockUntil: { $gt: Date.now() } }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email role createdAt isActive isEmailVerified')
    ]);

    const roleStats = {};
    usersByRole.forEach(item => {
      roleStats[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          total: totalUsers,
          active: activeUsers,
          verified: verifiedUsers,
          locked: lockedUsers,
          inactive: totalUsers - activeUsers
        },
        roleDistribution: roleStats,
        recentRegistrations: recentUsers
      }
    });
  })
);

/**
 * @route   GET /api/admin/security-logs
 * @desc    Get security event logs (mock implementation)
 * @access  Admin only
 */
router.get('/security-logs',
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validatePagination,
  catchAsync(async (req, res) => {
    // In a real implementation, you would fetch from a security logs collection
    // This is a mock response showing the structure
    const mockLogs = [
      {
        id: '1',
        timestamp: new Date(),
        event: 'FAILED_LOGIN_ATTEMPT',
        userId: null,
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        details: { email: 'user@example.com', reason: 'Invalid credentials' }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000),
        event: 'SUCCESSFUL_LOGIN',
        userId: '507f1f77bcf86cd799439011',
        ip: '192.168.1.101',
        userAgent: 'Mozilla/5.0...',
        details: { email: 'admin@example.com' }
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        logs: mockLogs,
        pagination: {
          current: 1,
          total: 1,
          count: mockLogs.length,
          totalRecords: mockLogs.length
        }
      }
    });
  })
);

module.exports = router;
