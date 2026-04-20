const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
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

/* ── Nodemailer transporter ── */
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendWithdrawalEmail(employee, withdrawal) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[email] SMTP not configured — skipping withdrawal email.');
    return;
  }
  try {
    const transporter = getTransporter();
    let details = withdrawal.account_details || '';
    try {
      const parsed = JSON.parse(details);
      details = Object.entries(parsed)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    } catch (_) { /* plain string */ }

    const html = `
      <div style="font-family:Inter,sans-serif;background:#080818;color:#fff;padding:40px;border-radius:16px;max-width:560px;margin:auto;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
          <span style="font-size:24px;font-weight:800;background:linear-gradient(135deg,#4facfe,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">⚡ SnapTip</span>
        </div>
        <h1 style="font-size:22px;font-weight:700;margin:0 0 8px;">Your withdrawal has been processed! 💸</h1>
        <p style="color:rgba(255,255,255,0.5);margin:0 0 32px;">Here's your payout summary.</p>

        <div style="background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.2);border-radius:14px;padding:24px;margin-bottom:24px;">
          <p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.5);">Hi ${employee.full_name || 'there'},</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:14px;">Requested Amount</td><td style="text-align:right;color:#fff;font-weight:600;">$${Number(withdrawal.amount).toFixed(2)}</td></tr>
            <tr><td style="padding:6px 0;color:rgba(255,255,255,0.5);font-size:14px;">Processing Fee</td><td style="text-align:right;color:#f59e0b;font-weight:600;">-$${Number(withdrawal.fee || 0).toFixed(2)}</td></tr>
            <tr style="border-top:1px solid rgba(255,255,255,0.08);">
              <td style="padding:10px 0 0;color:#00C896;font-size:16px;font-weight:700;">Net Amount Sent</td>
              <td style="text-align:right;color:#00C896;font-size:18px;font-weight:800;padding-top:10px;">$${Number(withdrawal.net_amount || withdrawal.amount).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.5px;">Payment Details</p>
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#fff;">${withdrawal.method}</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.4);">${details}</p>
        </div>

        <p style="font-size:12px;color:rgba(255,255,255,0.25);text-align:center;margin-top:32px;">
          Processed on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · SnapTip
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"SnapTip" <${process.env.SMTP_USER}>`,
      to: employee.email,
      subject: 'SnapTip — Your withdrawal has been processed! 💸',
      html,
    });
    console.log(`[email] Withdrawal receipt sent to ${employee.email}`);
  } catch (err) {
    console.error('[email] Failed to send withdrawal email:', err.message);
  }
}

/* ══════════════════════════════════════════════════════
   POST /api/admin/login
   ══════════════════════════════════════════════════════ */
router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({ error: 'Admin password not configured on server.' });
    }

    if (!password || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid admin password.' });
    }

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
   GET /api/admin/withdrawals
   ══════════════════════════════════════════════════════ */
router.get('/withdrawals', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const withdrawals = rowsToObjs(db.exec(`
      SELECT
        w.id, w.amount, w.fee, w.net_amount, w.method,
        w.account_details, w.contact_phone, w.status, w.created_at,
        e.id as employee_id, e.full_name, e.username, e.email
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
   PATCH /api/admin/withdrawals/:id/status   → mark as paid
   ══════════════════════════════════════════════════════ */
router.patch('/withdrawals/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const withdrawal = rowToObj(db.exec('SELECT * FROM withdrawals WHERE id = ?', [id]));
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found.' });
    }
    if (withdrawal.status === 'paid') {
      return res.status(400).json({ error: 'Withdrawal already marked as paid.' });
    }

    // Mark as paid (balance was already deducted at request time)
    db.run("UPDATE withdrawals SET status = 'paid' WHERE id = ?", [id]);
    saveDB();

    // Fetch employee for email
    const employee = rowToObj(db.exec('SELECT * FROM employees WHERE id = ?', [withdrawal.employee_id]));

    // Fire email asynchronously (don't block the response)
    if (employee && employee.email) {
      sendWithdrawalEmail(employee, withdrawal).catch(console.error);
    }

    res.json({ success: true, message: 'Withdrawal marked as paid. Email notification sent.' });
  } catch (err) {
    console.error('[admin/withdrawals PATCH]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/admin/stats   — quick dashboard numbers
   ══════════════════════════════════════════════════════ */
router.get('/stats', adminAuth, (req, res) => {
  try {
    const db = getDB();
    const totalEmployees = rowToObj(db.exec('SELECT COUNT(*) as count FROM employees'))?.count || 0;
    const totalPayments = rowToObj(db.exec('SELECT COUNT(*) as count FROM payments'))?.count || 0;
    const totalTips = rowToObj(db.exec('SELECT COALESCE(SUM(amount),0) as sum FROM payments'))?.sum || 0;
    const pendingWithdrawals = rowToObj(db.exec("SELECT COUNT(*) as count FROM withdrawals WHERE status='pending'"))?.count || 0;
    const pendingAmount = rowToObj(db.exec("SELECT COALESCE(SUM(amount),0) as sum FROM withdrawals WHERE status='pending'"))?.sum || 0;
    res.json({ totalEmployees, totalPayments, totalTips, pendingWithdrawals, pendingAmount });
  } catch (err) {
    console.error('[admin/stats]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
