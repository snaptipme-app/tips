const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { pool } = require('../db');
const adminAuth = require('../middleware/adminAuth');

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

function buildWithdrawalRejectedEmail(employee, withdrawal, reason) {
  const cur = employee.currency || 'MAD';
  const amount = Number(withdrawal.amount).toFixed(2);
  const reasonBlock = reason ? `<p style="margin:12px 0 0;color:#ef4444;font-size:14px;font-weight:600;">Reason: ${reason}</p>` : '';
  return {
    subject: 'SnapTip — Withdrawal Request Update',
    html: `
      <div style="font-family:'Segoe UI',Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:560px;margin:auto;">
        <div style="text-align:center;margin-bottom:30px;">
          <div style="display:inline-block;background:rgba(239,68,68,0.15);border-radius:14px;padding:12px 14px;margin-bottom:10px;">
            <span style="font-size:22px;">&#9888;</span>
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
          ${reasonBlock}
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
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const { rows: tEmp } = await pool.query('SELECT COUNT(*) as count FROM employees');
    const totalEmployees = Number(tEmp[0]?.count) || 0;

    const { rows: tPay } = await pool.query('SELECT COUNT(*) as count FROM payments');
    const totalPayments = Number(tPay[0]?.count) || 0;

    const { rows: tTips } = await pool.query('SELECT COALESCE(SUM(amount),0) as sum FROM payments');
    const totalTips = Number(tTips[0]?.sum) || 0;

    const { rows: pWithCount } = await pool.query("SELECT COUNT(*) as count FROM withdrawals w INNER JOIN employees e ON e.id = w.employee_id WHERE w.status='pending' AND (e.is_suspended = 0 OR e.is_suspended IS NULL)");
    const pendingWithdrawals = Number(pWithCount[0]?.count) || 0;

    const { rows: pWithSum } = await pool.query("SELECT COALESCE(SUM(w.amount),0) as sum FROM withdrawals w INNER JOIN employees e ON e.id = w.employee_id WHERE w.status='pending' AND (e.is_suspended = 0 OR e.is_suspended IS NULL)");
    const pendingAmount = Number(pWithSum[0]?.sum) || 0;
    
    const commission = totalTips * 0.10;

    const { rows: recentPayments } = await pool.query(`
      SELECT p.id, p.amount, p.payment_method, p.created_at,
        e.full_name, e.username, e.currency
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      ORDER BY p.created_at DESC LIMIT 10
    `);

    const { rows: recentWithdrawals } = await pool.query(`
      SELECT w.id, w.amount, w.status, w.method, w.created_at,
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
    await pool.query('DELETE FROM payments WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM withdrawals WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM team_members WHERE employee_id = $1', [uid]);
    await pool.query('DELETE FROM invitations WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = $1)', [uid]);
    await pool.query('DELETE FROM businesses WHERE owner_id = $1', [uid]);
    await pool.query('DELETE FROM employees WHERE id = $1', [uid]);
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

    await sendEmail(user.email, {
      subject: 'SnapTip — Your password has been reset',
      html: `
        <div style="font-family:'Segoe UI',Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:560px;margin:auto;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:24px;font-weight:800;color:#fff;">SnapTip</div>
          </div>
          <h2 style="color:#fff;margin:0 0 12px;font-size:20px;">Hello ${user.first_name || user.full_name || 'there'},</h2>
          <p style="color:rgba(255,255,255,0.6);line-height:1.6;">Your SnapTip password has been reset by an admin.</p>
          <div style="background:rgba(108,108,255,0.1);border:1px solid rgba(108,108,255,0.2);border-radius:14px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Your new temporary password</p>
            <code style="font-size:24px;font-weight:700;color:#6c6cff;letter-spacing:2px;">${tempPw}</code>
          </div>
          <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;">Please login and change your password immediately.</p>
          <a href="https://snaptip.me" style="display:inline-block;margin-top:16px;background:#6c6cff;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">Login to SnapTip</a>
          <p style="font-size:12px;color:rgba(255,255,255,0.25);margin-top:28px;">Thank you for using SnapTip</p>
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
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { rows: withdrawals } = await pool.query(`
      SELECT
        w.id, w.amount, w.fee, w.net_amount, w.method,
        w.account_details, w.contact_phone, w.status, w.created_at,
        e.id as employee_id, e.full_name, e.username, e.email,
        e.country, e.currency
      FROM withdrawals w
      INNER JOIN employees e ON e.id = w.employee_id
      WHERE (e.is_suspended = 0 OR e.is_suspended IS NULL)
      ORDER BY w.created_at DESC
    `);
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
    const { rows: wRows } = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    const withdrawal = wRows[0];
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });
    if (withdrawal.status === 'paid') return res.status(400).json({ error: 'Already marked as paid.' });

    await pool.query("UPDATE withdrawals SET status = 'paid' WHERE id = $1", [id]);

    const { rows: eRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [withdrawal.employee_id]);
    const employee = eRows[0];
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
    const { reason } = req.body;
    const { rows: wRows } = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
    const withdrawal = wRows[0];
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' });

    // Refund balance
    await pool.query("UPDATE withdrawals SET status = 'rejected' WHERE id = $1", [id]);
    await pool.query('UPDATE employees SET balance = balance + $1 WHERE id = $2', [Number(withdrawal.amount), withdrawal.employee_id]);

    const { rows: eRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [withdrawal.employee_id]);
    const employee = eRows[0];
    if (employee?.email) {
      sendEmail(employee.email, buildWithdrawalRejectedEmail(employee, withdrawal, reason)).catch(console.error);
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
      SELECT p.id, p.amount, p.payment_method, p.created_at, p.currency as pay_currency,
        e.full_name, e.username, e.currency
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE 1=1 ${dateFilter}
      ORDER BY p.created_at DESC
    `);

    const { rows: summaryRows } = await pool.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total
      FROM payments p
      WHERE 1=1 ${dateFilter}
    `);
    const summary = summaryRows[0];

    res.json({
      transactions,
      totalVolume: Number(summary?.total) || 0,
      totalCommission: (Number(summary?.total) || 0) * 0.10,
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
        COALESCE(SUM(p.amount),0) as total_tips, COUNT(p.id) as tip_count
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
      SELECT e.country, COALESCE(SUM(p.amount),0) as total
      FROM payments p
      LEFT JOIN employees e ON e.id = p.employee_id
      WHERE e.country IS NOT NULL
      GROUP BY e.country
      ORDER BY total DESC
      LIMIT 5
    `);

    const { rows: avgTipRow } = await pool.query('SELECT COALESCE(AVG(amount),0) as avg FROM payments');
    const avgTip = Number(avgTipRow[0]?.avg) || 0;

    const { rows: methodBreakdown } = await pool.query(`
      SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount),0) as total
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
