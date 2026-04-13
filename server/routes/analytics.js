const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

function rowsToObjects(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}

// POST /api/analytics/track  (public — used by TipPage)
router.post('/track', (req, res) => {
  try {
    const { event, username, amount } = req.body;
    
    if (!event || !username) {
      console.log('Analytics rejection:', req.body);
      return res.status(400).json({ error: 'Event and username are required.' });
    }

    const db = getDB();
    
    const rows = db.exec('SELECT id FROM employees WHERE username = ?', [username]);
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(404).json({ error: 'Employee not found for analytics.' });
    }
    const employeeId = rows[0].values[0][0];

    db.run(
      'INSERT INTO analytics (employee_id, event, amount) VALUES (?, ?, ?)',
      [employeeId, event, amount === undefined ? null : amount]
    );
    saveDB();

    res.json({ success: true });
  } catch (err) {
    console.error('Analytics track error:', err.message);
    res.status(500).json({ error: 'Server error saving analytics.' });
  }
});

// GET /api/analytics/all  (admin only)
router.get('/all', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = getDB();
    const result = db.exec(`
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

    res.json({ events: rowsToObjects(result) });
  } catch (err) {
    console.error('Analytics all error:', err.message);
    res.status(500).json({ error: 'Server error fetching analytics.' });
  }
});

// GET /api/analytics/summary  (admin only)
router.get('/summary', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = getDB();

    const totalResult = db.exec('SELECT COUNT(*) as total FROM analytics');
    const clicksResult = db.exec("SELECT COUNT(*) as total FROM analytics WHERE event = 'click_payment'");
    const viewsResult = db.exec("SELECT COUNT(*) as total FROM analytics WHERE event = 'view_message'");

    const total_events = totalResult.length > 0 ? totalResult[0].values[0][0] : 0;
    const total_clicks = clicksResult.length > 0 ? clicksResult[0].values[0][0] : 0;
    const total_views = viewsResult.length > 0 ? viewsResult[0].values[0][0] : 0;

    res.json({ total_events, total_clicks, total_views });
  } catch (err) {
    console.error('Analytics summary error:', err.message);
    res.status(500).json({ error: 'Server error fetching summary.' });
  }
});
// DELETE /api/analytics/reset  (admin only)
router.delete('/reset', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const db = getDB();
    db.run('DELETE FROM analytics');
    saveDB();
    res.json({ success: true, message: 'Analytics data cleared' });
  } catch (err) {
    console.error('Analytics reset error:', err.message);
    res.status(500).json({ error: 'Server error resetting analytics.' });
  }
});

module.exports = router;
