const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');

// POST /api/tips/create — public
router.post('/create', (req, res) => {
  try {
    const { employee_username, amount } = req.body;
    const db = getDB();

    if (!employee_username || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid employee username and amount are required.' });
    }

    const rows = db.exec('SELECT id FROM employees WHERE username = ?', [employee_username]);
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employeeId = rows[0].values[0][0];

    // Insert tip
    db.run('INSERT INTO tips (employee_id, amount, status) VALUES (?, ?, ?)', [employeeId, amount, 'completed']);

    // Update employee balance
    db.run('UPDATE employees SET balance = balance + ? WHERE id = ?', [amount, employeeId]);

    saveDB();

    const tipIdResult = db.exec('SELECT last_insert_rowid() as id');
    const tipId = tipIdResult[0].values[0][0];

    console.log(`[tips] Tip of $${amount} sent to @${employee_username}`);

    res.status(201).json({
      message: 'Tip sent successfully!',
      tip: { id: tipId, amount, status: 'completed' }
    });
  } catch (err) {
    console.error('Tip error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
