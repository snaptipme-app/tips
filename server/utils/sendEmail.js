const nodemailer = require('nodemailer');

const FROM = () => `SnapTip <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

const COLORS = {
  primary: '#00C896',
  primaryDark: '#00A57A',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  border: '#e2e8f0',
  divider: '#f1f5f9',
  highlight: '#f0fdf4',
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
<body style="margin:0;padding:0;background-color:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${COLORS.card};border-radius:16px;border:1px solid ${COLORS.border};box-shadow:0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);overflow:hidden;">
          
          <!-- Top Accent Line -->
          <tr>
            <td height="4" style="background-color:${COLORS.primary};line-height:4px;font-size:4px;">&nbsp;</td>
          </tr>

          <!-- Header / Brand -->
          <tr>
            <td style="padding:32px 40px 24px;text-align:center;">
              <div style="font-size:24px;font-weight:800;color:${COLORS.text};letter-spacing:-0.5px;">
                <span style="color:${COLORS.primary};">⚡</span> SnapTip
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:0 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;font-weight:700;color:${COLORS.text};letter-spacing:-0.3px;text-align:center;">${heading}</h1>
              ${intro ? `<p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:${COLORS.muted};text-align:center;">${intro}</p>` : ''}
              
              <!-- Content Body -->
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;background-color:#fafafa;border-top:1px solid ${COLORS.border};text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${COLORS.faint};">Secure digital tipping platform</p>
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;width:100%;max-width:240px;">
    <tr>
      <td align="center" style="background-color:${COLORS.primary};border-radius:10px;">
        <a href="${href}" target="_blank" style="display:block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function codeBlock(code) {
  return `<div style="background-color:${COLORS.highlight};border:1px solid rgba(0,200,150,0.2);border-radius:12px;padding:20px;text-align:center;margin:24px 0;">
    <div style="font-size:13px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:8px;">Verification Code</div>
    <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:${COLORS.primary};font-family:'SF Mono',SFMono-Regular,Consolas,monospace;text-indent:8px;">${code}</div>
  </div>`;
}

function dataTable(rows) {
  const trs = rows.map(([label, value]) => `
    <tr>
      <td style="padding:14px 0;font-size:13px;color:${COLORS.muted};border-bottom:1px solid ${COLORS.divider};text-align:left;">${label}</td>
      <td style="padding:14px 0;font-size:14px;color:${COLORS.text};font-weight:600;border-bottom:1px solid ${COLORS.divider};text-align:right;">${value}</td>
    </tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fcfcfd;border-radius:12px;border:1px solid ${COLORS.border};padding:8px 20px;margin:24px 0;">
    ${trs}
  </table>`;
}

function amountBadge(amount, currency) {
  return `<div style="text-align:center;margin:8px 0 24px;">
    <div style="display:inline-block;background-color:${COLORS.highlight};border:1px solid rgba(0,200,150,0.15);border-radius:14px;padding:18px 32px;">
      <div style="font-size:12px;color:${COLORS.muted};margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Tip Amount</div>
      <div style="font-size:32px;font-weight:800;color:${COLORS.primary};letter-spacing:-0.5px;">${Number(amount).toFixed(2)} ${currency}</div>
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
    preheader: 'Welcome to SnapTip! Confirm your email address.',
    heading: 'Verify your email address',
    intro: 'Welcome to SnapTip! We are excited to help you get started. Please verify your email address to active your account.',
    body: `
      ${codeBlock(escapeHtml(code))}
      ${button('https://snaptip.me', 'Verify Email')}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};text-align:center;">
        This code expires in <strong style="color:${COLORS.text};">5 minutes</strong>. Never share this code with anyone.
      </p>
    `,
  });
}

function buildPasswordResetEmail({ code, resetUrl } = {}) {
  const targetUrl = resetUrl || 'https://snaptip.me/reset-password';
  return wrapEmail({
    preheader: 'Reset your SnapTip password',
    heading: 'Reset your password',
    intro: 'We received a request to reset your password. Use the verification code below in the app or click the button below to complete the reset.',
    body: `
      ${code ? codeBlock(escapeHtml(code)) : ''}
      ${button(targetUrl, 'Reset Password')}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};text-align:center;">
        This request expires in <strong style="color:${COLORS.text};">15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
      </p>
    `,
  });
}

function buildPaymentConfirmationEmail({ amount, currency = 'MAD', employeeName, businessName, transactionId, date } = {}) {
  return wrapEmail({
    preheader: `Thank you! Your tip of ${Number(amount || 0).toFixed(2)} ${currency} was sent.`,
    heading: 'Thank you for tipping!',
    intro: `Your tip has been successfully delivered${employeeName ? ` to <strong style="color:${COLORS.text};">${escapeHtml(employeeName)}</strong>` : ''}. Here is your official receipt.`,
    body: `
      ${amountBadge(amount || 0, escapeHtml(currency))}
      ${dataTable([
        ...(employeeName ? [['Recipient', escapeHtml(employeeName)]] : []),
        ...(businessName ? [['Business Name', escapeHtml(businessName)]] : []),
        ...(transactionId ? [['Transaction ID', `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:12px;color:${COLORS.muted};font-weight:500;">${escapeHtml(transactionId)}</span>`]] : []),
        ['Date & Time', formatDate(date)],
      ])}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};text-align:center;">
        Your generous support helps service industry staff everywhere. Thank you for using SnapTip!
      </p>
    `,
  });
}

function buildTipReceivedEmail({ amount, currency = 'MAD', senderName, dashboardUrl = 'https://snaptip.me' } = {}) {
  return wrapEmail({
    preheader: `Congratulations! You received a tip of ${Number(amount || 0).toFixed(2)} ${currency}.`,
    heading: 'You received a tip!',
    intro: senderName
      ? `<strong style="color:${COLORS.text};">${escapeHtml(senderName)}</strong> just sent you a tip for your excellent service. Keep up the amazing work!`
      : 'A customer just sent you a tip for your excellent service. Keep up the amazing work!',
    body: `
      ${amountBadge(amount || 0, escapeHtml(currency))}
      ${button(dashboardUrl, 'View Dashboard')}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};text-align:center;">
        Your balance has been updated instantly. You can request a withdrawal to your bank account anytime via the mobile app.
      </p>
    `,
  });
}

function buildStaffInvitationEmail({ businessName, managerName, inviteUrl } = {}) {
  return wrapEmail({
    preheader: `Join ${businessName || 'our business'} team on SnapTip.`,
    heading: `Join ${escapeHtml(businessName || 'our business')}`,
    intro: managerName
      ? `<strong style="color:${COLORS.text};">${escapeHtml(managerName)}</strong> has invited you to join <strong style="color:${COLORS.text};">${escapeHtml(businessName || 'their team')}</strong> on SnapTip so you can start receiving contactless, digital tips directly from customers.`
      : `You've been invited to join the team at <strong style="color:${COLORS.text};">${escapeHtml(businessName || 'a business')}</strong> on SnapTip and start receiving digital tips directly from customers.`,
    body: `
      ${dataTable([
        ['Business Name', escapeHtml(businessName || '—')],
        ...(managerName ? [['Invited By', escapeHtml(managerName)]] : []),
      ])}
      ${inviteUrl ? button(inviteUrl, 'Accept Invitation') : ''}
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${COLORS.muted};text-align:center;">
        Ready to start earning tips? Click the button above to accept your invitation and create your account.
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
