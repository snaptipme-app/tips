#!/usr/bin/env node
// Hard-delete employees whose deleted_at is older than 30 days.
//
//   node server/scripts/purge-deleted-accounts.js          # dry run
//   node server/scripts/purge-deleted-accounts.js --apply  # actually delete
//
// Wire into a daily cron once verified, e.g.:
//   0 4 * * * /usr/bin/node /var/www/snaptip/server/scripts/purge-deleted-accounts.js --apply >> /var/log/snaptip-purge.log 2>&1
//
// Why a separate script (not a server-side timer): it's safer to have purges
// run as a discrete, observable, idempotent unit — easier to audit, easier to
// pause if something looks wrong, and survives server restarts cleanly.

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { pool } = require('../db');

const APPLY = process.argv.includes('--apply');
const GRACE_DAYS = 30;

(async () => {
  try {
    const { rows: targets } = await pool.query(
      `SELECT id, email, username, deleted_at
       FROM employees
       WHERE deleted_at IS NOT NULL
         AND deleted_at < NOW() - INTERVAL '${GRACE_DAYS} days'
       ORDER BY deleted_at ASC`
    );

    if (targets.length === 0) {
      console.log(`[purge] No accounts past ${GRACE_DAYS}-day grace period.`);
      process.exit(0);
    }

    console.log(`[purge] ${targets.length} account(s) past ${GRACE_DAYS}-day grace period:`);
    for (const t of targets) {
      console.log(`  - id=${t.id}, email=${t.email}, username=${t.username}, deleted_at=${t.deleted_at}`);
    }

    if (!APPLY) {
      console.log('\n[purge] DRY RUN — pass --apply to actually delete.');
      process.exit(0);
    }

    // Hard delete inside a transaction. Order matters: drop child rows before
    // the parent employee to satisfy FK constraints.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of targets) {
        await client.query('DELETE FROM tips         WHERE employee_id = $1', [t.id]);
        await client.query('DELETE FROM payments     WHERE employee_id = $1', [t.id]);
        await client.query('DELETE FROM withdrawals  WHERE employee_id = $1', [t.id]);
        await client.query('DELETE FROM analytics    WHERE employee_id = $1', [t.id]);
        await client.query('DELETE FROM team_members WHERE employee_id = $1', [t.id]);
        await client.query('DELETE FROM employees    WHERE id = $1',          [t.id]);
        await client.query(
          `INSERT INTO audit_log (actor_type, action, target_type, target_id, metadata, created_at)
           VALUES ('system', 'gdpr.purge', 'employee', $1, $2, NOW())`,
          [t.id, JSON.stringify({ email: t.email, username: t.username, deleted_at: t.deleted_at })]
        );
        console.log(`  [purged] id=${t.id}`);
      }
      await client.query('COMMIT');
      console.log(`[purge] Done. ${targets.length} account(s) hard-deleted.`);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    process.exit(0);
  } catch (err) {
    console.error('[purge] FATAL:', err.message);
    process.exit(1);
  }
})();
