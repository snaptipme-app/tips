// Centralised audit logger. Writes a row to `audit_log` with the actor, action,
// target, and request context (IP + user agent). Audit failures NEVER fail the
// caller — the request must complete even if the log write errors.
//
// Wired into:
//   routes/admin.js     — admin auth, user mutations, withdrawal decisions
//   routes/auth.js      — employee login, password change/reset
//   routes/withdrawals.js — withdrawal requests
//   routes/payments.js  — successful payment events
//
// Schema (see initDB in server/db.js):
//   id          SERIAL PRIMARY KEY
//   actor_type  TEXT          -- 'admin' | 'employee' | 'tourist' | 'system'
//   actor_id    INTEGER       -- nullable for unauthenticated/system events
//   action      TEXT          -- e.g. 'admin.login.success', 'user.suspend'
//   target_type TEXT          -- 'employee' | 'withdrawal' | 'business' | etc.
//   target_id   INTEGER
//   ip_address  TEXT
//   user_agent  TEXT
//   metadata    JSONB         -- arbitrary extra context (no secrets!)
//   created_at  TIMESTAMP DEFAULT NOW()

const { pool } = require('../db');

// Best-effort client IP extraction. `app.set('trust proxy', 1)` in index.js
// already puts the right value in req.ip, but Cloudflare's CF-Connecting-IP
// is the most authoritative when present.
function clientIp(req) {
  if (!req || !req.headers) return null;
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || null;
}

function userAgent(req) {
  if (!req || !req.headers) return null;
  const ua = req.headers['user-agent'];
  return ua ? String(ua).slice(0, 512) : null;
}

async function logAudit({
  actorType,
  actorId = null,
  action,
  targetType = null,
  targetId = null,
  ip = null,
  userAgent: ua = null,
  metadata = null,
}) {
  if (!actorType || !action) {
    console.warn('[audit] skipped — actorType and action are required');
    return;
  }
  try {
    await pool.query(
      `INSERT INTO audit_log
         (actor_type, actor_id, action, target_type, target_id,
          ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        actorType,
        actorId,
        action,
        targetType,
        targetId,
        ip,
        ua,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    // Never fail the caller's request because audit logging broke.
    console.error('[audit] write failed:', err.message);
  }
}

// Convenience wrapper that pulls IP + UA off the request object.
async function logFromReq(req, payload) {
  return logAudit({
    ...payload,
    ip: payload.ip ?? clientIp(req),
    userAgent: payload.userAgent ?? userAgent(req),
  });
}

module.exports = { logAudit, logFromReq, clientIp, userAgent };
