const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const { rows: empRows } = await pool.query(
      'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url, email, balance, account_type, job_title, business_id, country, currency, created_at FROM employees WHERE id = $1',
      [employeeId]
    );

    const employee = empRows[0];
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const { rows: tipStatsRows } = await pool.query('SELECT COALESCE(SUM(amount), 0) as total_tips, COUNT(*) as tip_count FROM tips WHERE employee_id = $1', [employeeId]);
    const tipStats = tipStatsRows[0] || { total_tips: 0, tip_count: 0 };

    const { rows: recentTips } = await pool.query('SELECT id, amount, status, created_at FROM tips WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 20', [employeeId]);
    const { rows: recentWithdrawals } = await pool.query('SELECT id, amount, method, account_details, status, created_at FROM withdrawals WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 10', [employeeId]);

    const emp = {
      ...employee,
      balance: Number(employee.balance) || 0,
      account_type: employee.account_type || 'individual',
    };
    const tipsOut = recentTips.map((t) => ({ ...t, amount: Number(t.amount) || 0 }));
    const wOut = recentWithdrawals.map((w) => ({ ...w, amount: Number(w.amount) || 0 }));

    res.json({
      employee: emp,
      total_tips: Number(tipStats.total_tips) || 0,
      tip_count: Number(tipStats.tip_count) || 0,
      recent_tips: tipsOut,
      recent_withdrawals: wOut,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
