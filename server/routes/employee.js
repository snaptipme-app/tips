const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');

// ── PATCH /api/employee/profile ──────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { photo_url, photo_base64, full_name, job_title } = req.body;
    const employeeId = req.employee.id;

    const updates = [];
    const values = [];
    let idx = 1;

    if (photo_url) { updates.push(`photo_url = $${idx++}`); values.push(photo_url); }
    if (photo_base64) { updates.push(`photo_base64 = $${idx++}`); values.push(photo_base64); }
    if (photo_url) { updates.push(`profile_image_url = $${idx++}`); values.push(photo_url); }
    if (full_name) { updates.push(`full_name = $${idx++}`); values.push(full_name.trim()); }
    if (job_title !== undefined) { updates.push(`job_title = $${idx++}`); values.push(job_title.trim()); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(employeeId);
    await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    console.log(`[employee/profile] Updated employee_id=${employeeId}, fields=${updates.length}`);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('[employee/profile]', err.message);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// ── GET /api/employee/:username ──────────────────────────────────────────────
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const { rows } = await pool.query(
      'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url, account_type, balance, job_title FROM employees WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Employee fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PATCH /api/employee/withdrawal-method ─────────────────────────────────────
router.patch('/withdrawal-method', authMiddleware, async (req, res) => {
  try {
    const { method, account } = req.body;
    if (!method) return res.status(400).json({ error: 'Withdrawal method is required.' });

    await pool.query(
      'UPDATE employees SET withdrawal_method = $1, withdrawal_account = $2 WHERE id = $3',
      [method.trim(), (account || '').trim(), req.employee.id]
    );
    res.json({ success: true, message: 'Withdrawal settings updated.' });
  } catch (err) {
    console.error('[employee/withdrawal-method]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── GET /api/employee/my-business ─────────────────────────────────────────────
// Members use this to fetch their business info (logo, name)
router.get('/my-business', authMiddleware, async (req, res) => {
  try {
    const { rows: empRows } = await pool.query('SELECT business_id FROM employees WHERE id = $1', [req.employee.id]);
    if (empRows.length === 0 || !empRows[0].business_id) {
      return res.status(404).json({ error: 'No business linked to this account.' });
    }
    const businessId = empRows[0].business_id;

    const { rows: businessRows } = await pool.query(
      'SELECT id, business_name, business_type, logo_url, logo_base64, address, thank_you_message FROM businesses WHERE id = $1',
      [businessId]
    );
    if (businessRows.length === 0) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    
    res.json({ business: businessRows[0] });
  } catch (err) {
    console.error('[employee/my-business]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
