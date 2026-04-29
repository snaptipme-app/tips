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

    // ── Real-time suspension + soft-delete check ──
    try {
      const { rows } = await pool.query(
        'SELECT is_suspended, custom_message, show_photo_on_card, deleted_at FROM employees WHERE id = $1',
        [decoded.id]
      );
      if (rows.length > 0) {
        const dbUser = rows[0];
        if (dbUser.deleted_at) {
          console.log(`[auth] Blocked deleted user id=${decoded.id} from accessing ${req.method} ${req.originalUrl}`);
          return res.status(403).json({
            error: 'This account has been deleted.',
            code: 'ACCOUNT_DELETED'
          });
        }
        const user = {
          ...dbUser,
          custom_message: dbUser.custom_message || '',
          show_photo_on_card: dbUser.show_photo_on_card ?? 1,
        };
        if (user.is_suspended == 1) {
          console.log(`[auth] Blocked suspended user id=${decoded.id} from accessing ${req.method} ${req.originalUrl}`);
          return res.status(403).json({
            error: 'Your account has been suspended. Please contact support.',
            code: 'ACCOUNT_SUSPENDED'
          });
        }
        req.employee = { ...decoded, ...user };
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
