const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/tips — returns tips for the logged-in employee (never errors on empty)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, amount, status, created_at FROM tips WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.employee.id]
    );
    res.json({ tips: rows });
  } catch (err) {
    console.error('[tips GET /]', err.message);
    res.json({ tips: [] });
  }
});

// POST /api/tips/create — public
router.post('/create', async (req, res) => {
  try {
    const { employee_username, amount } = req.body;

    if (!employee_username || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid employee username and amount are required.' });
    }

    const { rows } = await pool.query('SELECT id FROM employees WHERE username = $1', [employee_username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employeeId = rows[0].id;

    // Insert tip
    const { rows: tipRows } = await pool.query(
      'INSERT INTO tips (employee_id, amount, status) VALUES ($1, $2, $3) RETURNING id',
      [employeeId, amount, 'completed']
    );
    const tipId = tipRows[0].id;

    // Update employee balance
    await pool.query('UPDATE employees SET balance = balance + $1 WHERE id = $2', [amount, employeeId]);

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
