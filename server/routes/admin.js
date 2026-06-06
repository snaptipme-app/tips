const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { ADMIN_COOKIE } = require('../middleware/adminAuth');
const { getEncryptionKey, decryptedAccountDetailsExpr } = require('../lib/cryptoFields');
const { logFromReq } = require('../lib/audit');
const { buildAdminPasswordResetEmail } = require('../utils/sendEmail');
const {
  serializeMaskedPayoutDetails,
  serializeFullPayoutDetails,
  maskValue,
  maskEmail,
  maskPhone,
} = require('../lib/wisePayoutDetails');
const {
  convertLocalAmountToUsdWithRates,
  getUsdExchangeRates,
  normalizeCurrency,
} = require('../lib/exchangeRates');

const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Shared cookie options. SameSite=Strict + httpOnly + secure (in prod) makes
// the token unreachable from JS and immune to cross-site CSRF.
function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/admin',
    maxAge: ADMIN_TOKEN_TTL_MS,
  };
}

/* ── Nodemailer transporter (Brevo SMTP) ── */
function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM = () => `SnapTip <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

function parseAccountDetails(details) {
  if (!details) return null;
  if (typeof details === 'object') return details;
  try {
    return JSON.parse(details);
  } catch (_) {
    return { accountNumber: String(details) };
  }
}

function normalizeAccountDetails(details) {
  const d = parseAccountDetails(details);
  if (!d) return null;
  return {
    fullName: String(d.fullName || d.full_name || d.accountHolder || d.account_holder || d['Full Legal Name'] || d['Full Name'] || d['Account Holder'] || '').trim(),
    bankName: String(d.bankName || d.bank_name || d.bank || d.Bank || d['Bank Name or E-Wallet'] || d['Bank Name'] || '').trim(),
    accountNumber: String(d.accountNumber || d.account_number || d.rib || d.RIB || d.iban || d.IBAN || d.phone || d.Phone || d['Account Number / RIB / Phone'] || d['RIB / Account Number'] || d['RIB (16 digits)'] || d['RIB (24 digits)'] || d.Details || '').trim(),
  };
}

function maskNormalizedAccountDetails(details) {
  if (!details) return null;
  return {
    ...details,
    accountNumber: details.accountNumber ? maskValue(details.accountNumber) : '',
    phone: details.phone ? maskPhone(details.phone) : '',
    contactEmail: details.contactEmail ? maskEmail(details.contactEmail) : '',
    address: details.address ? 'Saved' : '',
  };
}

function roundMoney(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : null;
}

function safeWithdrawalUsdConversion(amount, currency, rates) {
  try {
    const conversion = convertLocalAmountToUsdWithRates(Number(amount || 0), currency, rates);
    return {
      usdAmount: roundMoney(conversion.usdAmount),
      exchangeRate: conversion.exchangeRate,
      currency: normalizeCurrency(currency),
    };
  } catch (err) {
    return {
      usdAmount: null,
      exchangeRate: null,
      currency: normalizeCurrency(currency),
      error: err?.message || 'USD conversion unavailable',
    };
  }
}

function decryptedPayoutDetailsExpr(column, keyParamIndex, alias = 'epd') {
  return `CASE WHEN ${alias}.${column} IS NOT NULL THEN pgp_sym_decrypt(${alias}.${column}, $${keyParamIndex}) ELSE NULL END`;
}

/* ── Email templates ── */
function buildWithdrawalPaidEmail(employee, withdrawal) {
  let details = withdrawal.account_details || '';
  try {
    const parsed = JSON.parse(details);
    details = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
  } catch (_) { /* plain string */ }

  const cur = employee.currency || 'MAD';
  const amount = Number(withdrawal.amount).toFixed(2);
  const fee = Number(withdrawal.fee || 0).toFixed(2);
  const net = Number(withdrawal.net_amount || withdrawal.amount).toFixed(2);
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return {
    subject: 'SnapTip — Your withdrawal has been processed',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <div style="padding:26px 32px 18px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <div style="width:36px;height:36px;border-radius:9px;background:#000000;margin:0 auto 10px;overflow:hidden;">
        <img src="https://snaptip.me/snaptip_icon.png?v=black-20260524" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:9px;border:0;">
      </div>
      <p style="color:#111827;font-size:17px;line-height:1.2;font-weight:700;margin:0;">SnapTip</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.4;margin:4px 0 0;">Digital tipping made effortless</p>
    </div>

    <div style="background:#00C896;padding:16px 32px;text-align:center;">
      <p style="color:white;font-size:15px;font-weight:600;margin:0;">Payment successfully sent</p>
    </div>

    <div style="padding:40px 32px;">
      <h2 style="color:#080818;font-size:24px;margin:0 0 8px;">Your withdrawal has been processed!</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Hi ${employee.first_name || employee.full_name || 'there'}, your withdrawal request has been approved and processed.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e8e8ea;border-radius:12px;overflow:hidden;">
        <tr style="background:#f5f5f7;">
          <td style="padding:12px 16px;color:#666;font-size:14px;">Amount Requested</td>
          <td style="padding:12px 16px;color:#080818;font-size:14px;font-weight:600;text-align:right;">${amount} ${cur}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#666;font-size:14px;border-top:1px solid #e8e8ea;">Fee</td>
          <td style="padding:12px 16px;color:#f59e0b;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e8e8ea;">-${fee} ${cur}</td>
        </tr>
        <tr style="background:#f0fdf9;">
          <td style="padding:14px 16px;color:#00C896;font-size:15px;font-weight:700;border-top:2px solid #00C896;">Amount Sent</td>
          <td style="padding:14px 16px;color:#00C896;font-size:17px;font-weight:800;text-align:right;border-top:2px solid #00C896;">${net} ${cur}</td>
        </tr>
        <tr style="background:#f5f5f7;">
          <td style="padding:12px 16px;color:#666;font-size:14px;border-top:1px solid #e8e8ea;">Method</td>
          <td style="padding:12px 16px;color:#080818;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e8e8ea;">${withdrawal.method}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;color:#666;font-size:14px;border-top:1px solid #e8e8ea;">Account</td>
          <td style="padding:12px 16px;color:#080818;font-size:14px;text-align:right;border-top:1px solid #e8e8ea;">${details}</td>
        </tr>
        <tr style="background:#f5f5f7;">
          <td style="padding:12px 16px;color:#666;font-size:14px;border-top:1px solid #e8e8ea;">Date</td>
          <td style="padding:12px 16px;color:#080818;font-size:14px;text-align:right;border-top:1px solid #e8e8ea;">${date}</td>
        </tr>
      </table>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`,
  };
}

function buildWithdrawalRejectedEmail(employee, withdrawal, reason) {
  const cur = employee.currency || 'MAD';
  const amount = Number(withdrawal.amount).toFixed(2);
  const reasonBlock = reason
    ? `<div style="background:#fff5f5;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:14px 16px;margin:20px 0;">
         <p style="margin:0;color:#b91c1c;font-size:14px;font-weight:600;">Reason</p>
         <p style="margin:6px 0 0;color:#444;font-size:14px;line-height:1.5;">${reason}</p>
       </div>`
    : '';
  return {
    subject: 'SnapTip — Withdrawal Request Update',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <div style="padding:26px 32px 18px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <div style="width:36px;height:36px;border-radius:9px;background:#000000;margin:0 auto 10px;overflow:hidden;">
        <img src="https://snaptip.me/snaptip_icon.png?v=black-20260524" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:9px;border:0;">
      </div>
      <p style="color:#111827;font-size:17px;line-height:1.2;font-weight:700;margin:0;">SnapTip</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.4;margin:4px 0 0;">Digital tipping made effortless</p>
    </div>

    <div style="padding:40px 32px;">
      <h2 style="color:#080818;font-size:24px;margin:0 0 16px;">Withdrawal request update</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 8px;">
        Hi ${employee.first_name || employee.full_name || 'there'},
      </p>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Unfortunately, your withdrawal request for <strong style="color:#080818;">${amount} ${cur}</strong> could not be processed at this time. Your balance has been fully refunded.
      </p>

      ${reasonBlock}

      <div style="text-align:center;margin-top:28px;">
        <a href="https://snaptip.me" style="display:inline-block;background:#00C896;color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:600;">Submit a new request</a>
      </div>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`,
  };
}

async function sendEmail(to, { subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[email] EMAIL_USER or EMAIL_PASS not configured — skipping.');
    return;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: FROM(),
      to,
      subject,
      html,
    });
    console.log(`[email] Sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('[email] Failed:', err.message);
  }
}

/* ══════════════════════════════════════════════════════
   POST /api/admin/login
   ══════════════════════════════════════════════════════ */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD ? process.env.ADMIN_PASSWORD.trim() : null;
    const inputPassword = password ? String(password).trim() : null;
    if (!adminPassword) return res.status(500).json({ error: 'Admin password not configured on server.' });
    if (!inputPassword || inputPassword !== adminPassword) {
      logFromReq(req, { actorType: 'admin', action: 'admin.login.failure' });
      return res.status(401).json({ error: 'Invalid admin password.' });
    }

    const token = jwt.sign(
      { role: 'admin', iat: Math.floor(Date.now() / 1000) },
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin',
      { expiresIn: '24h' }
    );
    // httpOnly cookie — primary auth surface (immune to XSS token theft).
    res.cookie(ADMIN_COOKIE, token, adminCookieOptions());
    logFromReq(req, { actorType: 'admin', action: 'admin.login.success' });
    // `token` still returned for transitional clients still using
    // localStorage. Once all admin browsers re-login, this can be removed.
    res.json({ token, message: 'Admin authenticated.' });
  } catch (err) {
    console.error('[admin/login]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   POST /api/admin/logout — clears the httpOnly cookie
   ══════════════════════════════════════════════════════ */
router.post('/logout', (req, res) => {
  res.clearCookie(ADMIN_COOKIE, { ...adminCookieOptions(), maxAge: undefined });
  logFromReq(req, { actorType: 'admin', action: 'admin.logout' });
  res.json({ message: 'Logged out.' });
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/stats — overview
   ══════════════════════════════════════════════════════ */
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { rows: tEmp } = await pool.query('SELECT COUNT(*) as count FROM employees');
    const totalEmployees = Number(tEmp[0]?.count) || 0;

    const { rows: tPay } = await pool.query('SELECT COUNT(*) as count FROM payments');
    const totalPayments = Number(tPay[0]?.count) || 0;

    const { rows: tTips } = await pool.query('SELECT COALESCE(SUM(COALESCE(gross_amount, amount)),0) as sum FROM payments');
    const totalTips = Number(tTips[0]?.sum) || 0;

    const { rows: pWithCount } = await pool.query("SELECT COUNT(*) as count FROM withdrawals w INNER JOIN employees e ON e.id = w.employee_id WHERE w.status='pending' AND (e.is_suspended = 0 OR e.is_suspended IS NULL)");
    const pendingWithdrawals = Number(pWithCount[0]?.count) || 0;

    const { rows: pWithSum } = await pool.query("SELECT COALESCE(SUM(w.amount),0) as sum FROM withdrawals w INNER JOIN employees e ON e.id = w.employee_id WHERE w.status='pending' AND (e.is_suspended = 0 OR e.is_suspended IS NULL)");
    const pendingAmount = Number(pWithSum[0]?.sum) || 0;
    
    const { rows: commissionRows } = await pool.query(
      "SELECT COALESCE(SUM(COALESCE(platform_fee_amount, fee, 0)),0) as sum FROM withdrawals WHERE status = 'paid'"
    );
    const commission = Number(commissionRows[0]?.sum) || 0;

    const { rows: recentPayments } = await pool.query(`
      SELECT p.id,
        COALESCE(p.original_amount, p.gross_amount, p.amount) AS amount,
        COALESCE(p.original_amount, p.gross_amount, p.amount) AS original_amount,
        COALESCE(p.original_currency, p.currency, e.currency, 'USD') as original_currency,
        p.usd_amount, p.exchange_rate_used,
        p.stripe_payment_currency, p.stripe_payment_amount,
        p.platform_fee_amount, p.net_amount, p.payment_method, p.created_at,
        COALESCE(p.original_currency, p.currency, e.currency, 'USD') as currency,
        e.full_name, e.username
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      ORDER BY p.created_at DESC LIMIT 10
    `);

    // Per-currency tips breakdown
    const { rows: tipsByCurrencyRows } = await pool.query(`
      SELECT COALESCE(currency, 'USD') as currency,
        COALESCE(SUM(COALESCE(gross_amount, amount)),0) as total,
        COUNT(*) as count
      FROM payments
      GROUP BY currency
      ORDER BY total DESC
    `);
    const tipsByCurrency = tipsByCurrencyRows.map(r => ({ currency: r.currency, total: Number(r.total), count: Number(r.count) }));

    const { rows: recentWithdrawals } = await pool.query(`
      SELECT w.id, w.amount, w.status, w.method, w.payout_method, w.processed_at, w.created_at,
        e.full_name, e.username, e.currency
      FROM withdrawals w
      INNER JOIN employees e ON e.id = w.employee_id
      WHERE (e.is_suspended = 0 OR e.is_suspended IS NULL)
      ORDER BY w.created_at DESC LIMIT 5
    `);

    const { rows: growth } = await pool.query(`
      SELECT created_at::date as day, COUNT(*) as count
      FROM employees
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY day
    `);

    const { rows: tipsGrowth } = await pool.query(`
      SELECT created_at::date as day, COUNT(*) as count
      FROM payments
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY day
    `);

    res.json({
      totalEmployees, totalPayments, totalTips, pendingWithdrawals,
      pendingAmount, commission, recentPayments, recentWithdrawals,
      growth, tipsGrowth, tipsByCurrency,
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/users
   ══════════════════════════════════════════════════════ */
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { rows: users } = await pool.query(`
      SELECT id, username, full_name, first_name, last_name, email,
        account_type, country, currency, balance, created_at,
        is_suspended, photo_base64, profile_image_url, job_title, last_login
      FROM employees
      ORDER BY created_at DESC
    `);
    res.json({ users });
  } catch (err) {
    console.error('[admin/users]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/users/:id/suspend
   ══════════════════════════════════════════════════════ */
router.patch('/users/:id/suspend', adminAuth, async (req, res) => {
  try {
    console.log('[admin] Suspending user:', req.params.id);
    await pool.query('UPDATE employees SET is_suspended = 1 WHERE id = $1', [req.params.id]);
    logFromReq(req, {
      actorType: 'admin',
      action: 'user.suspend',
      targetType: 'employee',
      targetId: Number(req.params.id) || null,
    });
    res.json({ success: true, message: 'User suspended.' });
  } catch (err) {
    console.error('[admin/users/suspend]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/users/:id/reactivate
   ══════════════════════════════════════════════════════ */
router.patch('/users/:id/reactivate', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE employees SET is_suspended = 0 WHERE id = $1', [req.params.id]);
    logFromReq(req, {
      actorType: 'admin',
      action: 'user.reactivate',
      targetType: 'employee',
      targetId: Number(req.params.id) || null,
    });
    res.json({ success: true, message: 'User reactivated.' });
  } catch (err) {
    console.error('[admin/users/reactivate]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   DELETE /api/admin/users/:id
   ══════════════════════════════════════════════════════ */
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const uid = req.params.id;
    console.log('[admin] Deleting user:', uid);
    // Delete all related records in dependency order
    await pool.query('DELETE FROM tips WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM payments WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM withdrawals WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM analytics WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM otps WHERE email IN (SELECT email FROM employees WHERE id = $1)', [uid]);
    await pool.query('DELETE FROM team_members WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM invitations WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = $1)', [uid]);
    await pool.query('DELETE FROM team_members WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = $1)', [uid]);
    await pool.query('DELETE FROM businesses WHERE owner_id = $1', [uid]);
    await pool.query('DELETE FROM employees WHERE id = $1', [uid]);
    logFromReq(req, {
      actorType: 'admin',
      action: 'user.delete',
      targetType: 'employee',
      targetId: Number(uid) || null,
    });
    res.json({ success: true, message: 'User permanently deleted.' });
  } catch (err) {
    console.error('[admin/users/delete]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   POST /api/admin/users/:id/reset-password
   ══════════════════════════════════════════════════════ */
router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  try {
    const { rows: uRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    const user = uRows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPw = '';
    for (let i = 0; i < 8; i++) tempPw += chars[Math.floor(Math.random() * chars.length)];
    const hash = await bcrypt.hash(tempPw, 10);
    await pool.query('UPDATE employees SET password = $1 WHERE id = $2', [hash, req.params.id]);

    logFromReq(req, {
      actorType: 'admin',
      action: 'user.password.reset',
      targetType: 'employee',
      targetId: Number(req.params.id) || null,
    });

    await sendEmail(user.email, {
      subject: 'SnapTip - Your password was reset',
      html: buildAdminPasswordResetEmail({
        temporaryPassword: tempPw,
        userName: user.first_name || user.full_name || user.username,
        loginUrl: 'https://snaptip.me',
      }),
    });

    res.json({ success: true, message: `Password reset. Email sent to ${user.email}.` });
  } catch (err) {
    console.error('[admin/users/reset-password]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/withdrawals
   ══════════════════════════════════════════════════════ */
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const encKey = getEncryptionKey();
    const params = [];
    let detailsExpr = 'w.account_details';
    let payoutDetailsSensitiveExpr = `
        NULL AS payout_details_rib_number,
        NULL AS payout_details_iban,
        NULL AS payout_details_account_number,
        NULL AS payout_details_phone_number,
        NULL AS payout_details_contact_email,
        NULL AS payout_details_address`;
    if (encKey) {
      params.push(encKey);
      detailsExpr = decryptedAccountDetailsExpr(1);
      payoutDetailsSensitiveExpr = `
        ${decryptedPayoutDetailsExpr('rib_number_encrypted', 1)} AS payout_details_rib_number,
        ${decryptedPayoutDetailsExpr('iban_encrypted', 1)} AS payout_details_iban,
        ${decryptedPayoutDetailsExpr('account_number_encrypted', 1)} AS payout_details_account_number,
        ${decryptedPayoutDetailsExpr('phone_number_encrypted', 1)} AS payout_details_phone_number,
        ${decryptedPayoutDetailsExpr('contact_email_encrypted', 1)} AS payout_details_contact_email,
        ${decryptedPayoutDetailsExpr('address_encrypted', 1)} AS payout_details_address`;
    }
    const { rows } = await pool.query(`
      WITH payment_rollup AS (
        SELECT employee_id,
          COALESCE(SUM(COALESCE(gross_amount, amount)), 0) AS gross_earned
        FROM payments
        WHERE status = 'completed'
        GROUP BY employee_id
      ),
      withdrawal_fee_rollup AS (
        SELECT employee_id,
          COALESCE(SUM(COALESCE(platform_fee_amount, fee, 0)), 0) AS platform_fee_collected
        FROM withdrawals
        WHERE status = 'paid'
        GROUP BY employee_id
      )
      SELECT
        w.id, w.amount, w.gross_requested_amount, w.fee, w.platform_fee_amount,
        w.platform_fee_percent, w.net_amount, w.net_payout_amount,
        w.method, w.payout_method, w.payout_status, w.payout_schedule,
        w.withdrawal_source, w.schedule_period_key,
        w.platform_fee_snapshot, w.stripe_account_id, w.stripe_transfer_id, w.processed_at,
        ${detailsExpr} AS account_details,
        w.contact_phone, w.status, w.created_at, w.admin_note,
        e.id as employee_id, e.full_name, e.first_name, e.username, e.email,
        e.country, e.currency, e.balance AS net_balance, e.next_payout_at,
        epd.id AS payout_details_id, epd.payout_method AS payout_details_method,
        epd.country_code AS payout_details_country_code, epd.currency AS payout_details_currency,
        epd.account_holder_name AS payout_details_account_holder_name,
        epd.account_holder_name_en AS payout_details_account_holder_name_en,
        epd.bank_name AS payout_details_bank_name,
        epd.details_last4 AS payout_details_last4,
        epd.is_confirmed AS payout_details_is_confirmed,
        epd.updated_at AS payout_details_updated_at,
        ${payoutDetailsSensitiveExpr},
        COALESCE(pr.gross_earned, 0) AS gross_earned,
        COALESCE(wfr.platform_fee_collected, 0) AS platform_fee_collected,
        e.profile_image_url, e.photo_base64,
        e.created_at as emp_created_at
      FROM withdrawals w
      INNER JOIN employees e ON e.id = w.employee_id
      LEFT JOIN employee_payout_details epd ON epd.employee_id = e.id
      LEFT JOIN payment_rollup pr ON pr.employee_id = e.id
      LEFT JOIN withdrawal_fee_rollup wfr ON wfr.employee_id = e.id
      WHERE (e.is_suspended = 0 OR e.is_suspended IS NULL)
      ORDER BY w.created_at DESC
    `, params);
    const rates = await getUsdExchangeRates();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let totalPendingPayoutsUsd = 0;
    let totalPaidThisMonthUsd = 0;

    const withdrawals = rows.map((w) => {
      const accountDetails = normalizeAccountDetails(w.account_details);
      const maskedAccountDetails = maskNormalizedAccountDetails(accountDetails);
      const payoutDetails = serializeMaskedPayoutDetails({
        id: w.payout_details_id,
        payout_method: w.payout_details_method,
        country_code: w.payout_details_country_code,
        currency: w.payout_details_currency,
        account_holder_name: w.payout_details_account_holder_name,
        account_holder_name_en: w.payout_details_account_holder_name_en,
        bank_name: w.payout_details_bank_name,
        details_last4: w.payout_details_last4,
        is_confirmed: w.payout_details_is_confirmed,
        updated_at: w.payout_details_updated_at,
        rib_number: w.payout_details_rib_number,
        iban: w.payout_details_iban,
        account_number: w.payout_details_account_number,
        phone_number: w.payout_details_phone_number,
        contact_email: w.payout_details_contact_email,
        address: w.payout_details_address,
      });
      const {
        payout_details_rib_number,
        payout_details_iban,
        payout_details_account_number,
        payout_details_phone_number,
        payout_details_contact_email,
        payout_details_address,
        ...safeWithdrawal
      } = w;
      const withdrawalCurrency = normalizeCurrency(w.currency || 'USD');
      const requestedAmountLocal = Number(w.gross_requested_amount ?? w.amount ?? 0) || 0;
      const feeAmountLocal = Number(w.platform_fee_amount ?? w.fee ?? 0) || 0;
      const netPayoutLocal = Number(
        w.net_payout_amount ?? w.net_amount ?? Math.max(0, requestedAmountLocal - feeAmountLocal)
      ) || 0;
      const requestedUsd = safeWithdrawalUsdConversion(requestedAmountLocal, withdrawalCurrency, rates);
      const feeUsd = safeWithdrawalUsdConversion(feeAmountLocal, withdrawalCurrency, rates);
      const netUsd = safeWithdrawalUsdConversion(netPayoutLocal, withdrawalCurrency, rates);
      const status = String(w.status || w.payout_status || '').toLowerCase();
      const processedDate = new Date(w.processed_at || w.created_at || 0);

      if (status === 'pending' && Number.isFinite(netUsd.usdAmount)) {
        totalPendingPayoutsUsd += netUsd.usdAmount;
      }
      if (
        ['paid', 'completed'].includes(status) &&
        processedDate.getFullYear() === currentYear &&
        processedDate.getMonth() === currentMonth &&
        Number.isFinite(netUsd.usdAmount)
      ) {
        totalPaidThisMonthUsd += netUsd.usdAmount;
      }

      return {
        ...safeWithdrawal,
        requested_amount_local: requestedAmountLocal,
        snaptip_fee_local: feeAmountLocal,
        net_payout_local: netPayoutLocal,
        requested_amount_usd: requestedUsd.usdAmount,
        snaptip_fee_usd: feeUsd.usdAmount,
        net_payout_usd: netUsd.usdAmount,
        withdrawal_exchange_rate_used: netUsd.exchangeRate,
        withdrawal_exchange_rate_currency: netUsd.currency,
        withdrawal_usd_conversion_error: netUsd.error || null,
        account_details: maskedAccountDetails ? JSON.stringify(maskedAccountDetails) : w.account_details,
        payout_details: payoutDetails,
        employee: {
          id: w.employee_id,
          full_name: w.full_name,
          first_name: w.first_name,
          username: w.username,
          email: w.email,
          country: w.country,
          currency: w.currency,
          balance: w.net_balance,
          account_details: maskedAccountDetails,
          payout_details: payoutDetails,
        },
      };
    });
    res.json({
      withdrawals,
      usdSummary: {
        totalPendingPayoutsUsd: roundMoney(totalPendingPayoutsUsd) || 0,
        totalPaidThisMonthUsd: roundMoney(totalPaidThisMonthUsd) || 0,
        baseCurrency: 'USD',
      },
    });
  } catch (err) {
    console.error('[admin/withdrawals GET]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/withdrawals/:id/status → mark as paid
   ══════════════════════════════════════════════════════ */
router.get('/withdrawals/:id/payout-details', adminAuth, async (req, res) => {
  try {
    const encKey = getEncryptionKey();
    if (!encKey) {
      return res.status(503).json({ error: 'Secure payout details storage is not configured.' });
    }

    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT epd.id, epd.payout_method, epd.country_code, epd.currency,
              epd.account_holder_name, epd.account_holder_name_en, epd.bank_name,
              epd.details_last4, epd.is_confirmed, epd.updated_at,
              CASE WHEN epd.rib_number_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.rib_number_encrypted, $2) ELSE NULL END AS rib_number,
              CASE WHEN epd.iban_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.iban_encrypted, $2) ELSE NULL END AS iban,
              CASE WHEN epd.account_number_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.account_number_encrypted, $2) ELSE NULL END AS account_number,
              CASE WHEN epd.phone_number_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.phone_number_encrypted, $2) ELSE NULL END AS phone_number,
              CASE WHEN epd.contact_email_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.contact_email_encrypted, $2) ELSE NULL END AS contact_email,
              CASE WHEN epd.address_encrypted IS NOT NULL THEN pgp_sym_decrypt(epd.address_encrypted, $2) ELSE NULL END AS address
       FROM withdrawals w
       INNER JOIN employee_payout_details epd ON epd.employee_id = w.employee_id
       WHERE w.id = $1
       LIMIT 1`,
      [id, encKey]
    );

    const details = serializeFullPayoutDetails(rows[0]);
    if (!details) return res.status(404).json({ error: 'Payout details not found.' });

    logFromReq(req, {
      actorType: 'admin',
      action: 'admin.withdrawal_payout_details.reveal',
      targetType: 'withdrawal',
      targetId: Number(id) || null,
    });

    res.json({ details });
  } catch (err) {
    console.error('[admin/withdrawals/payout-details GET]', err.message);
    res.status(500).json({ error: 'Could not load payout details.' });
  }
});

router.patch('/withdrawals/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: wRows } = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    const withdrawal = wRows[0];
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status === 'paid') return res.status(400).json({ error: 'Already marked as paid.' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending withdrawals can be marked as paid.' });
    }
    if (withdrawal.payout_method === 'stripe_connect' && withdrawal.payout_status === 'processing') {
      return res.status(409).json({ error: 'Stripe payout is still processing.' });
    }

    const amt = Number(withdrawal.gross_requested_amount || withdrawal.amount) || 0;

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      // Only deduct balance now for legacy pending rows that were not held at request time.
      // New withdrawal requests already deduct the gross amount immediately.
      if (withdrawal.balance_deducted === false) {
        const { rowCount } = await dbClient.query(
          `UPDATE employees
           SET balance = ROUND((COALESCE(balance, 0)::numeric - $1::numeric), 2)::real
           WHERE id = $2 AND COALESCE(balance, 0)::numeric >= $1::numeric`,
          [amt, withdrawal.employee_id]
        );
        if (rowCount === 0) {
          await dbClient.query('ROLLBACK');
          return res.status(400).json({ error: 'Insufficient balance to approve this withdrawal.' });
        }
      }

      await dbClient.query(
        `UPDATE withdrawals
         SET status = 'paid',
             payout_status = 'paid',
             processed_at = NOW(),
             balance_deducted = TRUE
         WHERE id = $1`,
        [id]
      );
      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      dbClient.release();
    }

    const { rows: eRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [withdrawal.employee_id]);
    const employee = eRows[0];
    if (employee?.email) {
      sendEmail(employee.email, buildWithdrawalPaidEmail(employee, withdrawal)).catch(console.error);
    }
    logFromReq(req, {
      actorType: 'admin',
      action: 'withdrawal.paid',
      targetType: 'withdrawal',
      targetId: Number(id) || null,
      metadata: { employee_id: withdrawal.employee_id, amount: amt },
    });
    res.json({ success: true, message: 'Withdrawal marked as paid. Email sent.' });
  } catch (err) {
    console.error('[admin/withdrawals PATCH]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/withdrawals/:id/reject
   ══════════════════════════════════════════════════════ */
router.patch('/withdrawals/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { rows: wRows } = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    const withdrawal = wRows[0];
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending withdrawals can be rejected.' });
    }
    if (withdrawal.payout_method === 'stripe_connect' && withdrawal.payout_status === 'processing') {
      return res.status(409).json({ error: 'Stripe payout is still processing.' });
    }

    const amt = Number(withdrawal.gross_requested_amount || withdrawal.amount) || 0;
    const shouldRefund = withdrawal.balance_deducted !== false;
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await dbClient.query(
        `UPDATE withdrawals
         SET status = 'rejected',
             payout_status = 'rejected',
             processed_at = NOW(),
             balance_deducted = FALSE
         WHERE id = $1`,
        [id]
      );
      // Only refund if the gross withdrawal amount was already deducted from balance.
      if (shouldRefund) {
        await dbClient.query(
          `UPDATE employees
           SET balance = ROUND((COALESCE(balance, 0)::numeric + $1::numeric), 2)::real
           WHERE id = $2`,
          [amt, withdrawal.employee_id]
        );
      }
      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      dbClient.release();
    }

    const { rows: eRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [withdrawal.employee_id]);
    const employee = eRows[0];
    if (employee?.email) {
      sendEmail(employee.email, buildWithdrawalRejectedEmail(employee, withdrawal, reason)).catch(console.error);
    }
    logFromReq(req, {
      actorType: 'admin',
      action: 'withdrawal.reject',
      targetType: 'withdrawal',
      targetId: Number(id) || null,
      metadata: { employee_id: withdrawal.employee_id, amount: amt, reason: reason || null },
    });
    res.json({ success: true, message: 'Withdrawal rejected. Balance refunded. Email sent.' });
  } catch (err) {
    console.error('[admin/withdrawals/reject]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/withdrawals/:id/note → save internal admin note
   ══════════════════════════════════════════════════════ */
router.patch('/withdrawals/:id/note', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    // Ensure admin_note column exists
    try { await pool.query('ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_note TEXT'); } catch (_) {}
    await pool.query('UPDATE withdrawals SET admin_note = $1 WHERE id = $2', [note || '', id]);
    logFromReq(req, {
      actorType: 'admin',
      action: 'withdrawal.note',
      targetType: 'withdrawal',
      targetId: Number(id) || null,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/withdrawals/note]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/businesses
   ══════════════════════════════════════════════════════ */
router.get('/businesses', adminAuth, async (req, res) => {
  try {
    const { rows: businesses } = await pool.query(`
      SELECT b.id, b.business_name, b.business_type, b.logo_url, b.address, b.created_at, b.owner_id,
        e.full_name as owner_name, e.email as owner_email, e.country
      FROM businesses b
      LEFT JOIN employees e ON e.id = b.owner_id
    `);

    // Enrich with team count and total tips
    for (const biz of businesses) {
      const { rows: cRows } = await pool.query('SELECT COUNT(*) as c FROM team_members WHERE business_id = $1', [biz.id]);
      biz.team_count = Number(cRows[0]?.c) || 0;

      const { rows: sRows } = await pool.query(`
        SELECT COALESCE(SUM(p.amount),0) as s FROM payments p
        INNER JOIN team_members tm ON tm.employee_id = p.employee_id
        WHERE tm.business_id = $1
      `, [biz.id]);
      biz.total_tips = Number(sRows[0]?.s) || 0;
    }
    res.json({ businesses });
  } catch (err) {
    console.error('[admin/businesses]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   DELETE /api/admin/businesses/:id
   ══════════════════════════════════════════════════════ */
router.delete('/businesses/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM team_members WHERE business_id = $1', [req.params.id]);
    await pool.query('DELETE FROM businesses WHERE id = $1', [req.params.id]);
    logFromReq(req, {
      actorType: 'admin',
      action: 'business.delete',
      targetType: 'business',
      targetId: Number(req.params.id) || null,
    });
    res.json({ success: true, message: 'Business deleted.' });
  } catch (err) {
    console.error('[admin/businesses/delete]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/transactions
   ══════════════════════════════════════════════════════ */
router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const { range } = req.query; // today, week, month, all
    let dateFilter = '';
    if (range === 'today') dateFilter = "AND p.created_at::date = CURRENT_DATE";
    else if (range === 'week') dateFilter = "AND p.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    else if (range === 'month') dateFilter = "AND p.created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const { rows: transactions } = await pool.query(`
      SELECT p.id,
        COALESCE(p.original_amount, p.gross_amount, p.amount) AS amount,
        COALESCE(p.original_amount, p.gross_amount, p.amount) AS original_amount,
        COALESCE(p.original_currency, p.currency, e.currency, 'MAD') as original_currency,
        p.usd_amount, p.exchange_rate_used,
        p.stripe_payment_currency, p.stripe_payment_amount,
        p.platform_fee_amount, p.net_amount, p.payout_method,
        p.payment_method, p.created_at,
        COALESCE(p.original_currency, p.currency, e.currency, 'MAD') as currency,
        e.full_name, e.username
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE 1=1 ${dateFilter}
      ORDER BY p.created_at DESC
    `);

    const { rows: summaryRows } = await pool.query(`
      SELECT COUNT(*) as count,
        COALESCE(SUM(COALESCE(gross_amount, amount)),0) as total,
        0 as commission
      FROM payments p
      WHERE 1=1 ${dateFilter}
    `);
    const summary = summaryRows[0];

    res.json({
      transactions,
      totalVolume: Number(summary?.total) || 0,
      totalCommission: Number(summary?.commission) || 0,
      totalCount: Number(summary?.count) || 0,
    });
  } catch (err) {
    console.error('[admin/transactions]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/analytics
   ══════════════════════════════════════════════════════ */
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    const { rows: topEmployees } = await pool.query(`
      SELECT e.id, e.full_name, e.username, e.country, e.currency,
        COALESCE(SUM(COALESCE(p.gross_amount, p.amount)),0) as total_tips, COUNT(p.id) as tip_count
      FROM employees e
      LEFT JOIN payments p ON p.employee_id = e.id
      GROUP BY e.id
      ORDER BY total_tips DESC
      LIMIT 10
    `);

    const { rows: topCountriesByUsers } = await pool.query(`
      SELECT country, COUNT(*) as count
      FROM employees
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY count DESC
      LIMIT 5
    `);

    const { rows: topCountriesByTips } = await pool.query(`
      SELECT e.country, COALESCE(SUM(COALESCE(p.gross_amount, p.amount)),0) as total
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE e.country IS NOT NULL
      GROUP BY e.country
      ORDER BY total DESC
      LIMIT 5
    `);

    const { rows: avgTipRow } = await pool.query('SELECT COALESCE(AVG(COALESCE(gross_amount, amount)),0) as avg FROM payments');
    const avgTip = Number(avgTipRow[0]?.avg) || 0;

    const { rows: methodBreakdown } = await pool.query(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(COALESCE(gross_amount, amount)),0) as total
      FROM payments
      GROUP BY payment_method
    `);

    const { rows: peakHours } = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
      FROM payments
      GROUP BY hour
      ORDER BY hour
    `);

    res.json({
      topEmployees, topCountriesByUsers, topCountriesByTips,
      avgTip, methodBreakdown, peakHours,
    });
  } catch (err) {
    console.error('[admin/analytics]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
