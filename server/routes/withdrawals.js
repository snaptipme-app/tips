const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');

function rowsToObjs(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}
function rowToObj(result) {
  const rows = rowsToObjs(result);
  return rows[0] || null;
}

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
router.post('/request', authMiddleware, (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { amount, method, account_details, contact_phone } = req.body;
    const db = getDB();

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
    const employee = rowToObj(db.exec('SELECT balance FROM employees WHERE id = ?', [employeeId]));
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    if (Number(employee.balance) < amt) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    /* ── Deduct balance immediately (prevents double-spending) ── */
    db.run(
      'UPDATE employees SET balance = balance - ? WHERE id = ?',
      [amt, employeeId]
    );

    /* ── Insert withdrawal record ── */
    const accountJson = typeof account_details === 'object'
      ? JSON.stringify(account_details)
      : String(account_details);

    db.run(
      `INSERT INTO withdrawals
         (employee_id, amount, fee, net_amount, method, account_details, contact_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [employeeId, amt, fee, netAmount, method, accountJson, String(contact_phone).trim()]
    );
    saveDB();

    /* ── Return updated withdrawal history ── */
    const withdrawals = rowsToObjs(db.exec(
      `SELECT id, amount, fee, net_amount, method, account_details, contact_phone, status, created_at
       FROM withdrawals WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20`,
      [employeeId]
    )).map(w => ({
      ...w,
      amount: Number(w.amount) || 0,
      fee: Number(w.fee) || 0,
      net_amount: Number(w.net_amount) || 0,
    }));

    const updatedEmployee = rowToObj(db.exec('SELECT balance FROM employees WHERE id = ?', [employeeId]));

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
      new_balance: Number(updatedEmployee?.balance) || 0,
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
router.get('/history', authMiddleware, (req, res) => {
  try {
    const employeeId = req.employee.id;
    const db = getDB();
    const withdrawals = rowsToObjs(db.exec(
      `SELECT id, amount, fee, net_amount, method, account_details, contact_phone, status, created_at
       FROM withdrawals WHERE employee_id = ? ORDER BY created_at DESC LIMIT 50`,
      [employeeId]
    )).map(w => ({
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
