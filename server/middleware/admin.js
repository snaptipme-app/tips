const jwt = require('jsonwebtoken');

/**
 * Admin middleware — requires valid JWT AND is_admin = 1.
 * Must be used AFTER the standard authMiddleware.
 */
function adminMiddleware(req, res, next) {
  // authMiddleware should have already set req.employee
  if (!req.employee) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!req.employee.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  next();
}

module.exports = adminMiddleware;
