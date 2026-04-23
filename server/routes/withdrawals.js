const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

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

/* ══════════════════════════════════════════════════════
   POST /api/withdrawals/request
   Creates a pending withdrawal and immediately deducts
   the amount from the employee's balance.
   ══════════════════════════════════════════════════════ */
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { amount, method, account_details, contact_phone } = req.body;

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

    // For international transfers, fee is 0.5% of amount
    const fee = config.fee === -1 ? Math.round(amt * 0.005 * 100) / 100 : config.fee;
    const netAmount = amt - fee;

    /* ── Check balance ── */
    const { rows: employeeRows } = await pool.query('SELECT balance FROM employees WHERE id = $1', [employeeId]);
    if (employeeRows.length === 0) return res.status(404).json({ error: 'Employee not found.' });
    
    if (Number(employeeRows[0].balance) < amt) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    /* ── Deduct balance immediately (prevents double-spending) ── */
    await pool.query(
      'UPDATE employees SET balance = balance - $1 WHERE id = $2',
      [amt, employeeId]
    );

    /* ── Insert withdrawal record ── */
    const accountJson = typeof account_details === 'object'
      ? JSON.stringify(account_details)
      : String(account_details);

    await pool.query(
      `INSERT INTO withdrawals
         (employee_id, amount, fee, net_amount, method, account_details, contact_phone, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [employeeId, amt, fee, netAmount, method, accountJson, String(contact_phone).trim()]
    );

    /* ── Return updated withdrawal history ── */
    const { rows: historyRows } = await pool.query(
      `SELECT id, amount, fee, net_amount, method, account_details, contact_phone, status, created_at
       FROM withdrawals WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [employeeId]
    );

    const withdrawals = historyRows.map(w => ({
      ...w,
      amount: Number(w.amount) || 0,
      fee: Number(w.fee) || 0,
      net_amount: Number(w.net_amount) || 0,
    }));

    const { rows: updatedEmpRows } = await pool.query('SELECT balance FROM employees WHERE id = $1', [employeeId]);

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
      new_balance: Number(updatedEmpRows[0]?.balance) || 0,
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
    
    const { rows: historyRows } = await pool.query(
      `SELECT id, amount, fee, net_amount, method, account_details, contact_phone, status, created_at
       FROM withdrawals WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [employeeId]
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
