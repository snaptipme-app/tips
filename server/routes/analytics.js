const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// POST /api/analytics/track  (public — used by TipPage)
router.post('/track', async (req, res) => {
  try {
    const { event, username, amount } = req.body;
    
    if (!event || !username) {
      console.log('Analytics rejection:', req.body);
      return res.status(400).json({ error: 'Event and username are required.' });
    }

    const { rows } = await pool.query('SELECT id FROM employees WHERE username = $1', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found for analytics.' });
    }
    const employeeId = rows[0].id;

    await pool.query(
      'INSERT INTO analytics (employee_id, event, amount) VALUES ($1, $2, $3)',
      [employeeId, event, amount === undefined ? null : amount]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Analytics track error:', err.message);
    res.status(500).json({ error: 'Server error saving analytics.' });
  }
});

// GET /api/analytics/all  (admin only)
router.get('/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.id,
        a.event,
        a.amount,
        a.created_at,
        e.full_name AS employee_name,
        e.username AS employee_username
      FROM analytics a
      LEFT JOIN employees e ON a.employee_id = e.id
      ORDER BY a.created_at DESC
    `);

    res.json({ events: rows });
  } catch (err) {
    console.error('Analytics all error:', err.message);
    res.status(500).json({ error: 'Server error fetching analytics.' });
  }
});

// GET /api/analytics/summary  (admin only)
router.get('/summary', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rows: totalRows } = await pool.query('SELECT COUNT(*) as total FROM analytics');
    const { rows: clicksRows } = await pool.query("SELECT COUNT(*) as total FROM analytics WHERE event = 'click_payment'");
    const { rows: viewsRows } = await pool.query("SELECT COUNT(*) as total FROM analytics WHERE event = 'view_message'");

    const total_events = parseInt(totalRows[0].total, 10);
    const total_clicks = parseInt(clicksRows[0].total, 10);
    const total_views = parseInt(viewsRows[0].total, 10);

    res.json({ total_events, total_clicks, total_views });
  } catch (err) {
    console.error('Analytics summary error:', err.message);
    res.status(500).json({ error: 'Server error fetching summary.' });
  }
});

// DELETE /api/analytics/reset  (admin only)
router.delete('/reset', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM analytics');
    res.json({ success: true, message: 'Analytics data cleared' });
  } catch (err) {
    console.error('Analytics reset error:', err.message);
    res.status(500).json({ error: 'Server error resetting analytics.' });
  }
});

module.exports = router;
