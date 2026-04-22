const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { getDB, saveDB } = require('../db');
const adminAuth = require('../middleware/adminAuth');

/* ── helpers ── */
function rowsToObjs(result) {
  if (!result || result.length === 0) return [];
  const cols = result[0].columns;
  return result[0].values.map(vals => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}
function rowToObj(result) {
  const rows = rowsToObjs(result);
  return rows[0] || null;
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
    subject: '✅ SnapTip — Your withdrawal has been processed!',
    html: `
      <div style="font-family:'Segoe UI',Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:560px;margin:auto;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="display:inline-block;background:linear-gradient(135deg,#00C896,#00ff66);border-radius:14px;padding:12px 14px;margin-bottom:10px;">
            <span style="font-size:22px;">⚡</span>
          </div>
          <div style="font-size:24px;font-weight:800;color:#fff;">SnapTip</div>
        </div>
        <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;">Great news, ${employee.first_name || employee.full_name || 'there'}! 🎉</h1>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 24px;text-align:center;">Your withdrawal request has been successfully processed.</p>

        <div style="background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:24px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:14px;">Amount Requested</td><td style="text-align:right;color:#fff;font-weight:600;">${amount} ${cur}</td></tr>
            <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);font-size:14px;">Fee</td><td style="text-align:right;color:#f59e0b;font-weight:600;">-${fee} ${cur}</td></tr>
            <tr style="border-top:1px solid rgba(255,255,255,0.08);">
              <td style="padding:12px 0 0;color:#00C896;font-size:16px;font-weight:700;">Amount Sent</td>
              <td style="text-align:right;color:#00C896;font-size:18px;font-weight:800;padding-top:12px;">${net} ${cur}</td>
            </tr>
          </table>
        </div>

        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#fff;">${withdrawal.method}</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">${details}</p>
          <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.4);">Date: ${date}</p>
        </div>

        <p style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center;margin-top:28px;">Thank you for using SnapTip</p>
      </div>
    `,
  };
}

function buildWithdrawalRejectedEmail(employee, withdrawal) {
  const cur = employee.currency || 'MAD';
  const amount = Number(withdrawal.amount).toFixed(2);
  return {
    subject: 'SnapTip — Withdrawal Request Update',
    html: `
      <div style="font-family:'Segoe UI',Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:560px;margin:auto;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="display:inline-block;background:rgba(239,68,68,0.15);border-radius:14px;padding:12px 14px;margin-bottom:10px;">
            <span style="font-size:22px;">⚠️</span>
          </div>
          <div style="font-size:24px;font-weight:800;color:#fff;">SnapTip</div>
        </div>
        <h1 style="font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;">Withdrawal Update</h1>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 24px;text-align:center;">Hi ${employee.first_name || employee.full_name || 'there'},</p>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:24px;margin-bottom:20px;">
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
            Unfortunately, your withdrawal request for <strong style="color:#fff;">${amount} ${cur}</strong> could not be processed at this time.
            Please contact support or submit a new request.
          </p>
        </div>
        <p style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center;margin-top:28px;">Thank you for using SnapTip</p>
      </div>
    `,
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
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return res.status(500).json({ error: 'Admin password not configured on server.' });
    if (!password || password !== adminPassword) return res.status(401).json({ error: 'Invalid admin password.' });

    const token = jwt.sign(
      { role: 'admin', iat: Math.floor(Date.now() / 1000) },
      process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET + '_admin',
      { expiresIn: '24h' }
    );
    res.json({ token, message: 'Admin authenticated.' });
  } catch (err) {
    console.error('[admin/login]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/stats — overview
   ══════════════════════════════════════════════════════ */
router.get('/stats', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const totalEmployees = rowToObj(db.exec('SELECT COUNT(*) as count FROM employees'))?.count || 0;
    const totalPayments = rowToObj(db.exec('SELECT COUNT(*) as count FROM payments'))?.count || 0;
    const totalTips = rowToObj(db.exec('SELECT COALESCE(SUM(amount),0) as sum FROM payments'))?.sum || 0;
    const pendingWithdrawals = rowToObj(db.exec("SELECT COUNT(*) as count FROM withdrawals WHERE status='pending'"))?.count || 0;
    const pendingAmount = rowToObj(db.exec("SELECT COALESCE(SUM(amount),0) as sum FROM withdrawals WHERE status='pending'"))?.sum || 0;
    const commission = totalTips * 0.10;

    // Recent payments
    const recentPayments = rowsToObjs(db.exec(`
      SELECT p.id, p.amount, p.payment_method, p.created_at,
        e.full_name, e.username, e.currency
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      ORDER BY p.created_at DESC LIMIT 10
    `));

    // Recent withdrawals
    const recentWithdrawals = rowsToObjs(db.exec(`
      SELECT w.id, w.amount, w.status, w.method, w.created_at,
        e.full_name, e.username, e.currency
      FROM withdrawals w
      LEFT JOIN employees e ON e.id = w.employee_id
      ORDER BY w.created_at DESC LIMIT 5
    `));

    // Growth: last 7 days registrations
    const growth = rowsToObjs(db.exec(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM employees
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY day
    `));

    // Growth: last 7 days tips
    const tipsGrowth = rowsToObjs(db.exec(`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM payments
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY day
    `));

    res.json({
      totalEmployees, totalPayments, totalTips, pendingWithdrawals,
      pendingAmount, commission, recentPayments, recentWithdrawals,
      growth, tipsGrowth,
    });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/users
   ══════════════════════════════════════════════════════ */
router.get('/users', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const users = rowsToObjs(db.exec(`
      SELECT id, username, full_name, first_name, last_name, email,
        account_type, country, currency, balance, created_at,
        is_suspended, photo_base64, profile_image_url, job_title
      FROM employees
      ORDER BY created_at DESC
    `));
    res.json({ users });
  } catch (err) {
    console.error('[admin/users]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/users/:id/suspend
   ══════════════════════════════════════════════════════ */
router.patch('/users/:id/suspend', adminAuth, (req, res) => {
  try {
    const db = getDB();
    db.run('UPDATE employees SET is_suspended = 1 WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ success: true, message: 'User suspended.' });
  } catch (err) {
    console.error('[admin/users/suspend]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/users/:id/reactivate
   ══════════════════════════════════════════════════════ */
router.patch('/users/:id/reactivate', adminAuth, (req, res) => {
  try {
    const db = getDB();
    db.run('UPDATE employees SET is_suspended = 0 WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ success: true, message: 'User reactivated.' });
  } catch (err) {
    console.error('[admin/users/reactivate]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   DELETE /api/admin/users/:id
   ══════════════════════════════════════════════════════ */
router.delete('/users/:id', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const uid = req.params.id;
    // Delete related data
    try { db.run('DELETE FROM payments WHERE employee_id = ?', [uid]); } catch (_) {}
    try { db.run('DELETE FROM withdrawals WHERE employee_id = ?', [uid]); } catch (_) {}
    try { db.run('DELETE FROM team_members WHERE employee_id = ?', [uid]); } catch (_) {}
    db.run('DELETE FROM employees WHERE id = ?', [uid]);
    saveDB();
    res.json({ success: true, message: 'User and related data deleted.' });
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
    const db = getDB();
    const user = rowToObj(db.exec('SELECT * FROM employees WHERE id = ?', [req.params.id]));
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Generate temp password
    const tempPw = 'Snap' + Math.random().toString(36).slice(2, 8);
    const hash = await bcrypt.hash(tempPw, 10);
    db.run('UPDATE employees SET password = ? WHERE id = ?', [hash, req.params.id]);
    saveDB();

    // Send email
    await sendEmail(user.email, {
      subject: 'SnapTip — Your password has been reset',
      html: `
        <div style="font-family:Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:500px;margin:auto;">
          <h2 style="color:#fff;margin:0 0 16px;">Password Reset</h2>
          <p style="color:rgba(255,255,255,0.6);">Your password has been reset by an admin. Your temporary password is:</p>
          <div style="background:rgba(108,108,255,0.1);border:1px solid rgba(108,108,255,0.2);border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
            <code style="font-size:20px;font-weight:700;color:#6c6cff;">${tempPw}</code>
          </div>
          <p style="color:rgba(255,255,255,0.4);font-size:13px;">Please change this after logging in.</p>
        </div>
      `,
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
router.get('/withdrawals', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const withdrawals = rowsToObjs(db.exec(`
      SELECT
        w.id, w.amount, w.fee, w.net_amount, w.method,
        w.account_details, w.contact_phone, w.status, w.created_at,
        e.id as employee_id, e.full_name, e.username, e.email,
        e.country, e.currency
      FROM withdrawals w
      INNER JOIN employees e ON e.id = w.employee_id
      ORDER BY w.created_at DESC
    `));
    res.json({ withdrawals });
  } catch (err) {
    console.error('[admin/withdrawals GET]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   PATCH /api/admin/withdrawals/:id/status → mark as paid
   ══════════════════════════════════════════════════════ */
router.patch('/withdrawals/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const withdrawal = rowToObj(db.exec('SELECT * FROM withdrawals WHERE id = ?', [id]));
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status === 'paid') return res.status(400).json({ error: 'Already marked as paid.' });

    db.run("UPDATE withdrawals SET status = 'paid' WHERE id = ?", [id]);
    saveDB();

    const employee = rowToObj(db.exec('SELECT * FROM employees WHERE id = ?', [withdrawal.employee_id]));
    if (employee?.email) {
      sendEmail(employee.email, buildWithdrawalPaidEmail(employee, withdrawal)).catch(console.error);
    }
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
    const db = getDB();
    const withdrawal = rowToObj(db.exec('SELECT * FROM withdrawals WHERE id = ?', [id]));
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

    // Refund balance
    db.run("UPDATE withdrawals SET status = 'rejected' WHERE id = ?", [id]);
    db.run('UPDATE employees SET balance = balance + ? WHERE id = ?', [Number(withdrawal.amount), withdrawal.employee_id]);
    saveDB();

    const employee = rowToObj(db.exec('SELECT * FROM employees WHERE id = ?', [withdrawal.employee_id]));
    if (employee?.email) {
      sendEmail(employee.email, buildWithdrawalRejectedEmail(employee, withdrawal)).catch(console.error);
    }
    res.json({ success: true, message: 'Withdrawal rejected. Balance refunded. Email sent.' });
  } catch (err) {
    console.error('[admin/withdrawals/reject]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/businesses
   ══════════════════════════════════════════════════════ */
router.get('/businesses', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const businesses = rowsToObjs(db.exec(`
      SELECT b.id, b.business_name, b.business_type, b.logo_url, b.address, b.created_at, b.owner_id,
        e.full_name as owner_name, e.email as owner_email, e.country
      FROM businesses b
      LEFT JOIN employees e ON e.id = b.owner_id
    `));

    // Enrich with team count and total tips
    for (const biz of businesses) {
      const teamCount = rowToObj(db.exec('SELECT COUNT(*) as c FROM team_members WHERE business_id = ?', [biz.id]))?.c || 0;
      const totalTips = rowToObj(db.exec(`
        SELECT COALESCE(SUM(p.amount),0) as s FROM payments p
        INNER JOIN team_members tm ON tm.employee_id = p.employee_id
        WHERE tm.business_id = ?
      `, [biz.id]))?.s || 0;
      biz.team_count = teamCount;
      biz.total_tips = totalTips;
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
router.delete('/businesses/:id', adminAuth, (req, res) => {
  try {
    const db = getDB();
    db.run('DELETE FROM team_members WHERE business_id = ?', [req.params.id]);
    db.run('DELETE FROM businesses WHERE id = ?', [req.params.id]);
    saveDB();
    res.json({ success: true, message: 'Business deleted.' });
  } catch (err) {
    console.error('[admin/businesses/delete]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/transactions
   ══════════════════════════════════════════════════════ */
router.get('/transactions', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const { range } = req.query; // today, week, month, all
    let dateFilter = '';
    if (range === 'today') dateFilter = "AND DATE(p.created_at) = DATE('now')";
    else if (range === 'week') dateFilter = "AND p.created_at >= DATE('now', '-7 days')";
    else if (range === 'month') dateFilter = "AND p.created_at >= DATE('now', '-30 days')";

    const transactions = rowsToObjs(db.exec(`
      SELECT p.id, p.amount, p.payment_method, p.created_at, p.currency as pay_currency,
        e.full_name, e.username, e.currency
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE 1=1 ${dateFilter}
      ORDER BY p.created_at DESC
    `));

    const summary = rowToObj(db.exec(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total
      FROM payments p
      WHERE 1=1 ${dateFilter}
    `));

    res.json({
      transactions,
      totalVolume: summary?.total || 0,
      totalCommission: (summary?.total || 0) * 0.10,
      totalCount: summary?.count || 0,
    });
  } catch (err) {
    console.error('[admin/transactions]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/analytics
   ══════════════════════════════════════════════════════ */
router.get('/analytics', adminAuth, (req, res) => {
  try {
    const db = getDB();

    // Top 10 employees by tips
    const topEmployees = rowsToObjs(db.exec(`
      SELECT e.id, e.full_name, e.username, e.country, e.currency,
        COALESCE(SUM(p.amount),0) as total_tips, COUNT(p.id) as tip_count
      FROM employees e
      LEFT JOIN payments p ON p.employee_id = e.id
      GROUP BY e.id
      ORDER BY total_tips DESC
      LIMIT 10
    `));

    // Top 5 countries by user count
    const topCountriesByUsers = rowsToObjs(db.exec(`
      SELECT country, COUNT(*) as count
      FROM employees
      WHERE country IS NOT NULL AND country != ''
      GROUP BY country
      ORDER BY count DESC
      LIMIT 5
    `));

    // Top 5 countries by tip volume
    const topCountriesByTips = rowsToObjs(db.exec(`
      SELECT e.country, COALESCE(SUM(p.amount),0) as total
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE e.country IS NOT NULL
      GROUP BY e.country
      ORDER BY total DESC
      LIMIT 5
    `));

    // Average tip amount
    const avgTip = rowToObj(db.exec('SELECT COALESCE(AVG(amount),0) as avg FROM payments'))?.avg || 0;

    // Payment method breakdown
    const methodBreakdown = rowsToObjs(db.exec(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount),0) as total
      FROM payments
      GROUP BY payment_method
    `));

    // Peak hours
    const peakHours = rowsToObjs(db.exec(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
      FROM payments
      GROUP BY hour
      ORDER BY hour
    `));

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
