const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/payments/history
// Protected - returns all payments for the logged-in employee.
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const { rows: payments } = await pool.query(
      'SELECT id, amount, currency, payment_method, status, tourist_email, created_at FROM payments WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    console.log(`[payments/history] employee_id=${employeeId}, count=${payments.length}`);
    res.json({ success: true, data: { payments } });
  } catch (err) {
    console.error('[payments/history]', err.message);
    res.status(500).json({ success: false, error: 'Server error fetching payment history.' });
  }
});

// GET /api/payments/history/:employeeId
// Legacy endpoint kept for dashboard/mobile backwards compatibility.
router.get('/history/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (String(req.employee.id) !== String(employeeId) && !req.employee.is_admin) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    const { rows: payments } = await pool.query(
      'SELECT * FROM payments WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    return res.json({ success: true, data: { payments } });
  } catch (err) {
    console.error('[payments/history]', err.message);
    return res.status(500).json({ success: false, error: 'Server error fetching payment history.' });
  }
});

module.exports = router;
