const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');

function rowsToArray(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}

router.post('/request', authMiddleware, (req, res) => {
  try {
    const employeeId = req.employee.id;
    const { amount, method, account_details } = req.body;
    const db = getDB();

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    if (!method) {
      return res.status(400).json({ error: 'Withdrawal method is required.' });
    }

    if (!account_details) {
      return res.status(400).json({ error: 'Account details are required.' });
    }

    const rows = db.exec('SELECT balance FROM employees WHERE id = ?', [employeeId]);
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const balance = rows[0].values[0][0];
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Insert withdrawal request — do NOT deduct balance (admin approves manually)
    db.run(
      'INSERT INTO withdrawals (employee_id, amount, method, account_details, status) VALUES (?, ?, ?, ?, ?)',
      [employeeId, amount, method, account_details, 'pending']
    );
    saveDB();

    // Return updated withdrawal list
    const withdrawals = rowsToArray(
      db.exec(
        'SELECT id, amount, method, account_details, status, created_at FROM withdrawals WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20',
        [employeeId]
      )
    ).map(w => ({ ...w, amount: Number(w.amount) || 0 }));

    res.status(201).json({
      message: 'Withdrawal request submitted successfully. Awaiting admin approval.',
      withdrawals,
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
