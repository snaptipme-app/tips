const jwt = require('jsonwebtoken');
const { pool } = require('../db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.employee = decoded;

    // ── Real-time suspension check ──
    try {
      const { rows } = await pool.query('SELECT is_suspended FROM employees WHERE id = $1', [decoded.id]);
      if (rows.length > 0) {
        const isSuspended = rows[0].is_suspended;
        if (isSuspended === 1 || isSuspended === true) {
          console.log(`[auth] Blocked suspended user id=${decoded.id} from accessing ${req.method} ${req.originalUrl}`);
          return res.status(403).json({
            error: 'Your account has been suspended. Please contact support.',
            code: 'ACCOUNT_SUSPENDED'
          });
        }
      }
    } catch (dbErr) {
      console.error('[auth] Suspension check DB error:', dbErr.message);
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
