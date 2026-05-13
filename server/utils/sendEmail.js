const nodemailer = require('nodemailer');

const FROM = () => `SnapTip <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

const COLORS = {
  primary: '#00C896',
  primaryDark: '#00A57A',
  bg: '#f4f5f7',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e5e7eb',
  divider: '#eef0f3',
  highlight: '#f0fdf9',
};

function createTransporter() {
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

/* ─────────────────────────── shared shell ─────────────────────────── */

function wrapEmail({ preheader = '', heading, intro = '', body = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>SnapTip</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLORS.card};border-radius:16px;box-shadow:0 1px 3px rgba(15,23,42,0.04),0 8px 24px rgba(15,23,42,0.06);overflow:hidden;">

          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid ${COLORS.divider};">
              <div style="font-size:22px;font-weight:800;color:${COLORS.text};letter-spacing:-0.2px;">
                <span style="color:${COLORS.primary};">&#9889;</span> SnapTip
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 32px 8px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;color:${COLORS.text};letter-spacing:-0.3px;">${heading}</h1>
              ${intro ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLORS.muted};">${intro}</p>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding:0 32px 36px;">
              ${body}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background:${COLORS.bg};border-top:1px solid ${COLORS.divider};text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${COLORS.faint};">Secure payments powered by SnapTip</p>
              <p style="margin:0;font-size:12px;color:${COLORS.faint};">&copy; 2026 SnapTip. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 4px;">
    <tr>
      <td align="center" style="background:${COLORS.primary};border-radius:999px;">
        <a href="${href}" style="display:inline-block;padding:15px 36px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function codeBlock(code) {
  return `<div style="background:${COLORS.highlight};border:1.5px solid ${COLORS.primary};border-radius:14px;padding:24px;text-align:center;margin:0 0 20px;">
    <div style="font-size:36px;font-weight:700;letter-spacing:10px;color:${COLORS.primary};font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</div>
  </div>`;
}

function dataTable(rows) {
  const trs = rows.map(([label, value]) => `
    <tr>
      <td style="padding:12px 0;font-size:13px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.divider};width:40%;">${label}</td>
      <td style="padding:12px 0;font-size:14px;color:${COLORS.text};font-weight:600;border-bottom:1px solid ${COLORS.divider};text-align:right;">${value}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafbfc;border-radius:12px;padding:4px 18px;margin:0 0 24px;">
    ${trs}
  </table>`;
}

function amountBadge(amount, currency) {
  return `<div style="text-align:center;margin:0 0 28px;">
    <div style="display:inline-block;background:${COLORS.highlight};border-radius:14px;padding:20px 32px;">
      <div style="font-size:13px;color:${COLORS.muted};margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Amount</div>
      <div style="font-size:36px;font-weight:800;color:${COLORS.primary};letter-spacing:-0.5px;">${Number(amount).toFixed(2)} ${currency}</div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function formatDate(d) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleString('en-US', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ─────────────────────────── builders ─────────────────────────── */

function buildOTPEmail(code) {
  return wrapEmail({
    preheader: 'Your SnapTip verification code',
    heading: 'Verify your email',
    intro: 'Welcome to SnapTip! Use the code below to confirm your email address and finish setting up your account.',
    body: `
      ${codeBlock(escapeHtml(code))}
      <p style="margin:0;font-size:13px;color:${COLORS.muted};text-align:center;">
        This code expires in <strong style="color:${COLORS.text};">5 minutes</strong>. Never share it with anyone.
      </p>
    `,
  });
}

function buildPasswordResetEmail({ code, resetUrl } = {}) {
  return wrapEmail({
    preheader: 'Reset your SnapTip password',
    heading: 'Reset your password',
    intro: 'We received a request to reset your password. Enter the code below in the app to continue.',
    body: `
      ${code ? codeBlock(escapeHtml(code)) : ''}
      ${resetUrl ? button(resetUrl, 'Reset Password') : ''}
      <p style="margin:18px 0 0;font-size:13px;color:${COLORS.muted};text-align:center;">
        This code expires in <strong style="color:${COLORS.text};">15 minutes</strong>.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:${COLORS.faint};text-align:center;">
        Didn't request this? You can safely ignore this email.
      </p>
    `,
  });
}

function buildPaymentConfirmationEmail({ amount, currency = 'MAD', employeeName, businessName, transactionId, date } = {}) {
  return wrapEmail({
    preheader: `Your tip of ${Number(amount || 0).toFixed(2)} ${currency} was sent`,
    heading: 'Thank you for tipping!',
    intro: `Your tip was successfully delivered${employeeName ? ` to <strong style="color:${COLORS.text};">${escapeHtml(employeeName)}</strong>` : ''}. Here's your receipt.`,
    body: `
      ${amountBadge(amount || 0, escapeHtml(currency))}
      ${dataTable([
        ...(employeeName ? [['Recipient', escapeHtml(employeeName)]] : []),
        ...(businessName ? [['Business', escapeHtml(businessName)]] : []),
        ...(transactionId ? [['Transaction', `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12px;color:${COLORS.muted};font-weight:500;">${escapeHtml(transactionId)}</span>`]] : []),
        ['Date', formatDate(date)],
      ])}
      <p style="margin:0;font-size:13px;color:${COLORS.muted};text-align:center;">
        Keep this email as your receipt. Thank you for supporting service workers around the world.
      </p>
    `,
  });
}

function buildTipReceivedEmail({ amount, currency = 'MAD', senderName, dashboardUrl = 'https://snaptip.me' } = {}) {
  return wrapEmail({
    preheader: `You received ${Number(amount || 0).toFixed(2)} ${currency}`,
    heading: 'You received a tip!',
    intro: senderName
      ? `<strong style="color:${COLORS.text};">${escapeHtml(senderName)}</strong> just sent you a tip. Nice work.`
      : 'A customer just sent you a tip. Nice work.',
    body: `
      ${amountBadge(amount || 0, escapeHtml(currency))}
      ${button(dashboardUrl, 'View Dashboard')}
      <p style="margin:20px 0 0;font-size:13px;color:${COLORS.muted};text-align:center;">
        Your balance has been updated. You can request a withdrawal anytime from the app.
      </p>
    `,
  });
}

function buildStaffInvitationEmail({ businessName, managerName, inviteUrl } = {}) {
  return wrapEmail({
    preheader: `You've been invited to join ${businessName || 'a business'} on SnapTip`,
    heading: `You're invited to join ${escapeHtml(businessName || 'a business')}`,
    intro: managerName
      ? `<strong style="color:${COLORS.text};">${escapeHtml(managerName)}</strong> invited you to join <strong style="color:${COLORS.text};">${escapeHtml(businessName || 'their team')}</strong> on SnapTip and start receiving digital tips from customers.`
      : `You've been invited to join <strong style="color:${COLORS.text};">${escapeHtml(businessName || 'a business')}</strong> on SnapTip and start receiving digital tips from customers.`,
    body: `
      ${dataTable([
        ['Business', escapeHtml(businessName || '—')],
        ...(managerName ? [['Invited by', escapeHtml(managerName)]] : []),
      ])}
      ${inviteUrl ? button(inviteUrl, 'Accept Invitation') : ''}
      <p style="margin:20px 0 0;font-size:13px;color:${COLORS.muted};text-align:center;">
        This invitation stays valid until you join or the manager revokes it.
      </p>
    `,
  });
}

/* ─────────────────────────── public senders ─────────────────────────── */

/**
 * Send a 6-digit OTP to verify a user's email.
 * @param {string} email Recipient
 * @param {string} code  Plain-text 6-digit code (never stored; caller hashes)
 */
async function sendOTPEmail(email, code) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM(),
    to: email,
    subject: 'SnapTip — Verify your email',
    text: `Your SnapTip verification code is: ${code}\n\nThis code expires in 5 minutes. Never share it with anyone.`,
    html: buildOTPEmail(code),
  });
}

/**
 * Generic HTML sender — kept for backwards compatibility with existing call
 * sites in business.js, employee.js, auth.js, support.js.
 * @param {string} to       Recipient
 * @param {string} subject  Subject line
 * @param {string} html     Full HTML body (use builders above)
 */
async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM(),
    to,
    subject,
    html,
  });
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  // template builders (callers compose subject + html, then send via sendEmail)
  buildOTPEmail,
  buildPasswordResetEmail,
  buildPaymentConfirmationEmail,
  buildTipReceivedEmail,
  buildStaffInvitationEmail,
};
