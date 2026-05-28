require('dotenv').config();

const { pool } = require('../db');
const { backfillPaymentSettlementRows } = require('../lib/stripeSettlementLedger');

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

async function main() {
  const employeeIdArg = getArgValue('employee-id');
  const limitArg = getArgValue('limit');
  const employeeId = employeeIdArg ? Number(employeeIdArg) : null;
  const limit = limitArg ? Number(limitArg) : 100;

  if (employeeIdArg && (!Number.isInteger(employeeId) || employeeId <= 0)) {
    throw new Error('Invalid --employee-id value.');
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 500) {
    throw new Error('Invalid --limit value. Use a number from 1 to 500.');
  }

  const summary = await backfillPaymentSettlementRows(pool, { employeeId, limit });
  console.log('[stripe-settlement-backfill] complete', {
    employeeId,
    limit,
    ...summary,
  });
}

main()
  .catch((err) => {
    console.error('[stripe-settlement-backfill] failed', {
      message: err.message,
      code: err.code,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
