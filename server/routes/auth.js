const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { saveBase64Image } = require('../lib/saveBase64Image');
const { sendOTPEmail } = require('../utils/sendEmail');

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await pool.query('DELETE FROM otps WHERE email = $1', [normalizedEmail]);
    await pool.query(
      'INSERT INTO otps (email, otp_hash, attempts, expires_at, verified) VALUES ($1, $2, 0, $3, 0)',
      [normalizedEmail, otpHash, expiresAt]
    );

    await sendOTPEmail(normalizedEmail, otp);
    console.log(`OTP email sent to ${normalizedEmail}`);

    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('send-otp error:', err.message);
    res.status(500).json({ error: 'Failed to send verification email. Check your email configuration.' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, code } = req.body;
    const otpCode = otp || code;
    console.log('[verify-otp] received:', { email, otpCode: otpCode ? '***' + String(otpCode).slice(-2) : undefined });
    const MAX_ATTEMPTS = 3;

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { rows } = await pool.query('SELECT * FROM otps WHERE email = $1 ORDER BY created_at DESC LIMIT 1', [normalizedEmail]);
    const otpRecord = rows[0];

    if (!otpRecord) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    if (Date.now() > otpRecord.expires_at) {
      await pool.query('DELETE FROM otps WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await pool.query('DELETE FROM otps WHERE email = $1', [normalizedEmail]);
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    const isValid = await bcrypt.compare(otpCode.trim(), otpRecord.otp_hash);

    if (!isValid) {
      await pool.query('UPDATE otps SET attempts = attempts + 1 WHERE email = $1', [normalizedEmail]);
      const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return res.status(400).json({
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    await pool.query('UPDATE otps SET verified = 1 WHERE email = $1', [normalizedEmail]);

    res.json({ verified: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('verify-otp error:', err.message);
    res.status(500).json({ error: 'Server error verifying code.' });
  }
});

// POST /api/auth/register  — pure JSON, no multer
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, username: rawUsername, password, account_type, country, currency, photoBase64 } = req.body;

    if (!firstName || !lastName || !email || !rawUsername || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const accountType = account_type === 'business' ? 'business' : 'individual';
    const userCountry = country || 'Morocco';
    const userCurrency = currency || 'MAD';
    console.log('Saving employee with account_type:', accountType, 'country:', userCountry);

    const username = rawUsername.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const { rows: otpRows } = await pool.query('SELECT * FROM otps WHERE email = $1 AND verified = 1', [normalizedEmail]);
    if (otpRows.length === 0) {
      return res.status(400).json({ error: 'Email not verified. Please complete OTP verification first.' });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters: letters, numbers, and underscores only.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const { rows: existingUsernames } = await pool.query('SELECT id FROM employees WHERE username = $1', [username]);
    if (existingUsernames.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const { rows: existingEmails } = await pool.query('SELECT id FROM employees WHERE email = $1', [normalizedEmail]);
    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle optional photo upload via base64
    let profileImageUrl = '';
    let photoBase64Stored = '';
    if (photoBase64) {
      try {
        profileImageUrl = saveBase64Image(photoBase64, 'profile');
        photoBase64Stored = photoBase64;
        console.log(`[register] Photo saved: ${profileImageUrl}`);
      } catch (imgErr) {
        console.error('[register] Photo save failed:', imgErr.message);
        // Non-fatal — proceed without photo
      }
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { rows: insertRows } = await pool.query(
      `INSERT INTO employees
         (username, full_name, first_name, last_name, email, password, profile_image_url, photo_url, photo_base64, account_type, country, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [username, fullName, firstName.trim(), lastName.trim(), normalizedEmail,
       hashedPassword, profileImageUrl, profileImageUrl, photoBase64Stored, accountType, userCountry, userCurrency]
    );

    await pool.query('DELETE FROM otps WHERE email = $1', [normalizedEmail]);

    const id = insertRows[0].id;

    const token = jwt.sign(
      { id, username, email: normalizedEmail, is_admin: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      employee: {
        id,
        username,
        full_name: fullName,
        email: normalizedEmail,
        profile_image_url: profileImageUrl,
        photo_base64: photoBase64,
        is_admin: 0,
        account_type: accountType,
        country: userCountry,
        currency: userCurrency,
      },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const identifier = email.trim().toLowerCase();

    const { rows } = await pool.query(
      'SELECT * FROM employees WHERE email = $1 OR username = $2',
      [identifier, identifier]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const employee = rows[0];

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    if (employee.is_suspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    // Update last_login
    try { await pool.query('UPDATE employees SET last_login = $1 WHERE id = $2', [new Date().toISOString(), employee.id]); } catch (_) {}

    const token = jwt.sign(
      { id: employee.id, username: employee.username, email: employee.email, is_admin: employee.is_admin || 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      employee: {
        id: employee.id,
        username: employee.username,
        full_name: employee.full_name,
        email: employee.email,
        photo_url: employee.photo_url || '',
        photo_base64: employee.photo_base64 || '',
        profile_image_url: employee.profile_image_url || '',
        balance: Number(employee.balance) || 0,
        is_admin: employee.is_admin || 0,
        account_type: employee.account_type || 'individual',
        job_title: employee.job_title || '',
        business_id: employee.business_id || null,
        country: employee.country || 'Morocco',
        currency: employee.currency || 'MAD',
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/change-password
const authMiddleware = require('../middleware/auth');
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const { rows } = await pool.query('SELECT password FROM employees WHERE id = $1', [req.employee.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }
    
    const currentHash = rows[0].password;
    const valid = await bcrypt.compare(current_password, currentHash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [newHash, req.employee.id]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[auth/change-password]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT id FROM employees WHERE email = $1', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const code = generateOTP();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    await pool.query(
      'UPDATE employees SET reset_code = $1, reset_code_expires = $2 WHERE email = $3',
      [codeHash, expiresAt, normalizedEmail]
    );

    const { sendEmail } = require('../utils/sendEmail');
    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <div style="background:#080818;padding:32px;text-align:center;">
      <img src="http://156.67.28.181:5000/assets/images/snaptip_icon.png" width="56" height="56" alt="SnapTip Logo" style="display:inline-block;border-radius:12px;" />
      <h1 style="color:white;font-size:22px;margin:12px 0 0;">SnapTip</h1>
    </div>

    <div style="padding:40px 32px;">
      <h2 style="color:#080818;font-size:24px;margin:0 0 16px;">Reset your password</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Enter this code in the app to reset your password.
      </p>

      <div style="background:#f0fdf9;border:2px solid #00C896;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#00C896;">${code}</span>
      </div>

      <p style="color:#888;font-size:14px;margin:0 0 16px;text-align:center;">
        Expires in <strong style="color:#080818;">15 minutes</strong>
      </p>
      <p style="color:#aaa;font-size:13px;margin:0;text-align:center;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;

    await sendEmail(normalizedEmail, 'SnapTip — Reset Your Password', htmlBody);
    console.log(`[forgot-password] Reset code sent to ${normalizedEmail}`);

    res.json({ success: true, message: 'Reset code sent to your email.' });
  } catch (err) {
    console.error('[forgot-password]', err.message);
    res.status(500).json({ error: 'Failed to send reset code.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query('SELECT id, reset_code, reset_code_expires FROM employees WHERE email = $1', [normalizedEmail]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const employee = rows[0];
    if (!employee.reset_code || !employee.reset_code_expires) {
      return res.status(400).json({ error: 'No reset code found. Please request a new one.' });
    }
    if (Date.now() > employee.reset_code_expires) {
      await pool.query('UPDATE employees SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1', [employee.id]);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    const isValid = await bcrypt.compare(code.trim(), employee.reset_code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE employees SET password = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2',
      [hashedPassword, employee.id]
    );

    console.log(`[reset-password] Password reset for ${normalizedEmail}`);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[reset-password]', err.message);
    res.status(500).json({ error: 'Server error resetting password.' });
  }
});

module.exports = router;

