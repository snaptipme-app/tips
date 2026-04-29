// Lightweight CSRF defense for cookie-authenticated routes.
//
// Why not csurf? It's deprecated and adds round-trip token plumbing. Modern
// browsers enforce SameSite=Strict cookies, which already block cross-site
// CSRF. This middleware adds defense-in-depth by validating the Origin /
// Referer header on state-changing requests against the CORS allowlist.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function buildAllowedOrigins() {
  // Mirrors security.js — comma-separated env list, defaults to prod hosts.
  return (process.env.CORS_ORIGINS ||
    'https://snaptip.me,https://www.snaptip.me')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function checkOriginCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // No cookie auth on this request → it's pure-token auth, CSRF doesn't apply.
  // (Authorization header attacks aren't CSRF — they require explicit theft.)
  if (!req.cookies || Object.keys(req.cookies).length === 0) {
    return next();
  }

  const allowed = buildAllowedOrigins();
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Origin header is the most reliable signal. When present, it MUST match.
  if (origin) {
    if (allowed.includes(origin)) return next();
    return res.status(403).json({ error: 'Cross-site request blocked', code: 'CSRF_ORIGIN_REJECTED' });
  }

  // Some browsers / privacy modes strip Origin on same-origin requests.
  // Fall back to Referer prefix-match against the allowlist.
  if (referer) {
    if (allowed.some(a => referer.startsWith(a + '/') || referer === a)) return next();
    return res.status(403).json({ error: 'Cross-site request blocked', code: 'CSRF_REFERER_REJECTED' });
  }

  // Neither header — be strict for cookie-auth state changes.
  return res.status(403).json({ error: 'Missing Origin/Referer on state-changing request', code: 'CSRF_NO_ORIGIN' });
}

module.exports = { checkOriginCsrf };
