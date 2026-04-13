const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

router.get('/:username', (req, res) => {
  try {
    const { username } = req.params;
    const db = getDB();

    const rows = db.exec(
      'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url FROM employees WHERE username = ?',
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
