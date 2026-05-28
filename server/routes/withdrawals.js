const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { getEncryptionKey, decryptedAccountDetailsExpr } = require('../lib/cryptoFields');
const { logFromReq } = require('../lib/audit');
const { stripe } = require('../lib/stripe');
const {
  buildStripeConnectWithdrawalFailedEmail,
  buildStripeConnectWithdrawalSuccessEmail,
  buildWiseManualWithdrawalRequestedEmail,
  sendWithdrawalEmail,
} = require('../utils/withdrawalEmails');
const {
  PLATFORM_FEE_PERCENT,
  ZERO_DECIMAL_CURRENCIES,
  parseMoneyToMinor,
  minorToMoneyString,
  normalizeCurrency,
} = require('../lib/money');
const {
  getStripeTransferCurrency,
  toStripeMinorUnit,
  getAvailableBalanceMinor,
} = require('../lib/stripeCurrency');
const {
  getEffectivePayoutConfig,
  getEffectivePayoutMethod,
  normalizePayoutSchedule,
} = require('../lib/countryPayoutConfig');
const { backfillPaymentSettlementRows } = require('../lib/stripeSettlementLedger');

const VALID_PAYOUT_SCHEDULES = new Set(['manual', 'weekly', 'monthly']);
let scheduledPayoutTimer = null;
let scheduledPayoutRunActive = false;

function isStripePayoutReady(account) {
  return Boolean(account?.details_submitted && account?.payouts_enabled);
}

function normalizePreferenceSchedule(schedule) {
  const value = String(schedule || 'manual').trim().toLowerCase();
  return VALID_PAYOUT_SCHEDULES.has(value) ? value : 'manual';
}

function getNextPayoutAt(schedule, from = new Date()) {
  const normalized = normalizePreferenceSchedule(schedule);
  if (normalized === 'manual') return null;

  const date = new Date(from);
  if (normalized === 'weekly') {
    const next = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      9, 0, 0, 0
    ));
    const day = next.getUTCDay();
    const daysUntilMonday = (8 - day) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    return next;
  }

  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    1,
    9, 0, 0, 0
  ));
}

function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function schedulePeriodKey(schedule, date = new Date()) {
  const normalized = normalizePreferenceSchedule(schedule);
  if (normalized === 'weekly') return isoWeekKey(date);
  if (normalized === 'monthly') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

function serializePreferences(row) {
  const payoutSchedule = normalizePreferenceSchedule(row?.payout_schedule);
  return {
    payoutSchedule,
    autoPayoutEnabled: Boolean(row?.auto_payout_enabled) && payoutSchedule !== 'manual',
    nextPayoutAt: row?.next_payout_at || null,
    lastAutoPayoutAt: row?.last_auto_payout_at || null,
  };
}

function minorToNumber(minor) {
  return Number(minorToMoneyString(minor));
}

function platformFeeMinorForAmount(amountMinor) {
  return (amountMinor * BigInt(PLATFORM_FEE_PERCENT) + 50n) / 100n;
}

function netMinorForGross(amountMinor) {
  return amountMinor - platformFeeMinorForAmount(amountMinor);
}

function minMinor(a, b) {
  return a < b ? a : b;
}

function stripeMinorToMoneyMinor(amountMinor, currency) {
  const safeMinor = BigInt(amountMinor || 0);
  return ZERO_DECIMAL_CURRENCIES.has(normalizeCurrency(currency))
    ? safeMinor * 100n
    : safeMinor;
}

function maxGrossMinorFromStripeNetCapacity(netCapacityMinor) {
  if (netCapacityMinor <= 0n) return 0n;
  let grossMinor = (netCapacityMinor * 100n) / BigInt(100 - PLATFORM_FEE_PERCENT);
  while (grossMinor > 0n && netMinorForGross(grossMinor) > netCapacityMinor) {
    grossMinor -= 1n;
  }
  return grossMinor;
}

function serializePayoutAvailability(availability) {
  return {
    totalBalance: minorToNumber(availability.totalBalanceMinor),
    employeeSettledAvailable: minorToNumber(availability.employeeSettledAvailableMinor ?? availability.availableToWithdrawMinor),
    stripeAvailableForCurrency: minorToNumber(availability.stripeAvailableForCurrencyMinor ?? 0n),
    maxGrossWithdrawableFromStripe: minorToNumber(availability.maxGrossWithdrawableFromStripeMinor ?? availability.availableToWithdrawMinor),
    availableToWithdraw: minorToNumber(availability.availableToWithdrawMinor),
    pendingSettlement: minorToNumber(availability.pendingSettlementMinor),
    currency: availability.currency,
    reason: availability.reason,
  };
}

function insufficientEmployeeSettledResponse(availability) {
  const available = minorToNumber(availability.availableToWithdrawMinor);
  const currency = availability.currency;
  return {
    code: 'funds_settling',
    severity: 'info',
    message: `Only ${available.toLocaleString()} ${currency} is currently available to withdraw. The rest is still settling.`,
    error: `Only ${available.toLocaleString()} ${currency} is currently available to withdraw. The rest is still settling.`,
    availability: serializePayoutAvailability(availability),
  };
}

function platformFundsSettlingResponse(availability) {
  return {
    code: 'platform_funds_settling',
    severity: 'info',
    message: 'Payout funds are still settling with Stripe. Please try again later.',
    error: 'Payout funds are still settling with Stripe. Please try again later.',
    availability: serializePayoutAvailability(availability),
  };
}

async function syncAvailablePaymentLedger(db, employeeId) {
  await db.query(
    `UPDATE payments
     SET settlement_status = 'available'
     WHERE employee_id = $1
       AND status = 'completed'
       AND settlement_status = 'pending'
       AND available_on IS NOT NULL
       AND available_on <= NOW()`,
    [employeeId]
  );
}

async function getEmployeeSettledAvailableMinor(db, employeeId, currency) {
  if (db === pool) {
    await backfillPaymentSettlementRows(pool, { employeeId, limit: 25 });
  }
  await syncAvailablePaymentLedger(db, employeeId);
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(
       GREATEST(
         COALESCE(amount_available_for_employee, gross_amount, amount, 0)::numeric
         - COALESCE(amount_withdrawn_from_this_payment, 0)::numeric,
         0
       )
     ), 0) AS available
     FROM payments
     WHERE employee_id = $1
       AND status = 'completed'
       AND UPPER(COALESCE(employee_balance_currency, currency, '')) = $2
       AND (
         settlement_status = 'available'
         OR (available_on IS NOT NULL AND available_on <= NOW())
       )`,
    [employeeId, normalizeCurrency(currency)]
  );
  return parseMoneyToMinor(rows[0]?.available) || 0n;
}

async function backfillLegacyCompletedWithdrawalAllocations(db, employeeId, currency) {
  const ownsClient = db === pool;
  const client = ownsClient ? await pool.connect() : db;
  try {
    if (ownsClient) await client.query('BEGIN');
    await syncAvailablePaymentLedger(client, employeeId);
    const { rows } = await client.query(
      `SELECT w.id,
              COALESCE(w.gross_requested_amount, w.amount, 0)::numeric AS gross_amount,
              COALESCE((
                SELECT SUM(a.amount)
                FROM withdrawal_payment_allocations a
                WHERE a.withdrawal_id = w.id AND a.released_at IS NULL
              ), 0)::numeric AS allocated_amount
       FROM withdrawals w
       WHERE w.employee_id = $1
         AND w.payout_method = 'stripe_connect'
         AND COALESCE(w.balance_deducted, FALSE) = TRUE
         AND (w.payout_status = 'completed' OR w.status = 'paid')
         AND UPPER(COALESCE(w.currency, $2)) = $2
       ORDER BY w.processed_at NULLS LAST, w.created_at, w.id
       FOR UPDATE OF w`,
      [employeeId, normalizeCurrency(currency)]
    );

    let allocatedCount = 0;
    for (const withdrawal of rows) {
      const grossMinor = parseMoneyToMinor(withdrawal.gross_amount) || 0n;
      const allocatedMinor = parseMoneyToMinor(withdrawal.allocated_amount) || 0n;
      const missingMinor = grossMinor - allocatedMinor;
      if (missingMinor <= 0n) continue;

      const reserved = await reserveSettledPaymentLedger(
        client,
        employeeId,
        withdrawal.id,
        missingMinor,
        currency
      );
      if (reserved) allocatedCount += 1;
      else {
        console.warn('[withdrawals/legacy-allocation-backfill] insufficient settled ledger for completed withdrawal', {
          employeeId,
          withdrawalId: withdrawal.id,
          missingAmount: minorToNumber(missingMinor),
          currency: normalizeCurrency(currency),
        });
      }
    }

    if (ownsClient) await client.query('COMMIT');
    return allocatedCount;
  } catch (err) {
    if (ownsClient) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    if (ownsClient) client.release();
  }
}

async function getPayoutAvailabilityForEmployee(employee, payoutCfg, payoutMethod, db = pool) {
  const currency = normalizeCurrency(employee.currency || payoutCfg.currency || 'USD');
  const totalBalanceMinor = parseMoneyToMinor(employee.balance) || 0n;

  if (payoutMethod !== 'stripe_connect') {
    return {
      totalBalanceMinor,
      employeeSettledAvailableMinor: totalBalanceMinor,
      stripeAvailableForCurrencyMinor: 0n,
      maxGrossWithdrawableFromStripeMinor: totalBalanceMinor,
      availableToWithdrawMinor: totalBalanceMinor,
      pendingSettlementMinor: 0n,
      currency,
      reason: 'manual_payout_available',
    };
  }

  if (!stripe || !employee.stripe_account_id) {
    return {
      totalBalanceMinor,
      employeeSettledAvailableMinor: 0n,
      stripeAvailableForCurrencyMinor: 0n,
      maxGrossWithdrawableFromStripeMinor: 0n,
      availableToWithdrawMinor: 0n,
      pendingSettlementMinor: totalBalanceMinor,
      currency,
      reason: 'stripe_setup_incomplete',
    };
  }

  const employeeSettledAvailableMinor = await getEmployeeSettledAvailableMinor(db, employee.id, currency);
  if (db === pool) {
    await backfillLegacyCompletedWithdrawalAllocations(db, employee.id, currency);
  }
  const adjustedEmployeeSettledAvailableMinor = db === pool
    ? await getEmployeeSettledAvailableMinor(db, employee.id, currency)
    : employeeSettledAvailableMinor;
  const transferCurrency = getStripeTransferCurrency(payoutCfg.code);
  const stripeBalance = await stripe.balance.retrieve();
  const stripeAvailableMinor = getAvailableBalanceMinor(stripeBalance, transferCurrency);
  const stripeAvailableForCurrencyMinor = stripeMinorToMoneyMinor(stripeAvailableMinor, transferCurrency);
  const maxGrossWithdrawableFromStripeMinor = maxGrossMinorFromStripeNetCapacity(stripeAvailableForCurrencyMinor);
  const availableToWithdrawMinor = minMinor(
    totalBalanceMinor,
    minMinor(adjustedEmployeeSettledAvailableMinor, maxGrossWithdrawableFromStripeMinor)
  );
  const pendingSettlementMinor = totalBalanceMinor - availableToWithdrawMinor;
  const cappedByStripe = adjustedEmployeeSettledAvailableMinor > maxGrossWithdrawableFromStripeMinor
    && totalBalanceMinor > maxGrossWithdrawableFromStripeMinor;

  return {
    totalBalanceMinor,
    employeeSettledAvailableMinor: adjustedEmployeeSettledAvailableMinor,
    stripeAvailableForCurrencyMinor,
    maxGrossWithdrawableFromStripeMinor,
    availableToWithdrawMinor,
    pendingSettlementMinor,
    currency: normalizeCurrency(currency),
    reason: cappedByStripe
      ? 'stripe_capacity_capped'
      : pendingSettlementMinor > 0n
      ? (availableToWithdrawMinor > 0n ? 'partially_available' : 'funds_settling')
      : 'available',
  };
}

async function reserveSettledPaymentLedger(dbClient, employeeId, withdrawalId, amountMinor, currency) {
  await syncAvailablePaymentLedger(dbClient, employeeId);

  const { rows } = await dbClient.query(
    `SELECT id,
            GREATEST(
              COALESCE(amount_available_for_employee, gross_amount, amount, 0)::numeric
              - COALESCE(amount_withdrawn_from_this_payment, 0)::numeric,
              0
            ) AS available_amount
     FROM payments
     WHERE employee_id = $1
       AND status = 'completed'
       AND UPPER(COALESCE(employee_balance_currency, currency, '')) = $2
       AND (
         settlement_status = 'available'
         OR (available_on IS NOT NULL AND available_on <= NOW())
       )
       AND GREATEST(
         COALESCE(amount_available_for_employee, gross_amount, amount, 0)::numeric
         - COALESCE(amount_withdrawn_from_this_payment, 0)::numeric,
         0
       ) > 0
     ORDER BY available_on NULLS LAST, created_at, id
     FOR UPDATE`,
    [employeeId, normalizeCurrency(currency)]
  );

  const totalAvailableMinor = rows.reduce(
    (total, payment) => total + (parseMoneyToMinor(payment.available_amount) || 0n),
    0n
  );
  if (totalAvailableMinor < amountMinor) {
    return false;
  }

  let remainingMinor = amountMinor;
  for (const payment of rows) {
    if (remainingMinor <= 0n) break;
    const paymentAvailableMinor = parseMoneyToMinor(payment.available_amount) || 0n;
    if (paymentAvailableMinor <= 0n) continue;

    const allocationMinor = minMinor(remainingMinor, paymentAvailableMinor);
    const allocationAmount = minorToMoneyString(allocationMinor);

    await dbClient.query(
      `UPDATE payments
       SET amount_withdrawn_from_this_payment = ROUND((COALESCE(amount_withdrawn_from_this_payment, 0)::numeric + $1::numeric), 2)
       WHERE id = $2`,
      [allocationAmount, payment.id]
    );
    await dbClient.query(
      `INSERT INTO withdrawal_payment_allocations (
         withdrawal_id, payment_id, employee_id, amount, currency
       )
       VALUES ($1, $2, $3, $4::numeric, $5)
       ON CONFLICT (withdrawal_id, payment_id)
       DO UPDATE SET amount = withdrawal_payment_allocations.amount + EXCLUDED.amount`,
      [withdrawalId, payment.id, employeeId, allocationAmount, normalizeCurrency(currency)]
    );

    remainingMinor -= allocationMinor;
  }

  return remainingMinor === 0n;
}

async function releasePaymentLedgerAllocations(dbClient, withdrawalId) {
  const { rows } = await dbClient.query(
    `SELECT id, payment_id, amount
     FROM withdrawal_payment_allocations
     WHERE withdrawal_id = $1 AND released_at IS NULL
     FOR UPDATE`,
    [withdrawalId]
  );

  for (const allocation of rows) {
    await dbClient.query(
      `UPDATE payments
       SET amount_withdrawn_from_this_payment = GREATEST(
         COALESCE(amount_withdrawn_from_this_payment, 0)::numeric - $1::numeric,
         0
       )
       WHERE id = $2`,
      [allocation.amount, allocation.payment_id]
    );
  }

  await dbClient.query(
    `UPDATE withdrawal_payment_allocations
     SET released_at = NOW()
     WHERE withdrawal_id = $1 AND released_at IS NULL`,
    [withdrawalId]
  );
}

function serializeDetails(details) {
  if (!details) return null;
  return typeof details === 'object' ? JSON.stringify(details) : String(details);
}

function sanitizeStripeError(err) {
  const code = err?.code || err?.type || 'stripe_transfer_error';
  const message = err?.raw?.message || err?.message || 'Stripe transfer failed';
  return `${code}: ${message}`.slice(0, 500);
}

function stripeTransferIdempotencyKey(withdrawalId) {
  return `snaptip_withdrawal_transfer_${withdrawalId}`;
}

function employeeDisplayName(employee) {
  return employee?.full_name || [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.username || '';
}

function queueWithdrawalEmail({ to, subject, html, label }) {
  if (!to) return;
  sendWithdrawalEmail(to, subject, html).catch((err) => {
    console.error(`[withdrawals/email:${label}]`, err?.message || 'Email delivery failed');
  });
}

async function processScheduledPayoutForEmployee(employeeId, now = new Date()) {
  const dbClient = await pool.connect();
  let withdrawalContext = null;

  try {
    await dbClient.query('BEGIN');

    const { rows: lockedRows } = await dbClient.query(
      `SELECT id, balance, country, currency, stripe_account_id, payout_method,
              email, full_name, first_name, last_name, username,
              payout_schedule, auto_payout_enabled, next_payout_at,
              minimum_withdrawal_amount
       FROM employees
       WHERE id = $1
       FOR UPDATE`,
      [employeeId]
    );
    const employee = lockedRows[0];
    if (!employee) {
      await dbClient.query('ROLLBACK');
      return { employeeId, status: 'skipped', reason: 'employee_not_found' };
    }

    const payoutSchedule = normalizePreferenceSchedule(employee.payout_schedule);
    if (!employee.auto_payout_enabled || payoutSchedule === 'manual') {
      await dbClient.query('ROLLBACK');
      return { employeeId, status: 'skipped', reason: 'auto_disabled' };
    }
    if (employee.next_payout_at && new Date(employee.next_payout_at) > now) {
      await dbClient.query('ROLLBACK');
      return { employeeId, status: 'skipped', reason: 'not_due' };
    }

    const source = payoutSchedule === 'weekly' ? 'auto_weekly' : 'auto_monthly';
    const periodKey = schedulePeriodKey(payoutSchedule, now);
    const nextPayoutAt = getNextPayoutAt(payoutSchedule, now);

    const { rows: duplicateRows } = await dbClient.query(
      `SELECT id FROM withdrawals
       WHERE employee_id = $1
         AND withdrawal_source = $2
         AND schedule_period_key = $3
       LIMIT 1`,
      [employeeId, source, periodKey]
    );
    if (duplicateRows.length > 0) {
      await dbClient.query(
        `UPDATE employees
         SET next_payout_at = $1
         WHERE id = $2`,
        [nextPayoutAt, employeeId]
      );
      await dbClient.query('COMMIT');
      return { employeeId, status: 'skipped', reason: 'duplicate_period', periodKey };
    }

    const { rows: activeRows } = await dbClient.query(
      `SELECT id FROM withdrawals
       WHERE employee_id = $1
         AND (status = 'pending' OR payout_status = 'processing')
       LIMIT 1`,
      [employeeId]
    );
    if (activeRows.length > 0) {
      await dbClient.query(
        `UPDATE employees
         SET next_payout_at = $1
         WHERE id = $2`,
        [nextPayoutAt, employeeId]
      );
      await dbClient.query('COMMIT');
      return { employeeId, status: 'skipped', reason: 'active_withdrawal', periodKey };
    }

    const payoutCfg = getEffectivePayoutConfig({
      countryName: employee.country,
      currency: employee.currency,
    });
    const payoutMethod = getEffectivePayoutMethod(payoutCfg);
    const currency = normalizeCurrency(employee.currency || payoutCfg.currency || 'USD');
    const minAmount = Number(employee.minimum_withdrawal_amount || payoutCfg.minWithdrawalAmount || 10);
    const minAmountMinor = parseMoneyToMinor(minAmount) || 0n;
    const availability = await getPayoutAvailabilityForEmployee(employee, payoutCfg, payoutMethod, dbClient);
    const amountMinor = availability.availableToWithdrawMinor;

    if (!amountMinor || amountMinor < minAmountMinor) {
      await dbClient.query(
        `UPDATE employees
         SET next_payout_at = $1
         WHERE id = $2`,
        [nextPayoutAt, employeeId]
      );
      await dbClient.query('COMMIT');
      return {
        employeeId,
        status: 'skipped',
        reason: 'below_minimum',
        available: minorToNumber(amountMinor || 0n),
        minAmount,
        currency,
        periodKey,
      };
    }

    if (payoutMethod === 'stripe_connect') {
      if (!employee.stripe_account_id || !stripe) {
        await dbClient.query(
          `UPDATE employees
           SET next_payout_at = $1
           WHERE id = $2`,
          [nextPayoutAt, employeeId]
        );
        await dbClient.query('COMMIT');
        return { employeeId, status: 'skipped', reason: 'stripe_setup_incomplete', periodKey };
      }
      const account = await stripe.accounts.retrieve(employee.stripe_account_id);
      if (!isStripePayoutReady(account)) {
        await dbClient.query(
          `UPDATE employees
           SET next_payout_at = $1
           WHERE id = $2`,
          [nextPayoutAt, employeeId]
        );
        await dbClient.query('COMMIT');
        return { employeeId, status: 'skipped', reason: 'stripe_payouts_disabled', periodKey };
      }
    }

    const amount = minorToNumber(amountMinor);
    const platformFeeMinor = platformFeeMinorForAmount(amountMinor);
    const netMinor = amountMinor - platformFeeMinor;
    const platformFee = minorToNumber(platformFeeMinor);
    const netAmount = minorToNumber(netMinor);
    const amountForDb = minorToMoneyString(amountMinor);
    const platformFeeForDb = minorToMoneyString(platformFeeMinor);
    const netAmountForDb = minorToMoneyString(netMinor);
    const methodLabel = payoutMethod === 'stripe_connect'
      ? 'Stripe Express'
      : 'Manual bank transfer / Wise';
    const payoutStatus = payoutMethod === 'stripe_connect' ? 'processing' : 'pending';
    const stripeTransferCurrency = payoutMethod === 'stripe_connect'
      ? getStripeTransferCurrency(payoutCfg.code)
      : null;
    const stripeTransferAmount = payoutMethod === 'stripe_connect'
      ? toStripeMinorUnit(netAmount, stripeTransferCurrency)
      : null;
    const accountJson = payoutMethod === 'stripe_connect'
      ? JSON.stringify({ provider: 'Stripe Express', stripe_account_id: employee.stripe_account_id })
      : JSON.stringify({ provider: 'Wise Manual', source, note: 'Automatic payout request' });
    const idempotencyKey = `snaptip_${source}_${employeeId}_${periodKey}`;

    const { rows: insertRows } = await dbClient.query(
      `INSERT INTO withdrawals (
         employee_id, amount, gross_requested_amount, fee, platform_fee_amount, platform_fee_percent,
         net_amount, net_payout_amount, method, payout_method, payout_status, payout_schedule,
         withdrawal_source, schedule_period_key, platform_fee_snapshot,
         stripe_account_id, stripe_transfer_id, idempotency_key, currency,
         account_details, contact_phone, status, balance_deducted
       )
       VALUES (
         $1, $2::real, $16::numeric, $3::real, $17::numeric, $5::numeric,
         $4::real, $18::numeric, $6, $7, $8, $9,
         $10, $11, $5::numeric,
         $12, NULL, $13, $14,
         $15, NULL, 'pending', TRUE
       )
       RETURNING id, created_at`,
      [
        employeeId, amount, platformFee, netAmount, PLATFORM_FEE_PERCENT,
        methodLabel, payoutMethod, payoutStatus, payoutSchedule,
        source, periodKey,
        payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null,
        idempotencyKey, currency, accountJson,
        amountForDb, platformFeeForDb, netAmountForDb,
      ]
    );
    const withdrawalId = insertRows[0].id;
    const withdrawalCreatedAt = insertRows[0].created_at;

    if (payoutMethod === 'stripe_connect') {
      const ledgerReserved = await reserveSettledPaymentLedger(
        dbClient,
        employeeId,
        withdrawalId,
        amountMinor,
        currency
      );
      if (!ledgerReserved) {
        await dbClient.query('ROLLBACK');
        return { employeeId, status: 'skipped', reason: 'ledger_reservation_failed', periodKey };
      }
    }

    const balanceResult = await dbClient.query(
      `UPDATE employees
       SET balance = ROUND((COALESCE(balance, 0)::numeric - $1::numeric), 2)::real,
           payout_method = $2,
           payout_schedule = $3,
           payout_country = COALESCE(payout_country, $4),
           next_payout_at = $5,
           last_auto_payout_at = $6
       WHERE id = $7 AND COALESCE(balance, 0)::numeric >= $1::numeric
       RETURNING balance`,
      [amount, payoutMethod, payoutSchedule, payoutCfg.code, nextPayoutAt, now, employeeId]
    );
    if (balanceResult.rowCount === 0) {
      await dbClient.query('ROLLBACK');
      return { employeeId, status: 'skipped', reason: 'insufficient_balance', periodKey };
    }

    await dbClient.query('COMMIT');

    withdrawalContext = {
      employee,
      employeeId,
      withdrawalId,
      withdrawalCreatedAt,
      amount,
      amountMinor,
      platformFee,
      netAmount,
      payoutMethod,
      methodLabel,
      currency,
      stripeTransferAmount,
      stripeTransferCurrency,
      idempotencyKey,
      source,
      periodKey,
      newBalance: Number(balanceResult.rows[0]?.balance || 0),
    };
  } catch (err) {
    await dbClient.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    dbClient.release();
  }

  if (!withdrawalContext) {
    return { employeeId, status: 'skipped', reason: 'no_context' };
  }

  const {
    employee,
    withdrawalId,
    amount,
    platformFee,
    netAmount,
    payoutMethod,
    methodLabel,
    currency,
    stripeTransferAmount,
    stripeTransferCurrency,
    idempotencyKey,
    source,
    periodKey,
  } = withdrawalContext;

  if (payoutMethod !== 'stripe_connect') {
    queueWithdrawalEmail({
      to: employee.email,
      subject: 'SnapTip - Manual payout request received',
      label: 'wise-manual-auto-requested',
      html: buildWiseManualWithdrawalRequestedEmail({
        employeeName: employeeDisplayName(employee),
        withdrawalId,
        grossAmount: amount,
        platformFeeAmount: platformFee,
        netPayoutAmount: netAmount,
        currency,
        payoutMethod: methodLabel,
        date: withdrawalContext.withdrawalCreatedAt || new Date(),
      }),
    });
    return { employeeId, status: 'created', payoutMethod, withdrawalId, source, periodKey };
  }

  try {
    const transfer = await stripe.transfers.create(
      {
        amount: stripeTransferAmount,
        currency: stripeTransferCurrency.toLowerCase(),
        destination: employee.stripe_account_id,
        description: 'SnapTip Automatic Withdrawal',
        metadata: {
          withdrawal_id: String(withdrawalId),
          employee_id: String(employeeId),
          gross_requested_amount: String(amount),
          platform_fee_amount: String(platformFee),
          net_payout_amount: String(netAmount),
          withdrawal_source: source,
          schedule_period_key: periodKey,
          transfer_strategy: 'employee_currency_balance',
        },
      },
      { idempotencyKey }
    );

    const { rows: completedRows } = await pool.query(
      `UPDATE withdrawals
       SET status = 'paid',
           payout_status = 'completed',
           stripe_transfer_id = $1,
           processed_at = NOW()
       WHERE id = $2 AND stripe_transfer_id IS NULL
       RETURNING processed_at`,
      [transfer.id, withdrawalId]
    );

    queueWithdrawalEmail({
      to: employee.email,
      subject: 'SnapTip - Your Stripe Express payout is on the way',
      label: 'stripe-auto-success',
      html: buildStripeConnectWithdrawalSuccessEmail({
        employeeName: employeeDisplayName(employee),
        withdrawalId,
        grossAmount: amount,
        platformFeeAmount: platformFee,
        netPayoutAmount: netAmount,
        currency,
        stripeTransferId: transfer.id,
        date: completedRows[0]?.processed_at || new Date(),
      }),
    });

    return {
      employeeId,
      status: 'completed',
      payoutMethod,
      withdrawalId,
      source,
      periodKey,
      stripeTransferId: transfer.id,
    };
  } catch (stripeErr) {
    const safeStripeError = sanitizeStripeError(stripeErr);
    console.error('[scheduled-payouts/stripe-transfer]', safeStripeError);

    const refundClient = await pool.connect();
    try {
      await refundClient.query('BEGIN');
      await refundClient.query(
        `UPDATE withdrawals
         SET status = 'failed',
             payout_status = 'failed',
             admin_note = $1,
             balance_deducted = FALSE
         WHERE id = $2`,
        [safeStripeError, withdrawalId]
      );
      await refundClient.query(
        `UPDATE employees
         SET balance = ROUND((COALESCE(balance, 0)::numeric + $1::numeric), 2)::real
         WHERE id = $2`,
        [amount, employeeId]
      );
      await releasePaymentLedgerAllocations(refundClient, withdrawalId);
      await refundClient.query('COMMIT');
    } catch (refundErr) {
      await refundClient.query('ROLLBACK').catch(() => {});
      console.error('[scheduled-payouts/refund]', refundErr.message);
    } finally {
      refundClient.release();
    }

    queueWithdrawalEmail({
      to: employee.email,
      subject: 'SnapTip - Your withdrawal was returned to your balance',
      label: 'stripe-auto-failed',
      html: buildStripeConnectWithdrawalFailedEmail({
        employeeName: employeeDisplayName(employee),
        withdrawalId,
        grossAmount: amount,
        currency,
        date: new Date(),
      }),
    });

    return { employeeId, status: 'failed', reason: 'stripe_transfer_failed', withdrawalId, source, periodKey };
  }
}

async function runScheduledPayouts({ limit = 25 } = {}) {
  if (scheduledPayoutRunActive) {
    return { skipped: true, reason: 'already_running' };
  }
  scheduledPayoutRunActive = true;
  try {
    const { rows } = await pool.query(
      `SELECT id
       FROM employees
       WHERE auto_payout_enabled = TRUE
         AND payout_schedule IN ('weekly', 'monthly')
         AND next_payout_at IS NOT NULL
         AND next_payout_at <= NOW()
         AND (is_suspended = 0 OR is_suspended IS NULL)
         AND deleted_at IS NULL
       ORDER BY next_payout_at ASC
       LIMIT $1`,
      [limit]
    );

    const results = [];
    for (const row of rows) {
      try {
        results.push(await processScheduledPayoutForEmployee(row.id));
      } catch (err) {
        console.error('[scheduled-payouts/employee]', {
          employeeId: row.id,
          message: err.message,
          code: err.code,
        });
        results.push({ employeeId: row.id, status: 'error', reason: err.message });
      }
    }

    if (results.length > 0) {
      console.log('[scheduled-payouts] run complete', {
        checked: rows.length,
        results,
      });
    }

    return { checked: rows.length, results };
  } finally {
    scheduledPayoutRunActive = false;
  }
}

function startScheduledPayoutScheduler() {
  if (scheduledPayoutTimer || String(process.env.DISABLE_SCHEDULED_PAYOUTS || '').toLowerCase() === 'true') return;
  const intervalMs = Number(process.env.SCHEDULED_PAYOUT_INTERVAL_MS || 15 * 60 * 1000);
  const run = () => runScheduledPayouts().catch((err) => {
    console.error('[scheduled-payouts] run failed', err.message);
  });
  setTimeout(run, 30 * 1000).unref?.();
  scheduledPayoutTimer = setInterval(run, intervalMs);
  scheduledPayoutTimer.unref?.();
  console.log('[scheduled-payouts] scheduler started', { intervalMs });
}

router.post('/request', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const {
      amount,
      method,
      account_details,
      contact_phone,
      payout_schedule: requestedSchedule,
    } = req.body;

    const amountMinor = parseMoneyToMinor(amount);
    if (!amountMinor) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }
    const amt = minorToNumber(amountMinor);

    const { rows: empRows } = await pool.query(
      `SELECT id, balance, country, currency, stripe_account_id, payout_method,
              email, full_name, first_name, last_name, username,
              payout_schedule, minimum_withdrawal_amount
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    const employee = empRows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const payoutCfg = getEffectivePayoutConfig({
      countryName: employee.country,
      currency: employee.currency,
    });
    const payoutMethod = getEffectivePayoutMethod(payoutCfg);
    const payoutSchedule = normalizePayoutSchedule(
      requestedSchedule || employee.payout_schedule,
      payoutMethod
    );
    const currency = employee.currency || payoutCfg.currency || 'USD';
    const minAmount = Number(employee.minimum_withdrawal_amount || payoutCfg.minWithdrawalAmount || 10);

    const minAmountMinor = parseMoneyToMinor(minAmount);
    if (!minAmountMinor || amountMinor < minAmountMinor) {
      return res.status(400).json({
        error: `Minimum withdrawal for your country is ${minAmount.toLocaleString()} ${currency}.`,
      });
    }

    const { rows: pendingRows } = await pool.query(
      `SELECT id FROM withdrawals
       WHERE employee_id = $1 AND status = 'pending'
       LIMIT 1`,
      [employeeId]
    );
    if (pendingRows.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending payout request. Please wait for review before submitting another.',
      });
    }

    if (payoutMethod === 'stripe_connect') {
      if (!employee.stripe_account_id || !stripe) {
        return res.status(400).json({ error: 'Complete Stripe Express setup before requesting payouts.' });
      }
      const account = await stripe.accounts.retrieve(employee.stripe_account_id);
      if (!isStripePayoutReady(account)) {
        return res.status(400).json({ error: 'Complete Stripe Express setup before requesting payouts.' });
      }
    } else {
      if (!method) {
        return res.status(400).json({ error: 'Withdrawal method is required.' });
      }
      if (!account_details) {
        return res.status(400).json({ error: 'Account details are required.' });
      }
      if (!contact_phone || String(contact_phone).trim().length < 6) {
        return res.status(400).json({ error: 'A valid contact phone number is required.' });
      }
    }

    const methodLabel = payoutMethod === 'stripe_connect' ? 'Stripe Express' : method;
    const platformFeeMinor = platformFeeMinorForAmount(amountMinor);
    const netMinor = amountMinor - platformFeeMinor;
    const platformFee = minorToNumber(platformFeeMinor);
    const netAmount = minorToNumber(netMinor);
    const stripeTransferCurrency = payoutMethod === 'stripe_connect'
      ? getStripeTransferCurrency(payoutCfg.code)
      : null;
    const stripeTransferAmount = payoutMethod === 'stripe_connect'
      ? toStripeMinorUnit(netAmount, stripeTransferCurrency)
      : null;

    if (payoutMethod === 'stripe_connect') {
      if (!stripeTransferCurrency || !stripeTransferAmount) {
        return res.status(400).json({
          error: `Stripe payouts are not available for ${normalizeCurrency(currency)} right now.`,
        });
      }

      const payoutAvailability = await getPayoutAvailabilityForEmployee(employee, payoutCfg, payoutMethod);
      if (payoutAvailability.employeeSettledAvailableMinor < amountMinor) {
        console.warn('[withdrawals/stripe-transfer-preflight]', {
          employeeId,
          requestedCurrency: normalizeCurrency(currency),
          transferCurrency: stripeTransferCurrency,
          transferAmountMinor: stripeTransferAmount,
          availableToWithdraw: minorToNumber(payoutAvailability.availableToWithdrawMinor),
          pendingSettlement: minorToNumber(payoutAvailability.pendingSettlementMinor),
          reason: payoutAvailability.reason,
        });
        return res.status(409).json(insufficientEmployeeSettledResponse(payoutAvailability));
      }

      if (payoutAvailability.maxGrossWithdrawableFromStripeMinor < amountMinor) {
        console.warn('[withdrawals/stripe-platform-preflight]', {
          employeeId,
          transferCurrency: stripeTransferCurrency,
          transferAmountMinor: stripeTransferAmount,
          stripeAvailableForCurrency: minorToNumber(payoutAvailability.stripeAvailableForCurrencyMinor),
          maxGrossWithdrawableFromStripe: minorToNumber(payoutAvailability.maxGrossWithdrawableFromStripeMinor),
        });
        return res.status(409).json(platformFundsSettlingResponse(payoutAvailability));
      }
    }

    const { rows: availRows } = await pool.query(
      `SELECT ROUND((COALESCE(e.balance, 0)::numeric - COALESCE((
         SELECT SUM(w.amount) FROM withdrawals w
         WHERE w.employee_id = $1 AND w.status = 'pending' AND w.balance_deducted = FALSE
       ), 0)::numeric), 2) AS available
       FROM employees e WHERE e.id = $1`,
      [employeeId]
    );
    const availableMinor = parseMoneyToMinor(availRows[0]?.available ?? employee.balance) || 0n;
    if (availableMinor < amountMinor) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    const accountJson = payoutMethod === 'stripe_connect'
      ? JSON.stringify({ provider: 'Stripe Express', stripe_account_id: employee.stripe_account_id })
      : serializeDetails(account_details);
    const contactPhone = payoutMethod === 'stripe_connect' ? null : String(contact_phone).trim();

    const encKey = getEncryptionKey();
    const dbClient = await pool.connect();
    let newBalance = minorToNumber(availableMinor - amountMinor);
    let withdrawalId = null;
    let withdrawalCreatedAt = null;
    let idempotencyKey = null;
    try {
      await dbClient.query('BEGIN');

      const { rows: lockedRows } = await dbClient.query(
        `SELECT id, balance, country, currency, stripe_account_id, payout_schedule, minimum_withdrawal_amount
         FROM employees
         WHERE id = $1
         FOR UPDATE`,
        [employeeId]
      );
      const lockedEmployee = lockedRows[0];
      if (!lockedEmployee) {
        await dbClient.query('ROLLBACK');
        return res.status(404).json({ error: 'Employee not found.' });
      }

      const lockedPayoutCfg = getEffectivePayoutConfig({
        countryName: lockedEmployee.country,
        currency: lockedEmployee.currency,
      });
      const lockedPayoutMethod = getEffectivePayoutMethod(lockedPayoutCfg);
      if (lockedPayoutMethod !== payoutMethod) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Payout method is not available for your country.' });
      }

      if (payoutMethod === 'stripe_connect' && lockedEmployee.stripe_account_id !== employee.stripe_account_id) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Complete Stripe Express setup before requesting payouts.' });
      }

      const { rows: activeRows } = await dbClient.query(
        `SELECT id FROM withdrawals
         WHERE employee_id = $1 AND status = 'pending'
         LIMIT 1`,
        [employeeId]
      );
      if (activeRows.length > 0) {
        await dbClient.query('ROLLBACK');
        return res.status(409).json({
          error: 'You already have a pending payout request. Please wait for review before submitting another.',
        });
      }

      const lockedAvailableMinor = parseMoneyToMinor(lockedEmployee.balance) || 0n;
      if (lockedAvailableMinor < amountMinor) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance.' });
      }

      if (payoutMethod === 'stripe_connect') {
        const lockedAvailability = await getPayoutAvailabilityForEmployee(
          lockedEmployee,
          lockedPayoutCfg,
          lockedPayoutMethod,
          dbClient
        );
        if (lockedAvailability.employeeSettledAvailableMinor < amountMinor) {
          await dbClient.query('ROLLBACK');
          return res.status(409).json(insufficientEmployeeSettledResponse(lockedAvailability));
        }
      }

      const payoutStatus = payoutMethod === 'stripe_connect' ? 'processing' : 'pending';

      if (encKey) {
        const { rows: insertRows } = await dbClient.query(
        `INSERT INTO withdrawals (
           employee_id, amount, gross_requested_amount, fee, platform_fee_amount, platform_fee_percent,
           net_amount, net_payout_amount, method, payout_method, payout_status, payout_schedule,
           withdrawal_source, schedule_period_key, platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           idempotency_key, currency, account_details, account_details_enc, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2::real, $2::numeric, $3::real, $3::numeric, $5::numeric,
           $4::real, $4::numeric, $6, $7, $8, $9,
           'manual', NULL, $5::numeric, $10, NULL,
           NULL, $11, NULL, pgp_sym_encrypt($12::text, $13::text), $14, 'pending', TRUE
         ) RETURNING id, created_at`,
        [
          employeeId, amt, platformFee, netAmount, PLATFORM_FEE_PERCENT, methodLabel,
          payoutMethod, payoutStatus, payoutSchedule,
          payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null,
          currency, accountJson, encKey, contactPhone,
        ]
        );
        withdrawalId = insertRows[0]?.id || null;
        withdrawalCreatedAt = insertRows[0]?.created_at || null;
      } else {
        const { rows: insertRows } = await dbClient.query(
        `INSERT INTO withdrawals (
           employee_id, amount, gross_requested_amount, fee, platform_fee_amount, platform_fee_percent,
           net_amount, net_payout_amount, method, payout_method, payout_status, payout_schedule,
           withdrawal_source, schedule_period_key, platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           idempotency_key, currency, account_details, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2::real, $2::numeric, $3::real, $3::numeric, $5::numeric,
           $4::real, $4::numeric, $6, $7, $8, $9,
           'manual', NULL, $5::numeric, $10, NULL,
           NULL, $11, $12, $13, 'pending', TRUE
         ) RETURNING id, created_at`,
        [
          employeeId, amt, platformFee, netAmount, PLATFORM_FEE_PERCENT, methodLabel,
          payoutMethod, payoutStatus, payoutSchedule,
          payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null,
          currency, accountJson, contactPhone,
        ]
        );
        withdrawalId = insertRows[0]?.id || null;
        withdrawalCreatedAt = insertRows[0]?.created_at || null;
      }

      idempotencyKey = stripeTransferIdempotencyKey(withdrawalId);
      await dbClient.query(
        `UPDATE withdrawals
         SET idempotency_key = $1
         WHERE id = $2`,
        [idempotencyKey, withdrawalId]
      );

      if (payoutMethod === 'stripe_connect') {
        const ledgerReserved = await reserveSettledPaymentLedger(
          dbClient,
          employeeId,
          withdrawalId,
          amountMinor,
          currency
        );
        if (!ledgerReserved) {
          await dbClient.query('ROLLBACK');
          return res.status(409).json(insufficientEmployeeSettledResponse(
            await getPayoutAvailabilityForEmployee(lockedEmployee, lockedPayoutCfg, lockedPayoutMethod, dbClient)
          ));
        }
      }

      const balanceResult = await dbClient.query(
        `UPDATE employees
         SET balance = ROUND((COALESCE(balance, 0)::numeric - $1::numeric), 2)::real
         WHERE id = $2 AND COALESCE(balance, 0)::numeric >= $1::numeric
         RETURNING balance`,
        [amt, employeeId]
      );
      if (balanceResult.rowCount === 0) {
        await dbClient.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance.' });
      }
      newBalance = Number(balanceResult.rows[0]?.balance ?? newBalance);

      await dbClient.query(
        `UPDATE employees
         SET payout_method = $1,
             payout_schedule = $2,
             payout_country = COALESCE(payout_country, $3)
         WHERE id = $4`,
        [payoutMethod, payoutSchedule, payoutCfg.code, employeeId]
      );

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      dbClient.release();
    }

    let stripeTransferId = null;
    if (payoutMethod === 'stripe_connect') {
      let transfer;
      try {
        transfer = await stripe.transfers.create(
          {
            amount: stripeTransferAmount,
            currency: stripeTransferCurrency.toLowerCase(),
            destination: employee.stripe_account_id,
            description: 'SnapTip Withdrawal',
            metadata: {
              withdrawal_id: String(withdrawalId),
              employee_id: String(employeeId),
              gross_requested_amount: String(amt),
              platform_fee_amount: String(platformFee),
              net_payout_amount: String(netAmount),
              display_currency: normalizeCurrency(currency),
              transfer_currency: stripeTransferCurrency,
              transfer_amount_minor: String(stripeTransferAmount),
              transfer_strategy: 'employee_currency_balance',
            },
          },
          { idempotencyKey }
        );
      } catch (stripeErr) {
        const safeStripeError = sanitizeStripeError(stripeErr);
        console.error('[withdrawals/stripe-transfer]', safeStripeError);

        const refundClient = await pool.connect();
        let refundCommitted = false;
        try {
          await refundClient.query('BEGIN');
          await refundClient.query(
            `UPDATE withdrawals
             SET status = 'failed',
                 payout_status = 'failed',
                 admin_note = $1,
                 balance_deducted = FALSE
             WHERE id = $2`,
            [safeStripeError, withdrawalId]
          );
          await refundClient.query(
            `UPDATE employees
             SET balance = ROUND((COALESCE(balance, 0)::numeric + $1::numeric), 2)::real
             WHERE id = $2`,
            [amt, employeeId]
          );
          await releasePaymentLedgerAllocations(refundClient, withdrawalId);
          await refundClient.query('COMMIT');
          refundCommitted = true;
        } catch (refundErr) {
          await refundClient.query('ROLLBACK').catch(() => {});
          console.error('[withdrawals/stripe-transfer-refund]', refundErr.message);
        } finally {
          refundClient.release();
        }

        if (refundCommitted) {
          queueWithdrawalEmail({
            to: employee.email,
            subject: 'SnapTip - Your withdrawal was returned to your balance',
            label: 'stripe-failed',
            html: buildStripeConnectWithdrawalFailedEmail({
              employeeName: employeeDisplayName(employee),
              withdrawalId,
              grossAmount: amt,
              currency,
              date: new Date(),
            }),
          });
        }

        return res.status(502).json({
          error: 'Stripe payout could not be processed. Your balance was restored. Please try again later.',
        });
      }

      try {
        const { rowCount, rows: completedRows } = await pool.query(
          `UPDATE withdrawals
           SET status = 'paid',
               payout_status = 'completed',
               stripe_transfer_id = $1,
               processed_at = NOW()
           WHERE id = $2 AND stripe_transfer_id IS NULL
           RETURNING processed_at`,
          [transfer.id, withdrawalId]
        );
        stripeTransferId = transfer.id;
        if (rowCount === 0) {
          console.error('[withdrawals/stripe-transfer] Transfer succeeded but withdrawal status was not updated', {
            withdrawalId,
            stripeTransferId: transfer.id,
          });
        } else {
          queueWithdrawalEmail({
            to: employee.email,
            subject: 'SnapTip - Your Stripe Express payout is on the way',
            label: 'stripe-success',
            html: buildStripeConnectWithdrawalSuccessEmail({
              employeeName: employeeDisplayName(employee),
              withdrawalId,
              grossAmount: amt,
              platformFeeAmount: platformFee,
              netPayoutAmount: netAmount,
              currency,
              stripeTransferId: transfer.id,
              date: completedRows[0]?.processed_at || new Date(),
            }),
          });
        }
      } catch (dbErr) {
        console.error('[withdrawals/stripe-transfer-db-update]', {
          message: dbErr.message,
          withdrawalId,
          stripeTransferId: transfer.id,
        });
        return res.status(202).json({
          success: true,
          message: 'Stripe payout was sent. Your payout status is still being updated.',
          new_balance: newBalance,
        });
      }
    }

    if (payoutMethod === 'wise_manual') {
      queueWithdrawalEmail({
        to: employee.email,
        subject: 'SnapTip - Manual payout request received',
        label: 'wise-manual-requested',
        html: buildWiseManualWithdrawalRequestedEmail({
          employeeName: employeeDisplayName(employee),
          withdrawalId,
          grossAmount: amt,
          platformFeeAmount: platformFee,
          netPayoutAmount: netAmount,
          currency,
          payoutMethod: methodLabel || 'Manual bank transfer / Wise',
          date: withdrawalCreatedAt || new Date(),
        }),
      });
    }

    logFromReq(req, {
      actorType: 'employee',
      actorId: employeeId,
      action: 'withdrawal.requested',
      targetType: 'withdrawal',
      metadata: {
        amount: amt,
        currency,
        method: methodLabel,
        payout_method: payoutMethod,
        platform_fee_percent: PLATFORM_FEE_PERCENT,
        platform_fee: platformFee,
        net: netAmount,
        stripe_account_id: payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null,
        stripe_transfer_created: Boolean(stripeTransferId),
        stripe_transfer_id: stripeTransferId,
      },
    });

    const historyParams = [employeeId];
    let historyDetailsExpr = 'account_details';
    if (encKey) {
      historyParams.push(encKey);
      historyDetailsExpr = decryptedAccountDetailsExpr(2);
    }
    const { rows: historyRows } = await pool.query(
      `SELECT id, amount, fee, net_amount, method, payout_method, payout_status,
              platform_fee_amount, platform_fee_percent, net_payout_amount,
              payout_schedule, withdrawal_source, schedule_period_key,
              stripe_account_id, stripe_transfer_id, processed_at, currency,
              ${historyDetailsExpr} AS account_details,
              contact_phone, status, created_at
       FROM withdrawals AS w
       WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 20`,
      historyParams
    );

    const withdrawals = historyRows.map(w => ({
      ...w,
      amount: Number(w.amount) || 0,
      fee: Number(w.fee) || 0,
      platform_fee_amount: Number(w.platform_fee_amount || w.fee) || 0,
      net_amount: Number(w.net_amount) || 0,
      net_payout_amount: Number(w.net_payout_amount || w.net_amount) || 0,
    }));

    res.status(201).json({
      success: true,
      message: payoutMethod === 'stripe_connect'
        ? 'Stripe payout sent. Your net payout is being processed by Stripe Express.'
        : 'Manual payout request submitted. Manual payouts are reviewed and processed by SnapTip.',
      new_balance: newBalance,
      withdrawals,
      payout_method: payoutMethod,
      payout_schedule: payoutSchedule,
    });
  } catch (err) {
    console.error('[withdrawals/request]', {
      message: err.message,
      code: err.code,
      routine: err.routine,
    });
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/availability', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { rows } = await pool.query(
      `SELECT id, balance, country, currency, stripe_account_id, payout_method
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    const employee = rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const payoutCfg = getEffectivePayoutConfig({
      countryName: employee.country,
      currency: employee.currency,
    });
    const payoutMethod = getEffectivePayoutMethod(payoutCfg);
    const availability = await getPayoutAvailabilityForEmployee(employee, payoutCfg, payoutMethod);

    res.json(serializePayoutAvailability(availability));
  } catch (err) {
    console.error('[withdrawals/availability]', {
      message: err.message,
      code: err.code,
    });
    res.status(500).json({ error: 'Could not check payout availability.' });
  }
});

router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { rows } = await pool.query(
      `SELECT payout_schedule, auto_payout_enabled, next_payout_at, last_auto_payout_at
       FROM employees
       WHERE id = $1`,
      [employeeId]
    );
    const employee = rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    res.json(serializePreferences(employee));
  } catch (err) {
    console.error('[withdrawals/preferences GET]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const requestedSchedule = String(req.body?.payoutSchedule || req.body?.payout_schedule || '').trim().toLowerCase();
    if (!VALID_PAYOUT_SCHEDULES.has(requestedSchedule)) {
      return res.status(400).json({ error: 'Invalid payout schedule.' });
    }
    const payoutSchedule = requestedSchedule;

    const autoPayoutEnabled = payoutSchedule !== 'manual';
    const nextPayoutAt = autoPayoutEnabled ? getNextPayoutAt(payoutSchedule) : null;
    const { rows } = await pool.query(
      `UPDATE employees
       SET payout_schedule = $1,
           auto_payout_enabled = $2,
           next_payout_at = $3
       WHERE id = $4
       RETURNING payout_schedule, auto_payout_enabled, next_payout_at, last_auto_payout_at`,
      [payoutSchedule, autoPayoutEnabled, nextPayoutAt, employeeId]
    );
    const employee = rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    res.json(serializePreferences(employee));
  } catch (err) {
    console.error('[withdrawals/preferences PUT]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.patch('/settings', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { rows } = await pool.query(
      'SELECT country, currency FROM employees WHERE id = $1',
      [employeeId]
    );
    const employee = rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    const payoutCfg = getEffectivePayoutConfig({
      countryName: employee.country,
      currency: employee.currency,
    });
    const payoutMethod = getEffectivePayoutMethod(payoutCfg);
    const payoutSchedule = normalizePayoutSchedule(req.body?.payout_schedule, payoutMethod);

    await pool.query(
      `UPDATE employees
       SET payout_method = $1,
           payout_schedule = $2,
           payout_country = $3
       WHERE id = $4`,
      [payoutMethod, payoutSchedule, payoutCfg.code, employeeId]
    );

    res.json({
      success: true,
      payout_method: payoutMethod,
      payout_schedule: payoutSchedule,
      manual_only: payoutMethod !== 'stripe_connect',
    });
  } catch (err) {
    console.error('[withdrawals/settings]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const encKey = getEncryptionKey();
    const params = [employeeId];
    let detailsExpr = 'account_details';
    if (encKey) {
      params.push(encKey);
      detailsExpr = decryptedAccountDetailsExpr(2);
    }
    const { rows: historyRows } = await pool.query(
      `SELECT id, amount, fee, platform_fee_amount, platform_fee_percent,
              net_amount, net_payout_amount, method, payout_method, payout_status,
              payout_schedule, withdrawal_source, schedule_period_key,
              stripe_account_id, stripe_transfer_id, processed_at, currency,
              ${detailsExpr} AS account_details,
              contact_phone, status, created_at
       FROM withdrawals AS w
       WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 50`,
      params
    );

    const withdrawals = historyRows.map(w => ({
      ...w,
      amount: Number(w.amount) || 0,
      fee: Number(w.fee) || 0,
      platform_fee_amount: Number(w.platform_fee_amount || w.fee) || 0,
      net_amount: Number(w.net_amount) || 0,
      net_payout_amount: Number(w.net_payout_amount || w.net_amount) || 0,
    }));
    res.json({ withdrawals });
  } catch (err) {
    console.error('[withdrawals/history]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

router.startScheduledPayoutScheduler = startScheduledPayoutScheduler;
router.runScheduledPayouts = runScheduledPayouts;

module.exports = router;
