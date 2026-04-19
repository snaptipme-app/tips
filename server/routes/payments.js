const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');

/* ── Helper ── */
function rowsToObjs(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((vals) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}
function rowToObj(result) {
  const rows = rowsToObjs(result);
  return rows.length ? rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments/mock
// Public — no auth required
// Body: { employee_username, amount, tourist_email, payment_method }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/mock', (req, res) => {
  try {
    const {
      employee_username,
      amount,
      tourist_email = null,
      payment_method = 'mock',
    } = req.body;

    if (!employee_username || !amount) {
      return res.status(400).json({ error: 'employee_username and amount are required.' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'amount must be a positive number.' });
    }

    const db = getDB();

    const employee = rowToObj(
      db.exec('SELECT id, full_name, balance FROM employees WHERE username = ?', [employee_username])
    );
    if (!employee) {
      return res.status(404).json({ error: `Employee "${employee_username}" not found.` });
    }

    // 1. Insert payment record
    db.run(
      `INSERT INTO payments (employee_id, amount, currency, payment_method, status, stripe_payment_id, tourist_email)
       VALUES (?, ?, 'USD', ?, 'completed', NULL, ?)`,
      [employee.id, parsedAmount, payment_method, tourist_email]
    );

    // 2. Update employee balance
    db.run('UPDATE employees SET balance = balance + ? WHERE id = ?', [parsedAmount, employee.id]);

    // 3. Also insert into tips table (keeps existing dashboard working)
    db.run(
      "INSERT INTO tips (employee_id, amount, status) VALUES (?, ?, 'completed')",
      [employee.id, parsedAmount]
    );

    saveDB();

    // Get the new payment id
    const paymentIdRes = db.exec('SELECT last_insert_rowid() as id');
    // last_insert_rowid returns the tips row — get the payments row directly
    const p = rowToObj(
      db.exec(
        'SELECT id FROM payments WHERE employee_id = ? ORDER BY id DESC LIMIT 1',
        [employee.id]
      )
    );

    console.log(
      `[payments/mock] $${parsedAmount} → ${employee_username} (employee_id=${employee.id}), payment_id=${p?.id}`
    );

    res.status(201).json({
      success: true,
      payment_id: p?.id,
      employee_name: employee.full_name,
      amount: parsedAmount,
    });
  } catch (err) {
    console.error('[payments/mock]', err.message);
    res.status(500).json({ error: 'Server error processing payment.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/history/:employeeId
// Auth required
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history/:employeeId', authMiddleware, (req, res) => {
  try {
    const { employeeId } = req.params;
    const db = getDB();

    // Allow employee to see their own history; admins can see any
    if (String(req.employee.id) !== String(employeeId) && !req.employee.is_admin) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const payments = rowsToObjs(
      db.exec(
        'SELECT * FROM payments WHERE employee_id = ? ORDER BY created_at DESC',
        [employeeId]
      )
    );

    console.log(`[payments/history] employee_id=${employeeId}, count=${payments.length}`);
    res.json({ payments });
  } catch (err) {
    console.error('[payments/history]', err.message);
    res.status(500).json({ error: 'Server error fetching payment history.' });
  }
});

module.exports = router;
