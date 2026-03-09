// Role-based authorization middleware

const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

const checkApprovalStatus = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'User not authenticated',
    });
  }

  // Users don't need approval
  if (req.user.role === 'user') {
    return next();
  }

  // Admin always approved
  if (req.user.role === 'admin') {
    return next();
  }
  if (!req.user.isApproved) {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending admin approval',
      requiresApproval: true,
    });
  }

  next();
};

module.exports = {
  checkRole,
  checkApprovalStatus,
};
