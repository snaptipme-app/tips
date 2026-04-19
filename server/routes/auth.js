const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { getDB, saveDB } = require('../db');
const { upload, getImageUrl } = require('../middleware/upload');
const { sendOTPEmail } = require('../utils/sendEmail');

function rowToObj(result) {
  if (!result || result.length === 0 || result[0].values.length === 0) return null;
  const cols = result[0].columns;
  const vals = result[0].values[0];
  const obj = {};
  cols.forEach((col, i) => { obj[col] = vals[i]; });
  return obj;
}

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

    const db = getDB();
    db.run('DELETE FROM otps WHERE email = ?', [normalizedEmail]);
    db.run(
      'INSERT INTO otps (email, otp_hash, attempts, expires_at, verified) VALUES (?, ?, 0, ?, 0)',
      [normalizedEmail, otpHash, expiresAt]
    );
    saveDB();

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
    const { email, code } = req.body;
    const MAX_ATTEMPTS = 3;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDB();

    const otpRecord = rowToObj(
      db.exec('SELECT * FROM otps WHERE email = ? ORDER BY created_at DESC LIMIT 1', [normalizedEmail])
    );

    if (!otpRecord) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }

    if (Date.now() > otpRecord.expires_at) {
      db.run('DELETE FROM otps WHERE email = ?', [normalizedEmail]);
      saveDB();
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      db.run('DELETE FROM otps WHERE email = ?', [normalizedEmail]);
      saveDB();
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' });
    }

    const isValid = await bcrypt.compare(code.trim(), otpRecord.otp_hash);

    if (!isValid) {
      db.run('UPDATE otps SET attempts = attempts + 1 WHERE email = ?', [normalizedEmail]);
      saveDB();
      const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return res.status(400).json({
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    db.run('UPDATE otps SET verified = 1 WHERE email = ?', [normalizedEmail]);
    saveDB();

    res.json({ verified: true, message: 'Email verified successfully.' });
  } catch (err) {
    console.error('verify-otp error:', err.message);
    res.status(500).json({ error: 'Server error verifying code.' });
  }
});

// POST /api/auth/register
router.post('/register', upload.single('profileImage'), async (req, res) => {
  try {
    const { firstName, lastName, email, username: rawUsername, password, account_type } = req.body;
    const db = getDB();

    if (!firstName || !lastName || !email || !rawUsername || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const accountType = account_type === 'business' ? 'business' : 'individual';
    console.log('Saving employee with account_type:', accountType);

    const username = rawUsername.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const otpRecord = rowToObj(
      db.exec('SELECT * FROM otps WHERE email = ? AND verified = 1', [normalizedEmail])
    );
    if (!otpRecord) {
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

    const existingUsername = rowToObj(
      db.exec('SELECT id FROM employees WHERE username = ?', [username])
    );
    if (existingUsername) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const existingEmail = rowToObj(
      db.exec('SELECT id FROM employees WHERE email = ?', [normalizedEmail])
    );
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const profileImageUrl = getImageUrl(req, req.file);
    let photoBase64 = '';
    if (req.file) {
      photoBase64 = fileToBase64(req.file.path);
    }
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    db.run(
      `INSERT INTO employees
         (username, full_name, first_name, last_name, email, password, profile_image_url, photo_url, photo_base64, account_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, fullName, firstName.trim(), lastName.trim(), normalizedEmail,
       hashedPassword, profileImageUrl, profileImageUrl, photoBase64, accountType]
    );
    saveDB();

    db.run('DELETE FROM otps WHERE email = ?', [normalizedEmail]);
    saveDB();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];

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
    const db = getDB();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    const identifier = email.trim().toLowerCase();

    const rows = db.exec(
      'SELECT * FROM employees WHERE email = ? OR username = ?',
      [identifier, identifier]
    );
    if (rows.length === 0 || rows[0].values.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const cols = rows[0].columns;
    const vals = rows[0].values[0];
    const employee = {};
    cols.forEach((col, i) => { employee[col] = vals[i]; });

    const validPassword = await bcrypt.compare(password, employee.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

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
        photo_base64: employee.photo_base64 || '',
        is_admin: employee.is_admin || 0,
        account_type: employee.account_type || 'individual',
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
