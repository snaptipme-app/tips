const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { upload, getImageUrl, multerErrorHandler } = require('../middleware/upload');
const { saveBase64Image } = require('../lib/saveBase64Image');


// Ensure QR-settings columns exist on startup
(async () => {
  try {
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS custom_message TEXT');
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS show_photo_on_card INTEGER DEFAULT 1');
  } catch (_) {}
})();

// ── POST /api/employee/upload-photo ─────────────────────────────────────────
// Receives a multipart/form-data photo from expo-file-system FileSystem.uploadAsync.
// No Base64, no OOM — native Android network layer handles the file:// URI directly.
router.post('/upload-photo', authMiddleware, upload.single('photo'), multerErrorHandler, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    console.log(`[upload-photo] employee_id=${employeeId}`);

    if (!req.file) {
      console.error('[upload-photo] No file received');
      return res.status(400).json({ error: 'No image file received by server.' });
    }

    // Build an absolute URL so the mobile app can display the photo immediately
    const photoUrl = `https://snaptip.me/uploads/${req.file.filename}`;
    console.log(`[upload-photo] Saved: ${photoUrl} (${req.file.size} bytes)`);

    await pool.query(
      'UPDATE employees SET photo_url = $1, profile_image_url = $1 WHERE id = $2',
      [photoUrl, employeeId]
    );

    const { rows } = await pool.query(
      `SELECT id, username, full_name, email, photo_url, profile_image_url,
              account_type, country, currency, balance, total_tips, job_title, is_admin, business_id
       FROM employees WHERE id = $1`,
      [employeeId]
    );
    const employee = rows[0] || {};
    console.log(`[upload-photo] Success. photo_url=${employee.photo_url}`);
    res.json({ success: true, message: 'Photo uploaded.', employee });
  } catch (err) {
    console.error('[upload-photo] DB error:', err.message);
    res.status(500).json({ error: 'Failed to save photo to database.' });
  }
});

// ── PATCH /api/employee/profile (text fields + legacy base64 fallback) ───────
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { photo_url, photo_base64, full_name, job_title } = req.body;
    const employeeId = req.employee.id;

    console.log(`[DEBUG PATCH /profile] employee_id=${employeeId} | has photo_base64=${!!photo_base64} | base64_len=${photo_base64?.length || 0} | has photo_url=${!!photo_url} | has full_name=${!!full_name} | has job_title=${job_title !== undefined}`);

    const updates = [];
    const values = [];
    let idx = 1;

    // If base64 photo is provided, save it to disk and use the URL
    if (photo_base64) {
      console.log('[DEBUG PATCH /profile] Attempting to save base64 image to disk...');
      try {
        const savedUrl = saveBase64Image(photo_base64, 'profile');
        updates.push(`photo_url = $${idx++}`); values.push(savedUrl);
        updates.push(`profile_image_url = $${idx++}`); values.push(savedUrl);
        updates.push(`photo_base64 = $${idx++}`); values.push(photo_base64);
        console.log(`[employee/profile] Photo saved to disk: ${savedUrl}`);
      } catch (imgErr) {
        console.error('[employee/profile] Photo save failed:', imgErr.message);
        // Fallback: store base64 in DB only
        updates.push(`photo_base64 = $${idx++}`); values.push(photo_base64);
      }
    } else if (photo_url) {
      updates.push(`photo_url = $${idx++}`); values.push(photo_url);
      updates.push(`profile_image_url = $${idx++}`); values.push(photo_url);
    }

    if (full_name) { updates.push(`full_name = $${idx++}`); values.push(full_name.trim()); }
    if (job_title !== undefined) { updates.push(`job_title = $${idx++}`); values.push(job_title.trim()); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update.' });
    }

    values.push(employeeId);
    await pool.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    console.log(`[employee/profile] Updated employee_id=${employeeId}, fields=${updates.length}`);

    // Return the full updated employee so the mobile app can sync AuthContext immediately
    const { rows: updatedRows } = await pool.query(
      `SELECT id, username, full_name, email, photo_url, photo_base64, profile_image_url,
              account_type, country, currency, balance, total_tips, job_title, is_admin, business_id
       FROM employees WHERE id = $1`,
      [employeeId]
    );
    const updatedEmployee = updatedRows[0] || {};
    console.log(`[employee/profile] photo_url in response: ${updatedEmployee.photo_url || 'none'}`);
    res.json({ success: true, message: 'Profile updated.', employee: updatedEmployee });
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
      'SELECT id, username, full_name, photo_url, photo_base64, profile_image_url, account_type, balance, job_title, country, currency, custom_message, show_photo_on_card FROM employees WHERE username = $1',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const emp = rows[0];
    // Ensure currency is always set — derive from country if missing
    if (!emp.currency) {
      const COUNTRY_CURRENCY = { 'Morocco': 'MAD', 'United States': 'USD', 'France': 'EUR', 'Spain': 'EUR', 'UAE': 'AED', 'UK': 'GBP' };
      emp.currency = COUNTRY_CURRENCY[emp.country] || 'MAD';
    }

    console.log(`[DEBUG employee/:username] ${emp.username} → currency=${emp.currency}, country=${emp.country}`);
    res.json(emp);
  } catch (err) {
    console.error('Employee fetch error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── PATCH /api/employee/qr-settings ──────────────────────────────────────────
router.patch('/qr-settings', authMiddleware, async (req, res) => {
  try {
    const { custom_message, show_photo_on_card } = req.body;
    await pool.query(
      'UPDATE employees SET custom_message = $1, show_photo_on_card = $2 WHERE id = $3',
      [custom_message || null, show_photo_on_card !== false ? 1 : 0, req.employee.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[employee/qr-settings]', err.message);
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
