const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { sendOTPEmail } = require('../utils/sendEmail');
const { logFromReq } = require('../lib/audit');

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

    console.log('[register] Step 1: checking OTP verification for', normalizedEmail);
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

    console.log('[register] Step 2: checking username uniqueness:', username);
    const { rows: existingUsernames } = await pool.query('SELECT id FROM employees WHERE username = $1', [username]);
    if (existingUsernames.length > 0) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    console.log('[register] Step 3: checking email uniqueness:', normalizedEmail);
    const { rows: existingEmails } = await pool.query('SELECT id FROM employees WHERE email = $1', [normalizedEmail]);
    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    console.log('[register] Step 4: hashing password');
    const hashedPassword = await bcrypt.hash(password, 10);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    console.log('[register] Step 5: INSERT INTO employees — columns: username, full_name, first_name, last_name, email, password, account_type, country, currency, custom_message, show_photo_on_card, reset_code_expires');
    console.log('[register] Values:', { username, fullName, email: normalizedEmail, accountType, userCountry, userCurrency });

    const { rows: insertRows } = await pool.query(
      `INSERT INTO employees
         (username, full_name, first_name, last_name, email, password, account_type, country, currency, custom_message, show_photo_on_card, reset_code_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [username, fullName, firstName.trim(), lastName.trim(), normalizedEmail,
       hashedPassword, accountType, userCountry, userCurrency, '', 1, 0]
    );

    console.log('[register] Step 6: INSERT succeeded, new id =', insertRows[0]?.id);

    await pool.query('DELETE FROM otps WHERE email = $1', [normalizedEmail]);

    const id = insertRows[0].id;

    const token = jwt.sign(
      { id, username, email: normalizedEmail, is_admin: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[register] Step 7: registration complete for', username);

    res.status(201).json({
      token,
      employee: {
        id,
        username,
        full_name: fullName,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        profile_image_url: '',
        photo_url: '',
        photo_base64: '',
        is_admin: 0,
        account_type: accountType,
        country: userCountry,
        currency: userCurrency,
        balance: 0,
        total_tips: 0,
        job_title: '',
        custom_message: '',
        show_photo_on_card: 1,
      },
    });
  } catch (err) {
    console.error('[CRITICAL DB ERROR] Register route failed:');
    console.error('  message  :', err.message);
    console.error('  code     :', err.code);       // PostgreSQL error code e.g. '42703' = undefined column
    console.error('  detail   :', err.detail);     // e.g. 'Key (email)=(...) already exists.'
    console.error('  hint     :', err.hint);
    console.error('  table    :', err.table);
    console.error('  column   :', err.column);
    console.error('  constraint:', err.constraint);
    console.error('  stack    :', err.stack);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register-via-invite
// Skips OTP — the invite token acts as email trust. Auto-generates username from full_name.
router.post('/register-via-invite', async (req, res) => {
  try {
    const { full_name, email, password, invite_token, photo_base64 } = req.body;

    if (!full_name || !email || !password || !invite_token) {
      return res.status(400).json({ error: 'full_name, email, password, and invite_token are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate invite token
    const { rows: invRows } = await pool.query(
      "SELECT * FROM invitations WHERE token = $1 AND is_valid = TRUE AND status IN ('pending','active')",
      [invite_token]
    );
    const invitation = invRows[0];
    if (!invitation) {
      return res.status(400).json({ error: 'Invalid or revoked invitation token.' });
    }

    // If invite was for a specific email, enforce it
    if (invitation.email && invitation.email !== 'link_invite' && invitation.email !== normalizedEmail) {
      return res.status(400).json({ error: 'This invitation was sent to a different email address.' });
    }

    // Check email not already registered
    const { rows: existingEmails } = await pool.query('SELECT id FROM employees WHERE email = $1', [normalizedEmail]);
    if (existingEmails.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Auto-generate username from full_name (lowercase alphanum, max 14 chars + 4-digit suffix)
    const nameParts = full_name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
    const baseUsername = full_name.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14);

    let username = baseUsername + Math.floor(1000 + Math.random() * 9000);
    for (let i = 0; i < 5; i++) {
      const { rows: taken } = await pool.query('SELECT id FROM employees WHERE username = $1', [username]);
      if (taken.length === 0) break;
      username = baseUsername + Math.floor(1000 + Math.random() * 9000);
    }

    // Derive country/currency from invite
    const userCountry = invitation.required_country || 'Morocco';
    const currencyMap = {
      Morocco: 'MAD', UAE: 'AED', 'United States': 'USD',
      France: 'EUR', Spain: 'EUR', Germany: 'EUR', Italy: 'EUR',
      Philippines: 'PHP', Indonesia: 'IDR', Thailand: 'THB',
    };
    const userCurrency = currencyMap[userCountry] || 'MAD';

    const hashedPassword = await bcrypt.hash(password, 10);
    const fullName = `${firstName} ${lastName}`.trim();

    const { rows: insertRows } = await pool.query(
      `INSERT INTO employees
         (username, full_name, first_name, last_name, email, password, account_type, country, currency, photo_base64, custom_message, show_photo_on_card, reset_code_expires)
       VALUES ($1, $2, $3, $4, $5, $6, 'individual', $7, $8, $9, '', 1, 0) RETURNING id`,
      [username, fullName, firstName, lastName, normalizedEmail, hashedPassword, userCountry, userCurrency, photo_base64 || '']
    );

    const id = insertRows[0].id;

    const token = jwt.sign(
      { id, username, email: normalizedEmail, is_admin: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[register-via-invite] created account:', username, 'for', normalizedEmail);

    res.status(201).json({
      token,
      employee: {
        id, username, full_name: fullName, first_name: firstName, last_name: lastName,
        email: normalizedEmail, profile_image_url: '', photo_url: '',
        photo_base64: photo_base64 || '', is_admin: 0, account_type: 'individual',
        country: userCountry, currency: userCurrency, balance: 0, total_tips: 0,
        job_title: '', custom_message: '', show_photo_on_card: 1,
      },
    });
  } catch (err) {
    console.error('[register-via-invite]', err.message, err.code, err.detail);
    return res.status(500).json({ error: err.message });
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
      logFromReq(req, {
        actorType: 'employee',
        action: 'employee.login.failure',
        metadata: { identifier },
      });
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    if (employee.is_suspended) {
      logFromReq(req, {
        actorType: 'employee',
        actorId: employee.id,
        action: 'employee.login.blocked.suspended',
      });
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    if (employee.deleted_at) {
      logFromReq(req, {
        actorType: 'employee',
        actorId: employee.id,
        action: 'employee.login.blocked.deleted',
      });
      return res.status(403).json({
        error: 'This account has been deleted. Use the recovery email to restore it within 30 days.',
        code: 'ACCOUNT_DELETED',
      });
    }

    // Update last_login
    try { await pool.query('UPDATE employees SET last_login = $1 WHERE id = $2', [new Date().toISOString(), employee.id]); } catch (_) {}

    logFromReq(req, {
      actorType: 'employee',
      actorId: employee.id,
      action: 'employee.login.success',
    });

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

    logFromReq(req, {
      actorType: 'employee',
      actorId: req.employee.id,
      action: 'employee.password.change',
    });

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

    const { sendEmail, buildPasswordResetEmail } = require('../utils/sendEmail');
    const htmlBody = buildPasswordResetEmail({ code });

    await sendEmail(normalizedEmail, 'SnapTip — Reset Your Password', htmlBody);
    console.log(`[forgot-password] Reset code sent to ${normalizedEmail}`);

    logFromReq(req, {
      actorType: 'employee',
      actorId: rows[0].id,
      action: 'employee.password.forgot.requested',
      metadata: { email: normalizedEmail },
    });

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

    logFromReq(req, {
      actorType: 'employee',
      actorId: employee.id,
      action: 'employee.password.reset.completed',
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error('[reset-password]', err.message);
    res.status(500).json({ error: 'Server error resetting password.' });
  }
});

module.exports = router;

