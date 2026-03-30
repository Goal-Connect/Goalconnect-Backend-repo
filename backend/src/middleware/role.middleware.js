/**
 * Middleware to restrict access based on user roles
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'academy', 'scout', 'player')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be set by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please log in.',
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this route.`,
      });
    }

    next();
  };
};

/**
 * Middleware to check if user's account is approved
 * Useful for academies and scouts that need admin approval
 */
const requireApproved = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in.',
    });
  }

  // Admin is always approved
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user status is approved
  if (req.user.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Your account is pending approval. Please wait for admin verification.',
      status: req.user.status,
    });
  }

  next();
};

/**
 * Middleware to check if user's email is verified
 */
const requireEmailVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in.',
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address before accessing this resource.',
    });
  }

  next();
};

module.exports = {
  authorize,
  requireApproved,
  requireEmailVerified,
};

