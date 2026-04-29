const jwt = require('jsonwebtoken');

// Cookie name for the httpOnly admin session. Must stay in sync with the
// Set-Cookie call in routes/admin.js POST /login and the clear in /logout.
const ADMIN_COOKIE = 'snaptip_admin_token';

function adminAuth(req, res, next) {
  // 1) Prefer the httpOnly cookie (set by /api/admin/login).
  // 2) Fall back to the Authorization header for transitional clients still
  //    using localStorage. Once all admin browsers have re-logged in, the
  //    header path can be removed.
  let token = null;
  if (req.cookies && req.cookies[ADMIN_COOKIE]) {
    token = req.cookies[ADMIN_COOKIE];
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Admin access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin'
    );
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token.' });
  }
}

module.exports = adminAuth;
module.exports.ADMIN_COOKIE = ADMIN_COOKIE;
