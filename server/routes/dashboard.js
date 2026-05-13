const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { getEncryptionKey, decryptedAccountDetailsExpr } = require('../lib/cryptoFields');

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

    const { rows: withdrawalStatsRows } = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS total_withdrawn,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS total_pending
       FROM withdrawals WHERE employee_id = $1`,
      [employeeId]
    );
    const withdrawalStats = withdrawalStatsRows[0] || { total_withdrawn: 0, total_pending: 0 };

    // Rating stats from payments table
    const { rows: ratingRows } = await pool.query(
      `SELECT
         COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0)::FLOAT AS average_rating,
         COUNT(rating)::INT AS total_ratings,
         COUNT(CASE WHEN rating = 1 THEN 1 END)::INT AS r1,
         COUNT(CASE WHEN rating = 2 THEN 1 END)::INT AS r2,
         COUNT(CASE WHEN rating = 3 THEN 1 END)::INT AS r3,
         COUNT(CASE WHEN rating = 4 THEN 1 END)::INT AS r4,
         COUNT(CASE WHEN rating = 5 THEN 1 END)::INT AS r5
       FROM payments
       WHERE employee_id = $1 AND rating IS NOT NULL AND status = 'completed'`,
      [employeeId]
    );
    const rs = ratingRows[0] || {};
    const rating_stats = {
      average_rating: (rs.total_ratings > 0) ? Number(rs.average_rating) : null,
      total_ratings: rs.total_ratings || 0,
      rating_breakdown: { 1: rs.r1||0, 2: rs.r2||0, 3: rs.r3||0, 4: rs.r4||0, 5: rs.r5||0 },
    };

    const { rows: recentTips } = await pool.query(
      `(SELECT t.id, t.amount::REAL, COALESCE(t.currency, 'MAD') AS currency,
          NULL::TEXT AS payment_method, NULL::INTEGER AS sender_id, NULL::TEXT AS sender_name,
          t.status, t.created_at
        FROM tips t WHERE t.employee_id = $1)
       UNION ALL
       (SELECT p.id, p.amount::REAL, p.currency,
          p.payment_method, p.sender_id, s.full_name AS sender_name,
          p.status, p.created_at
        FROM payments p
        LEFT JOIN employees s ON s.id = p.sender_id
        WHERE p.employee_id = $1 AND p.payment_method = 'split_in')
       ORDER BY created_at DESC LIMIT 20`,
      [employeeId]
    );

    const encKey = getEncryptionKey();
    const wParams = [employeeId];
    let detailsExpr = 'account_details';
    if (encKey) {
      wParams.push(encKey);
      detailsExpr = decryptedAccountDetailsExpr(2);
    }
    const { rows: recentWithdrawals } = await pool.query(
      `SELECT id, amount, method, ${detailsExpr} AS account_details, status, created_at
       FROM withdrawals AS w
       WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 10`,
      wParams
    );

    const emp = {
      ...employee,
      balance: Number(employee.balance) || 0,
      account_type: employee.account_type || 'individual',
    };
    const tipsOut = recentTips.map((t) => ({
      ...t,
      amount: Number(t.amount) || 0,
      payment_method: t.payment_method || null,
      sender_id: t.sender_id || null,
      sender_name: t.sender_name || null,
    }));
    const wOut = recentWithdrawals.map((w) => ({ ...w, amount: Number(w.amount) || 0 }));

    res.json({
      employee: emp,
      total_tips: Number(tipStats.total_tips) || 0,
      tip_count: Number(tipStats.tip_count) || 0,
      total_withdrawn: Number(withdrawalStats.total_withdrawn) || 0,
      total_pending_withdrawals: Number(withdrawalStats.total_pending) || 0,
      recent_tips: tipsOut,
      recent_withdrawals: wOut,
      rating_stats,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
