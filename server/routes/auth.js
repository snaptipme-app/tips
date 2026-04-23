const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { upload, getImageUrl } = require('../middleware/upload');
const { sendOTPEmail } = require('../utils/sendEmail');

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function fileToBase64(filePath) {
  try {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
    if (!fs.existsSync(absPath)) return '';
    const data = fs.readFileSync(absPath);
    const ext = path.extname(absPath).toLowerCase().replace('.', '');
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const mime = mimeMap[ext] || 'image/jpeg';
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return '';
  }
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

// POST /api/auth/register
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, email, username: rawUsername, password, account_type, country, currency } = req.body;

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

    const profileImageUrl = getImageUrl(req, req.file);
    let photoBase64 = '';
    if (req.file) {
      photoBase64 = fileToBase64(req.file.path);
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { rows: insertRows } = await pool.query(
      `INSERT INTO employees
         (username, full_name, first_name, last_name, email, password, profile_image_url, photo_url, photo_base64, account_type, country, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [username, fullName, firstName.trim(), lastName.trim(), normalizedEmail,
       hashedPassword, profileImageUrl, profileImageUrl, photoBase64, accountType, userCountry, userCurrency]
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
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#080818;font-family:Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:linear-gradient(135deg,#1a1a3e,#0d0d2b);border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
    <div style="background:linear-gradient(135deg,#6c6cff,#a855f7);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:28px;">SnapTip</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Password Reset</p>
    </div>
    <div style="padding:32px;">
      <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 24px;">Your password reset code:</p>
      <div style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#00C896;">${code}</span>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;">This code expires in <strong style="color:#fff;">15 minutes</strong>.</p>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin-top:16px;">If you didn't request this, you can safely ignore this email.</p>
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

