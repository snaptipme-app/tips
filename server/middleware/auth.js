const jwt = require('jsonwebtoken');
const { getDB } = require('../db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.employee = decoded;

    // ── Real-time suspension check ──
    // Even with a valid JWT, check if the account has been suspended since login
    try {
      const db = getDB();
      const result = db.exec('SELECT is_suspended FROM employees WHERE id = ?', [decoded.id]);
      if (result.length > 0 && result[0].values.length > 0) {
        const isSuspended = result[0].values[0][0];
        if (isSuspended === 1 || isSuspended === true) {
          console.log(`[auth] Blocked suspended user id=${decoded.id} from accessing ${req.method} ${req.originalUrl}`);
          return res.status(403).json({
            error: 'Your account has been suspended. Please contact support.',
            code: 'ACCOUNT_SUSPENDED'
          });
        }
      }
    } catch (dbErr) {
      // If DB check fails, log but still allow request (fail-open for DB issues only)
      console.error('[auth] Suspension check DB error:', dbErr.message);
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
