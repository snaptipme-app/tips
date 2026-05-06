const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { upload, getImageUrl, multerErrorHandler } = require('../middleware/upload');
const { saveBase64Image } = require('../lib/saveBase64Image');
const crypto = require('crypto');
const { sendEmail } = require('../utils/sendEmail');
const { logFromReq } = require('../lib/audit');


// Ensure required columns exist on startup
(async () => {
  try {
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS custom_message TEXT');
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS show_photo_on_card INTEGER DEFAULT 1');
    await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS push_token TEXT');
  } catch (_) {}
})();

// ── POST /api/employee/push-token ────────────────────────────────────────────
router.post('/push-token', authMiddleware, async (req, res) => {
  try {
    const { push_token } = req.body;
    if (!push_token) return res.status(400).json({ error: 'push_token is required.' });

    await pool.query(
      'UPDATE employees SET push_token = $1 WHERE id = $2',
      [push_token, req.employee.id]
    );

    console.log(`[push-token] Saved token for employee_id=${req.employee.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[push-token]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

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

// ── GET /api/employee/export-data ────────────────────────────────────────────
// GDPR Article 20 — data portability. Returns the full record we hold for the
// authenticated employee as JSON. Sensitive crypto material (password hash,
// encryption keys, OTP secrets) is intentionally excluded.
router.get('/export-data', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const [
      profile,
      payments,
      tips,
      withdrawals,
      teamMembership,
    ] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, full_name, email, username, photo_url,
                job_title, account_type, country, currency, balance, total_tips,
                phone_number, custom_message, show_photo_on_card,
                withdrawal_method, withdrawal_account, business_id, is_admin,
                is_verified, is_suspended, last_login, created_at, deleted_at
         FROM employees WHERE id = $1`,
        [employeeId]
      ),
      pool.query(
        'SELECT id, amount, fee, currency, payment_method, tourist_email, status, created_at FROM payments WHERE employee_id = $1 ORDER BY created_at DESC',
        [employeeId]
      ),
      pool.query(
        'SELECT id, amount, currency, status, created_at FROM tips WHERE employee_id = $1 ORDER BY created_at DESC',
        [employeeId]
      ),
      pool.query(
        'SELECT id, amount, fee, net_amount, currency, method, account_details, contact_phone, status, admin_note, created_at FROM withdrawals WHERE employee_id = $1 ORDER BY created_at DESC',
        [employeeId]
      ),
      pool.query(
        `SELECT tm.id, tm.role, tm.joined_at, b.id AS business_id, b.business_name, b.business_type
         FROM team_members tm LEFT JOIN businesses b ON b.id = tm.business_id
         WHERE tm.employee_id = $1`,
        [employeeId]
      ),
    ]);

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    logFromReq(req, {
      actorType: 'employee',
      actorId: employeeId,
      action: 'gdpr.export-data',
      targetType: 'employee',
      targetId: employeeId,
    });

    const filename = `snaptip-data-${profile.rows[0].username || employeeId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exported_at: new Date().toISOString(),
      profile: profile.rows[0],
      payments: payments.rows,
      tips: tips.rows,
      withdrawals: withdrawals.rows,
      team_membership: teamMembership.rows,
    });
  } catch (err) {
    console.error('[employee/export-data]', err.message);
    res.status(500).json({ error: 'Server error exporting data.' });
  }
});

// ── POST /api/employee/delete-account ────────────────────────────────────────
// GDPR Article 17 — right to erasure. Soft-delete: sets deleted_at and emails a
// recovery code. The account is locked out immediately (auth middleware + login
// reject deleted_at IS NOT NULL). Hard purge runs after 30 days via
// scripts/purge-deleted-accounts.js.
router.post('/delete-account', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const { rows } = await pool.query(
      'SELECT email, full_name, username, deleted_at FROM employees WHERE id = $1',
      [employeeId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (rows[0].deleted_at) {
      return res.status(400).json({ error: 'Account is already pending deletion.' });
    }

    // 6-digit recovery code, single-use, valid for 30 days (until hard purge).
    const recoveryCode = String(Math.floor(100000 + Math.random() * 900000));
    const recoveryHash = crypto.createHash('sha256').update(recoveryCode).digest('hex');

    await pool.query(
      'UPDATE employees SET deleted_at = NOW(), deletion_recovery_code = $1 WHERE id = $2',
      [recoveryHash, employeeId]
    );

    logFromReq(req, {
      actorType: 'employee',
      actorId: employeeId,
      action: 'gdpr.delete-account.requested',
      targetType: 'employee',
      targetId: employeeId,
    });

    // Best-effort email; failure should not roll back the soft-delete (the user
    // explicitly asked for it). They can still contact support to recover.
    try {
      await sendEmail(
        rows[0].email,
        'SnapTip — Account deletion requested',
        `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:560px;margin:40px auto;padding:24px;background:#fff;border-radius:12px;">
          <h2 style="color:#080818;">Your SnapTip account has been scheduled for deletion</h2>
          <p>Hi ${rows[0].full_name || rows[0].username},</p>
          <p>You requested deletion of your SnapTip account. It is now disabled and will be permanently removed in <strong>30 days</strong>.</p>
          <p>Changed your mind? Use this recovery code on the recovery page to restore the account before it is purged:</p>
          <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#00C896;background:#f0fdf9;padding:20px;text-align:center;border-radius:10px;margin:20px 0;">${recoveryCode}</div>
          <p style="color:#666;font-size:13px;">If you did not request this, contact support immediately.</p>
        </body></html>`
      );
    } catch (mailErr) {
      console.error('[employee/delete-account] email failed:', mailErr.message);
    }

    res.json({
      success: true,
      message: 'Account scheduled for deletion. A recovery email has been sent.',
      grace_period_days: 30,
    });
  } catch (err) {
    console.error('[employee/delete-account]', err.message);
    res.status(500).json({ error: 'Server error deleting account.' });
  }
});

// ── POST /api/employee/recover-account ───────────────────────────────────────
// Public — no auth required (the user is locked out). Restores a soft-deleted
// account if the email + code match and we are still inside the 30-day window.
router.post('/recover-account', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'email and code are required.' });
    }

    const identifier = String(email).trim().toLowerCase();
    const codeHash = crypto.createHash('sha256').update(String(code).trim()).digest('hex');

    const { rows } = await pool.query(
      `SELECT id, deleted_at, deletion_recovery_code
       FROM employees WHERE email = $1`,
      [identifier]
    );

    // Generic error to avoid email enumeration.
    if (
      rows.length === 0 ||
      !rows[0].deleted_at ||
      !rows[0].deletion_recovery_code ||
      rows[0].deletion_recovery_code !== codeHash
    ) {
      logFromReq(req, {
        actorType: 'employee',
        action: 'gdpr.recover-account.failure',
        metadata: { identifier },
      });
      return res.status(400).json({ error: 'Invalid email or recovery code.' });
    }

    const deletedAt = new Date(rows[0].deleted_at).getTime();
    if (Date.now() - deletedAt > 30 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: 'Recovery window has expired.' });
    }

    await pool.query(
      'UPDATE employees SET deleted_at = NULL, deletion_recovery_code = NULL WHERE id = $1',
      [rows[0].id]
    );

    logFromReq(req, {
      actorType: 'employee',
      actorId: rows[0].id,
      action: 'gdpr.recover-account.success',
      targetType: 'employee',
      targetId: rows[0].id,
    });

    res.json({ success: true, message: 'Account restored. You can log in again.' });
  } catch (err) {
    console.error('[employee/recover-account]', err.message);
    res.status(500).json({ error: 'Server error recovering account.' });
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
      const COUNTRY_CURRENCY = {
        'Morocco': 'MAD',
        'United Arab Emirates': 'AED', 'UAE': 'AED',
        'United States': 'USD',
        'France': 'EUR', 'Spain': 'EUR', 'Germany': 'EUR', 'Italy': 'EUR',
        'Philippines': 'PHP',
        'Indonesia': 'IDR',
        'Thailand': 'THB',
        'UK': 'GBP',
      };
      emp.currency = COUNTRY_CURRENCY[emp.country] || 'USD';
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
