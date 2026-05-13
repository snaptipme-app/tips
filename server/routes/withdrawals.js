const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { getEncryptionKey, decryptedAccountDetailsExpr } = require('../lib/cryptoFields');
const { logFromReq } = require('../lib/audit');

/* ── Method fee & minimum config ─────────────────────────────────────── */
const METHOD_CONFIG = {
  // New labels from mobile withdraw screen
  'Cash Plus Agency':        { fee: 35, min: 400 },
  'Cash Plus App':           { fee: 0,  min: 400 },
  'Wafacash Agency':         { fee: 35, min: 400 },
  'Wafacash Jibi App':       { fee: 0,  min: 400 },
  'CIH Bank':                { fee: 0,  min: 100 },
  'Other Moroccan Bank':     { fee: 16, min: 100 },
  'International Bank Transfer': { fee: -1, min: 50 },  // fee = -1 means calculate 0.5%
  // Legacy aliases (in case old data uses these)
  'Cash Plus (Agency)':      { fee: 35, min: 400 },
  'Cash Plus (App)':         { fee: 0,  min: 400 },
  'Wafacash (Agency)':       { fee: 35, min: 400 },
  'Wafacash (Jibi App)':     { fee: 0,  min: 400 },
};

/* ── Per-country minimum withdrawal config ───────────────────────────── */
// Mirror of mobile/lib/payoutConfig.ts — keep in sync.
const PAYOUT_CONFIG = {
  MA: { currency: 'MAD',  minAmount: 200    },
  AE: { currency: 'AED',  minAmount: 50     },
  US: { currency: 'USD',  minAmount: 20     },
  FR: { currency: 'EUR',  minAmount: 20     },
  ES: { currency: 'EUR',  minAmount: 20     },
  DE: { currency: 'EUR',  minAmount: 20     },
  IT: { currency: 'EUR',  minAmount: 20     },
  PH: { currency: 'PHP',  minAmount: 1500   },
  ID: { currency: 'IDR',  minAmount: 300000 },
  TH: { currency: 'THB',  minAmount: 700    },
};

/** Maps country full-name (stored in DB) to ISO code */
const COUNTRY_TO_ISO = {
  'Morocco': 'MA', 'UAE': 'AE', 'United Arab Emirates': 'AE',
  'United States': 'US',
  'France': 'FR', 'Spain': 'ES', 'Germany': 'DE', 'Italy': 'IT',
  'Philippines': 'PH', 'Indonesia': 'ID', 'Thailand': 'TH',
};

/* ══════════════════════════════════════════════════════
   POST /api/withdrawals/request
   Creates a pending withdrawal and immediately deducts
   the amount from the employee's balance.
   ══════════════════════════════════════════════════════ */
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { amount, method, payout_type, country: reqCountry, account_details, contact_phone } = req.body;

    /* ── Validation ── */
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }
    if (!method) {
      return res.status(400).json({ error: 'Withdrawal method is required.' });
    }
    if (!account_details) {
      return res.status(400).json({ error: 'Account details are required.' });
    }
    if (!contact_phone || String(contact_phone).trim().length < 6) {
      return res.status(400).json({ error: 'A valid contact phone number is required.' });
    }

    const amt = Number(amount);
    const config = METHOD_CONFIG[method] || { fee: 0, min: 1 };

    if (amt < config.min) {
      return res.status(400).json({
        error: `Minimum withdrawal for ${method} is ${config.min}.`,
      });
    }

    /* ── Per-country minimum check ── */
    const { rows: empRows } = await pool.query(
      'SELECT balance, country FROM employees WHERE id = $1', [employeeId]
    );
    if (empRows.length === 0) return res.status(404).json({ error: 'Employee not found.' });

    const employeeCountry = empRows[0].country || reqCountry || 'Morocco';
    const isoCode = COUNTRY_TO_ISO[employeeCountry] || 'MA';
    const payoutCfg = PAYOUT_CONFIG[isoCode] || { currency: 'USD', minAmount: 20 };

    if (amt < payoutCfg.minAmount) {
      return res.status(400).json({
        error: `Minimum withdrawal in ${employeeCountry} is ${payoutCfg.minAmount.toLocaleString()} ${payoutCfg.currency}. Requested: ${amt} ${payoutCfg.currency}.`,
      });
    }

    // For international transfers, fee is 0.5% of amount
    const fee = config.fee === -1 ? Math.round(amt * 0.005 * 100) / 100 : config.fee;
    const netAmount = amt - fee;

    /* ── Check available balance (balance minus any un-held pending requests) ── */
    const { rows: availRows } = await pool.query(
      `SELECT e.balance - COALESCE((
         SELECT SUM(w.amount) FROM withdrawals w
         WHERE w.employee_id = $1 AND w.status = 'pending' AND w.balance_deducted = FALSE
       ), 0) AS available
       FROM employees e WHERE e.id = $1`,
      [employeeId]
    );
    const availableBalance = Number(availRows[0]?.available ?? empRows[0].balance);
    if (availableBalance < amt) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    /* ── Insert withdrawal record (balance is NOT deducted until admin approval) ── */
    const accountJson = typeof account_details === 'object'
      ? JSON.stringify(account_details)
      : String(account_details);

    const encKey = getEncryptionKey();
    if (encKey) {
      // Encrypted path: write only to account_details_enc, leave plaintext col NULL.
      await pool.query(
        `INSERT INTO withdrawals
           (employee_id, amount, fee, net_amount, method, account_details, account_details_enc, contact_phone, status, balance_deducted)
         VALUES ($1, $2, $3, $4, $5, NULL, pgp_sym_encrypt($6::text, $7::text), $8, 'pending', FALSE)`,
        [employeeId, amt, fee, netAmount, method, accountJson, encKey, String(contact_phone).trim()]
      );
    } else {
      await pool.query(
        `INSERT INTO withdrawals
           (employee_id, amount, fee, net_amount, method, account_details, contact_phone, status, balance_deducted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', FALSE)`,
        [employeeId, amt, fee, netAmount, method, accountJson, String(contact_phone).trim()]
      );
    }

    logFromReq(req, {
      actorType: 'employee',
      actorId: employeeId,
      action: 'withdrawal.requested',
      targetType: 'withdrawal',
      metadata: { amount: amt, currency: undefined, method, fee, net: netAmount },
    });

    /* ── Return updated withdrawal history ── */
    const historyParams = [employeeId];
    let historyDetailsExpr = 'account_details';
    if (encKey) {
      historyParams.push(encKey);
      historyDetailsExpr = decryptedAccountDetailsExpr(2);
    }
    const { rows: historyRows } = await pool.query(
      `SELECT id, amount, fee, net_amount, method,
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
      net_amount: Number(w.net_amount) || 0,
    }));

    // Balance is NOT deducted at request time — it stays the same until admin approval.
    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
      new_balance: availableBalance - amt,  // optimistic: shows what will be left after approval
      withdrawals,
    });
  } catch (err) {
    console.error('[withdrawals/request]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/withdrawals/history   — employee's own history
   ══════════════════════════════════════════════════════ */
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
      `SELECT id, amount, fee, net_amount, method,
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
      net_amount: Number(w.net_amount) || 0,
    }));
    res.json({ withdrawals });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
