const express = require('express');
const router = express.Router();
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');

// ── PATCH /api/employee/profile ──────────────────────────────────────────────
router.patch('/profile', authMiddleware, (req, res) => {
  try {
    const { photo_url, photo_base64, full_name, job_title } = req.body;
    const employeeId = req.employee.id;
    const db = getDB();

    const updates = [];
    const values = [];

    if (photo_url) { updates.push('photo_url = ?'); values.push(photo_url); }
    if (photo_base64) { updates.push('photo_base64 = ?'); values.push(photo_base64); }
    if (photo_url) { updates.push('profile_image_url = ?'); values.push(photo_url); }
    if (full_name) { updates.push('full_name = ?'); values.push(full_name.trim()); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(employeeId);
    db.run(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDB();

    console.log(`[employee/profile] Updated employee_id=${employeeId}, fields=${updates.length}`);
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('[employee/profile]', err.message);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// ── GET /api/employee/:username ──────────────────────────────────────────────
router.get('/:username', (req, res) => {
  try {
    const { username } = req.params;
    const db = getDB();

    const rows = db.exec(
      'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url, account_type, balance, job_title FROM employees WHERE username = ?',
      [username]
    );

    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const cols = rows[0].columns;
    const vals = rows[0].values[0];
    const employee = {};
    cols.forEach((col, i) => { employee[col] = vals[i]; });

    res.json(employee);
  } catch (err) {
    console.error('Employee fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
