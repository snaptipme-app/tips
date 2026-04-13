const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');

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

    db.run(
      'INSERT INTO withdrawals (employee_id, amount, method, account_details, status) VALUES (?, ?, ?, ?, ?)',
      [employeeId, amount, method, account_details, 'pending']
    );
    db.run('UPDATE employees SET balance = balance - ? WHERE id = ?', [amount, employeeId]);
    saveDB();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const withdrawalId = result[0].values[0][0];

    res.status(201).json({
      message: 'Withdrawal request submitted successfully.',
      withdrawal: { id: withdrawalId, amount, method, account_details, status: 'pending' },
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
