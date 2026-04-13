const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const authMiddleware = require('../middleware/auth');

function rowToObj(result) {
  if (!result || result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const obj = {};
  cols.forEach((col, i) => { obj[col] = vals[i]; });
  return obj;
}

function rowsToArray(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}

router.get('/', authMiddleware, (req, res) => {
  try {
    const employeeId = req.employee.id;
    const db = getDB();

    const employee = rowToObj(
      db.exec(
        'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url, email, balance, created_at FROM employees WHERE id = ?',
        [employeeId]
      )
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const tipStats = rowToObj(
      db.exec('SELECT COALESCE(SUM(amount), 0) as total_tips, COUNT(*) as tip_count FROM tips WHERE employee_id = ?', [employeeId])
    ) || { total_tips: 0, tip_count: 0 };

    const recentTips = rowsToArray(
      db.exec('SELECT id, amount, status, created_at FROM tips WHERE employee_id = ? ORDER BY created_at DESC LIMIT 20', [employeeId])
    );

    const recentWithdrawals = rowsToArray(
      db.exec('SELECT id, amount, method, account_details, status, created_at FROM withdrawals WHERE employee_id = ? ORDER BY created_at DESC LIMIT 10', [employeeId])
    );

    const emp = {
      ...employee,
      balance: Number(employee.balance) || 0,
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
