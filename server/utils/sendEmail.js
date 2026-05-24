const nodemailer = require('nodemailer');

const BRAND = {
  name: 'SnapTip',
  url: 'https://snaptip.me',
  logoUrl: 'https://snaptip.me/snaptip_icon.png',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@snaptip.me',
};

const COLORS = {
  background: '#f5f7f9',
  container: '#ffffff',
  primary: '#00C896',
  primaryDark: '#00a97f',
  text: '#111827',
  secondary: '#6b7280',
  tertiary: '#9ca3af',
  border: '#e5e7eb',
  soft: '#f9fafb',
  successSoft: '#edfdf7',
  warningSoft: '#fff8e8',
};

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

const FROM = () => `SnapTip <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

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

function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function absoluteUrl(url) {
  if (!url) return BRAND.url;
  return String(url);
}

function formatMoney(amount, currency = 'MAD') {
  const numeric = Number(amount || 0);
  return `${numeric.toFixed(2)} ${escapeHtml(currency)}`;
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function firstName(name) {
  const clean = String(name || '').trim();
  return clean ? clean.split(/\s+/)[0] : '';
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function hiddenPreheader(text) {
  if (!text) return '';
  return `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      ${escapeHtml(text)}
    </div>`;
}

function paragraph(content, options = {}) {
  const color = options.color || COLORS.secondary;
  const align = options.align || 'left';
  const margin = options.margin || '0 0 18px';
  return `<p style="margin:${margin};font-size:15px;line-height:1.65;color:${color};text-align:${align};">${content}</p>`;
}

function badge(label, tone = 'success') {
  const bg = tone === 'warning' ? COLORS.warningSoft : COLORS.successSoft;
  const color = tone === 'warning' ? '#946200' : COLORS.primaryDark;
  return `
    <div style="margin:0 0 22px;">
      <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:${bg};color:${color};font-size:12px;line-height:1;font-weight:700;border:1px solid rgba(0,0,0,0.04);">
        ${escapeHtml(label)}
      </span>
    </div>`;
}

function ctaButton(url, label) {
  const href = escapeHtml(absoluteUrl(url));
  const text = escapeHtml(label);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 24px;">
      <tr>
        <td align="center" bgcolor="${COLORS.primary}" style="border-radius:12px;background:${COLORS.primary};mso-padding-alt:15px 22px;">
          <a href="${href}" target="_blank" style="display:inline-block;min-width:176px;padding:15px 22px;border-radius:12px;color:#ffffff;background:${COLORS.primary};font-family:${FONT_STACK};font-size:15px;line-height:18px;font-weight:700;text-align:center;text-decoration:none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

function fallbackLink(url, label = 'If the button does not work, copy and paste this link into your browser:') {
  const href = escapeHtml(absoluteUrl(url));
  return `
    <div style="margin:24px 0 0;padding:16px;border-radius:12px;background:${COLORS.soft};border:1px solid ${COLORS.border};">
      <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${COLORS.tertiary};">${escapeHtml(label)}</p>
      <a href="${href}" target="_blank" style="word-break:break-all;color:${COLORS.primaryDark};font-size:12px;line-height:1.5;text-decoration:none;">${href}</a>
    </div>`;
}

function codeBlock(code, label = 'Verification code') {
  if (!code) return '';
  return `
    <div style="margin:22px 0;padding:16px 18px;border-radius:12px;background:${COLORS.soft};border:1px solid ${COLORS.border};text-align:center;">
      <div style="margin:0 0 8px;color:${COLORS.tertiary};font-size:11px;line-height:1;text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">${escapeHtml(label)}</div>
      <div style="color:${COLORS.text};font-size:26px;line-height:1.12;font-weight:750;letter-spacing:4px;font-family:'SF Mono',Consolas,Menlo,monospace;">${escapeHtml(code)}</div>
    </div>`;
}

function secureCodeBox(value, label = 'Secure code') {
  if (!value) return '';
  return `
    <div style="margin:22px 0;padding:16px 18px;border-radius:12px;background:${COLORS.soft};border:1px solid ${COLORS.border};text-align:center;">
      <div style="margin:0 0 8px;color:${COLORS.tertiary};font-size:11px;line-height:1;text-transform:uppercase;letter-spacing:1.2px;font-weight:700;">${escapeHtml(label)}</div>
      <div style="display:inline-block;padding:8px 10px;border-radius:8px;background:#ffffff;border:1px solid ${COLORS.border};color:${COLORS.text};font-size:19px;line-height:1.2;font-weight:700;letter-spacing:2px;font-family:'SF Mono',Consolas,Menlo,monospace;">${escapeHtml(value)}</div>
    </div>`;
}

function summaryCard(rows, options = {}) {
  const title = options.title ? `
    <tr>
      <td colspan="2" style="padding:0 0 12px;color:${COLORS.text};font-size:14px;line-height:1.3;font-weight:750;">
        ${escapeHtml(options.title)}
      </td>
    </tr>` : '';

  const body = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([label, value], index, filteredRows) => {
      const border = index === filteredRows.length - 1 ? 'none' : `1px solid ${COLORS.border}`;
      return `
        <tr>
          <td style="padding:13px 0;border-bottom:${border};color:${COLORS.secondary};font-size:13px;line-height:1.35;text-align:left;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:13px 0;border-bottom:${border};color:${COLORS.text};font-size:13px;line-height:1.35;font-weight:650;text-align:right;vertical-align:top;">${value}</td>
        </tr>`;
    }).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;padding:18px 20px;background:${COLORS.soft};border:1px solid ${COLORS.border};border-radius:16px;">
      ${title}
      ${body}
    </table>`;
}

function amountHero(amount, currency, label = 'Amount') {
  return `
    <div style="margin:26px 0;padding:24px 20px;border-radius:18px;background:${COLORS.successSoft};border:1px solid rgba(0,200,150,0.16);text-align:center;">
      <div style="margin:0 0 8px;color:${COLORS.primaryDark};font-size:12px;line-height:1;text-transform:uppercase;letter-spacing:1.2px;font-weight:750;">${escapeHtml(label)}</div>
      <div style="color:${COLORS.text};font-size:34px;line-height:1.1;font-weight:760;letter-spacing:-0.4px;">${formatMoney(amount, currency)}</div>
    </div>`;
}

function benefits(items) {
  const rows = items.map(item => `
    <tr>
      <td style="padding:6px 0;width:24px;vertical-align:top;color:${COLORS.primary};font-size:15px;line-height:20px;font-weight:700;">✓</td>
      <td style="padding:6px 0;color:${COLORS.secondary};font-size:14px;line-height:1.55;">${escapeHtml(item)}</td>
    </tr>`).join('');

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
      ${rows}
    </table>`;
}

function renderLayout({ preheader, title, eyebrow, children }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title || BRAND.name)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .email-pad { padding: 22px 14px !important; }
      .email-card { border-radius: 18px !important; }
      .email-header { padding: 22px 22px 14px !important; }
      .email-content { padding: 18px 22px 28px !important; }
      .email-heading { font-size: 23px !important; line-height: 1.18 !important; }
      .email-footer { padding: 22px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;text-size-adjust:100%;">
  ${hiddenPreheader(preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${COLORS.background};">
    <tr>
      <td align="center" class="email-pad" style="padding:44px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="width:100%;max-width:560px;background:${COLORS.container};border:1px solid ${COLORS.border};border-radius:18px;overflow:hidden;">
          <tr>
            <td class="email-header" style="padding:26px 42px 14px;text-align:center;">
              <div style="width:36px;height:36px;border-radius:9px;background:#000000;margin:0 auto 10px;overflow:hidden;">
                <img src="${escapeHtml(BRAND.logoUrl)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border-radius:9px;border:0;outline:none;text-decoration:none;">
              </div>
              <div style="margin:0;color:${COLORS.text};font-size:17px;line-height:1.2;font-weight:760;">SnapTip</div>
              <div style="margin:4px 0 0;color:${COLORS.tertiary};font-size:12px;line-height:1.4;">Digital tipping made effortless</div>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:18px 42px 34px;">
              ${eyebrow ? `<div style="margin:0 0 13px;color:${COLORS.primaryDark};font-size:13px;line-height:1.2;font-weight:750;">${escapeHtml(eyebrow)}</div>` : ''}
              <h1 class="email-heading" style="margin:0 0 14px;color:${COLORS.text};font-size:26px;line-height:1.2;font-weight:760;letter-spacing:-0.25px;">${escapeHtml(title)}</h1>
              ${children}
            </td>
          </tr>
          <tr>
            <td class="email-footer" style="padding:24px 42px 28px;border-top:1px solid ${COLORS.border};background:#fbfbfb;">
              <p style="margin:0 0 12px;color:${COLORS.secondary};font-size:13px;line-height:1.55;">
                Questions? Contact SnapTip support at <a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:${COLORS.text};text-decoration:none;">${escapeHtml(BRAND.supportEmail)}</a>.
              </p>
              <p style="margin:0;color:${COLORS.tertiary};font-size:12px;line-height:1.55;">
                This transactional email was sent by SnapTip. Please keep it for your records if it contains payment or account information.
              </p>
              <div style="height:1px;background:${COLORS.border};line-height:1px;font-size:1px;margin:18px 0;">&nbsp;</div>
              <p style="margin:0;color:${COLORS.tertiary};font-size:12px;line-height:1.55;">© 2026 SnapTip. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOTPEmail(code, options = {}) {
  const verificationUrl = absoluteUrl(options.verificationUrl || BRAND.url);
  return renderLayout({
    preheader: 'Welcome to SnapTip. Verify your email to finish setting up your account.',
    eyebrow: 'Welcome to SnapTip',
    title: 'Verify your email address',
    children: `
      ${paragraph('Thanks for joining SnapTip. Please verify your email address so we can keep your account secure and send important tipping updates.')}
      ${codeBlock(code)}
      ${ctaButton(verificationUrl, 'Verify Email')}
      ${paragraph('This verification expires in 5 minutes. For your security, never share this code or link with anyone.', { color: COLORS.secondary, margin: '0 0 12px' })}
      ${fallbackLink(verificationUrl)}
    `,
  });
}

function buildPasswordResetEmail({ code, resetUrl, requestedAt } = {}) {
  const targetUrl = absoluteUrl(resetUrl || `${BRAND.url}/reset-password`);
  const timestamp = requestedAt ? formatDate(requestedAt) : formatDate(new Date());

  return renderLayout({
    preheader: 'Use this secure link or code to reset your SnapTip password.',
    eyebrow: 'Account security',
    title: 'Reset your password',
    children: `
      ${paragraph('We received a request to reset the password for your SnapTip account. Use the button below or enter the code in the app to continue.')}
      ${codeBlock(code, 'Reset code')}
      ${ctaButton(targetUrl, 'Reset Password')}
      ${summaryCard([
        ['Requested at', escapeHtml(timestamp)],
        ['Expires in', '15 minutes'],
      ], { title: 'Security details' })}
      ${paragraph('If this was not you, do not click the button or share the code. Your current password will stay active, and you should contact support if you are concerned.', { color: COLORS.secondary })}
      ${fallbackLink(targetUrl)}
    `,
  });
}

function buildPaymentConfirmationEmail({
  amount,
  currency = 'MAD',
  employeeName,
  businessName,
  transactionId,
  date,
  paymentMethod,
  receiptUrl,
} = {}) {
  const safeEmployee = employeeName ? escapeHtml(employeeName) : 'your service professional';
  const targetUrl = absoluteUrl(receiptUrl || BRAND.url);

  return renderLayout({
    preheader: `Your ${formatMoney(amount, currency)} SnapTip payment was successful.`,
    eyebrow: 'Payment successful',
    title: 'Your tip was sent',
    children: `
      ${badge('Payment confirmed')}
      ${paragraph(`Your tip to <strong style="color:${COLORS.text};">${safeEmployee}</strong> was processed successfully. Here is a copy of your receipt.`)}
      ${amountHero(amount, currency, 'Tip amount')}
      ${summaryCard([
        ['Employee', safeEmployee],
        ['Business', businessName ? escapeHtml(businessName) : 'SnapTip partner'],
        ['Transaction ID', transactionId ? `<span style="font-family:'SF Mono',Consolas,Menlo,monospace;font-size:12px;">${escapeHtml(transactionId)}</span>` : 'Pending'],
        ['Payment date', escapeHtml(formatDate(date))],
        ['Payment method', paymentMethod ? escapeHtml(paymentMethod) : 'Card or wallet'],
      ], { title: 'Receipt summary' })}
      ${ctaButton(targetUrl, 'View Receipt')}
      ${paragraph('Thank you for recognizing great service. SnapTip helps hospitality teams receive tips securely without cash.', { margin: '0' })}
    `,
  });
}

function buildTipReceivedEmail({
  amount,
  currency = 'MAD',
  senderName,
  dashboardUrl = BRAND.url,
  businessName,
  date,
} = {}) {
  const senderFirstName = firstName(senderName);
  const senderCopy = senderFirstName ? `${escapeHtml(senderFirstName)} sent you a tip.` : 'A guest sent you a tip.';

  return renderLayout({
    preheader: `You received ${formatMoney(amount, currency)} on SnapTip.`,
    eyebrow: 'New tip received',
    title: 'A tip just arrived',
    children: `
      ${badge('Balance updated')}
      ${paragraph(`${senderCopy} Nice work. Your balance has been updated and the details are available in your dashboard.`)}
      ${amountHero(amount, currency, 'Amount received')}
      ${summaryCard([
        ['From', senderFirstName ? escapeHtml(senderFirstName) : 'Guest'],
        ['Business', businessName ? escapeHtml(businessName) : 'Your workplace'],
        ['Received', escapeHtml(formatDate(date))],
      ], { title: 'Quick summary' })}
      ${ctaButton(dashboardUrl, 'View Dashboard')}
      ${paragraph('Keep delivering the kind of service guests remember. We will keep your tips organized and easy to track.', { margin: '0' })}
    `,
  });
}

function buildStaffInvitationEmail({ businessName, managerName, inviteUrl, expiresIn = '7 days' } = {}) {
  const company = businessName || 'your team';
  const targetUrl = absoluteUrl(inviteUrl || BRAND.url);

  return renderLayout({
    preheader: `${company} invited you to join SnapTip.`,
    eyebrow: 'Staff invitation',
    title: `Join ${company} on SnapTip`,
    children: `
      ${paragraph(`${managerName ? `<strong style="color:${COLORS.text};">${escapeHtml(managerName)}</strong>` : 'A manager'} invited you to join <strong style="color:${COLORS.text};">${escapeHtml(company)}</strong> on SnapTip, a cashless tipping platform for hospitality teams.`)}
      ${benefits([
        'Receive tips through your personal QR code',
        'Track your balance, ratings, and tip history',
        'Cash out securely from the mobile app',
      ])}
      ${ctaButton(targetUrl, 'Accept Invitation')}
      ${paragraph(`This invitation expires in ${escapeHtml(expiresIn)}. If you were not expecting this invite, you can safely ignore this email.`, { color: COLORS.secondary, margin: '0 0 12px' })}
      ${fallbackLink(targetUrl)}
    `,
  });
}

function buildAdminPasswordResetEmail({ temporaryPassword, userName, loginUrl = BRAND.url, requestedAt } = {}) {
  const displayName = userName ? firstName(userName) : '';
  const timestamp = requestedAt ? formatDate(requestedAt) : formatDate(new Date());
  const targetUrl = absoluteUrl(loginUrl);

  return renderLayout({
    preheader: 'Your SnapTip password was reset. Use the temporary password to sign in.',
    eyebrow: 'Account security',
    title: 'Your password was reset',
    children: `
      ${paragraph(`${displayName ? `Hi ${escapeHtml(displayName)}, ` : ''}An administrator reset the password for your SnapTip account. Use the temporary password below to log in, then change it from your profile settings.`)}
      ${secureCodeBox(temporaryPassword, 'Temporary password')}
      ${summaryCard([
        ['Reset time', escapeHtml(timestamp)],
        ['Next step', 'Log in and choose a new password'],
      ], { title: 'Security details' })}
      ${ctaButton(targetUrl, 'Log in to SnapTip')}
      ${paragraph('If you did not request this, contact support immediately. Do not share this temporary password with anyone.', { color: COLORS.secondary, margin: '0 0 12px' })}
      ${fallbackLink(targetUrl, 'If the login button does not work, copy and paste this link into your browser:')}
    `,
  });
}

/**
 * Send a 6-digit OTP to verify a user's email.
 * @param {string} email Recipient
 * @param {string} code Plain-text 6-digit code (never stored; caller hashes)
 */
async function sendOTPEmail(email, code) {
  const html = buildOTPEmail(code);
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM(),
    to: email,
    subject: 'SnapTip - Verify your email',
    text: stripHtml(html),
    html,
  });
}

/**
 * Generic HTML sender kept for backwards compatibility with existing call sites.
 * @param {string} to Recipient
 * @param {string} subject Subject line
 * @param {string} html Full HTML body
 */
async function sendEmail(to, subject, html) {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: FROM(),
    to,
    subject,
    text: stripHtml(html),
    html,
  });
}

module.exports = {
  sendEmail,
  sendOTPEmail,
  buildOTPEmail,
  buildPasswordResetEmail,
  buildPaymentConfirmationEmail,
  buildTipReceivedEmail,
  buildStaffInvitationEmail,
  buildAdminPasswordResetEmail,
};
