const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check both userType (from JWT) and user_type (potential database format)
    const userRole = req.user.userType || req.user.user_type;
    
    if (!userRole) {
      return res.status(403).json({ message: 'Forbidden: User role not found' });
    }

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ 
        message: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        provided: userRole
      });
    }
  };
};

module.exports = { authenticate, authorize };

