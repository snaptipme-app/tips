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

function isStripePayoutReady(account) {
  return Boolean(account?.details_submitted && account?.payouts_enabled);
}

function minorToNumber(minor) {
  return Number(minorToMoneyString(minor));
}

function platformFeeMinorForAmount(amountMinor) {
  return (amountMinor * BigInt(PLATFORM_FEE_PERCENT) + 50n) / 100n;
}

function minMinor(a, b) {
  return a < b ? a : b;
}

function serializePayoutAvailability(availability) {
  return {
    totalBalance: minorToNumber(availability.totalBalanceMinor),
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

async function getPayoutAvailabilityForEmployee(employee, payoutCfg, payoutMethod, db = pool) {
  const currency = normalizeCurrency(employee.currency || payoutCfg.currency || 'USD');
  const totalBalanceMinor = parseMoneyToMinor(employee.balance) || 0n;

  if (payoutMethod !== 'stripe_connect') {
    return {
      totalBalanceMinor,
      availableToWithdrawMinor: totalBalanceMinor,
      pendingSettlementMinor: 0n,
      currency,
      reason: 'manual_payout_available',
    };
  }

  if (!stripe || !employee.stripe_account_id) {
    return {
      totalBalanceMinor,
      availableToWithdrawMinor: 0n,
      pendingSettlementMinor: totalBalanceMinor,
      currency,
      reason: 'stripe_setup_incomplete',
    };
  }

  const employeeSettledAvailableMinor = await getEmployeeSettledAvailableMinor(db, employee.id, currency);
  const availableToWithdrawMinor = minMinor(totalBalanceMinor, employeeSettledAvailableMinor);
  const pendingSettlementMinor = totalBalanceMinor - availableToWithdrawMinor;

  return {
    totalBalanceMinor,
    availableToWithdrawMinor,
    pendingSettlementMinor,
    currency,
    reason: pendingSettlementMinor > 0n
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
      if (payoutAvailability.availableToWithdrawMinor < amountMinor) {
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

      const stripeBalance = await stripe.balance.retrieve();
      const platformAvailableMinor = getAvailableBalanceMinor(stripeBalance, stripeTransferCurrency);
      if (platformAvailableMinor < BigInt(stripeTransferAmount)) {
        console.warn('[withdrawals/stripe-platform-preflight]', {
          employeeId,
          transferCurrency: stripeTransferCurrency,
          transferAmountMinor: stripeTransferAmount,
          platformAvailableMinor: Number(platformAvailableMinor),
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
        if (lockedAvailability.availableToWithdrawMinor < amountMinor) {
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
           platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           idempotency_key, currency, account_details, account_details_enc, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2::real, $2::numeric, $3::real, $3::numeric, $5::numeric,
           $4::real, $4::numeric, $6, $7, $8, $9,
           $5::numeric, $10, NULL,
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
           platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           idempotency_key, currency, account_details, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2::real, $2::numeric, $3::real, $3::numeric, $5::numeric,
           $4::real, $4::numeric, $6, $7, $8, $9,
           $5::numeric, $10, NULL,
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
              payout_schedule, stripe_account_id, stripe_transfer_id, processed_at, currency,
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
              payout_schedule, stripe_account_id, stripe_transfer_id, processed_at, currency,
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

module.exports = router;
