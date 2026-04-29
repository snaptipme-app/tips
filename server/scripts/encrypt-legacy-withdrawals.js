// One-time backfill: encrypt every withdrawal that still has plaintext
// `account_details` and null out the legacy column.
//
//   cd server
//   node scripts/encrypt-legacy-withdrawals.js
//
// Safe to re-run — already-encrypted rows are skipped because they have
// account_details_enc IS NOT NULL. Stops cleanly if DATA_ENCRYPTION_KEY is
// missing.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../db');

async function main() {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    console.error('DATA_ENCRYPTION_KEY is missing or too short. Set it in server/.env first.');
    process.exit(1);
  }

  const { rows } = await pool.query(
    `SELECT id, account_details
       FROM withdrawals
       WHERE account_details IS NOT NULL
         AND account_details <> ''
         AND account_details_enc IS NULL`
  );
  console.log(`[migrate] candidates: ${rows.length}`);

  let migrated = 0;
  for (const row of rows) {
    try {
      await pool.query(
        `UPDATE withdrawals
            SET account_details_enc = pgp_sym_encrypt($1::text, $2::text),
                account_details     = NULL
          WHERE id = $3`,
        [row.account_details, key, row.id]
      );
      migrated++;
    } catch (err) {
      console.error(`[migrate] id=${row.id} failed: ${err.message}`);
    }
  }

  console.log(`[migrate] done — encrypted ${migrated}/${rows.length}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] fatal:', err);
  process.exit(1);
});
