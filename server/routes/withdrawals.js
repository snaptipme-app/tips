const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { getEncryptionKey, decryptedAccountDetailsExpr } = require('../lib/cryptoFields');
const { logFromReq } = require('../lib/audit');
const { stripe } = require('../lib/stripe');
const { PLATFORM_FEE_PERCENT, parseMoneyToMinor, minorToMoneyString } = require('../lib/money');
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

function serializeDetails(details) {
  if (!details) return null;
  return typeof details === 'object' ? JSON.stringify(details) : String(details);
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
    try {
      await dbClient.query('BEGIN');

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

      if (encKey) {
        await dbClient.query(
        `INSERT INTO withdrawals (
           employee_id, amount, gross_requested_amount, fee, platform_fee_amount, platform_fee_percent,
           net_amount, net_payout_amount, method, payout_method, payout_status, payout_schedule,
           platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           currency, account_details, account_details_enc, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2, $2, $3, $3, $5,
           $4, $4, $6, $7, 'pending', $8,
           $5, $9, NULL,
           $10, NULL, pgp_sym_encrypt($11::text, $12::text), $13, 'pending', TRUE
         )`,
        [
          employeeId, amt, platformFee, netAmount, PLATFORM_FEE_PERCENT, methodLabel,
          payoutMethod, payoutSchedule, payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null, currency,
          accountJson, encKey, contactPhone,
        ]
        );
      } else {
        await dbClient.query(
        `INSERT INTO withdrawals (
           employee_id, amount, gross_requested_amount, fee, platform_fee_amount, platform_fee_percent,
           net_amount, net_payout_amount, method, payout_method, payout_status, payout_schedule,
           platform_fee_snapshot, stripe_account_id, stripe_transfer_id,
           currency, account_details, contact_phone, status, balance_deducted
         )
         VALUES (
           $1, $2, $2, $3, $3, $5,
           $4, $4, $6, $7, 'pending', $8,
           $5, $9, NULL,
           $10, $11, $12, 'pending', TRUE
         )`,
        [
          employeeId, amt, platformFee, netAmount, PLATFORM_FEE_PERCENT, methodLabel,
          payoutMethod, payoutSchedule, payoutMethod === 'stripe_connect' ? employee.stripe_account_id : null, currency,
          accountJson, contactPhone,
        ]
        );
      }

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
        stripe_transfer_created: false,
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
        ? 'Payout request submitted. Stripe Express payouts will follow your selected schedule.'
        : 'Manual payout request submitted. Manual payouts are reviewed and processed by SnapTip.',
      new_balance: newBalance,
      withdrawals,
      payout_method: payoutMethod,
      payout_schedule: payoutSchedule,
    });
  } catch (err) {
    console.error('[withdrawals/request]', err.message);
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
