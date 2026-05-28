const { sendEmail } = require('./sendEmail');

const BRAND = {
  name: 'SnapTip',
  logoUrl: 'https://snaptip.me/snaptip_icon.png?v=black-20260524',
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
  dangerSoft: '#fef2f2',
};

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif";

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

function firstName(name) {
  const clean = String(name || '').trim();
  return clean ? clean.split(/\s+/)[0] : '';
}

function formatMoney(amount, currency = 'MAD') {
  return `${Number(amount || 0).toFixed(2)} ${escapeHtml(currency)}`;
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

function paragraph(content, color = COLORS.secondary) {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:${color};">${content}</p>`;
}

function badge(label, tone = 'success') {
  const bg = tone === 'danger' ? COLORS.dangerSoft : tone === 'warning' ? COLORS.warningSoft : COLORS.successSoft;
  const color = tone === 'danger' ? '#b91c1c' : tone === 'warning' ? '#946200' : COLORS.primaryDark;
  return `
    <div style="margin:0 0 22px;">
      <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:${bg};color:${color};font-size:12px;line-height:1;font-weight:700;border:1px solid rgba(0,0,0,0.04);">
        ${escapeHtml(label)}
      </span>
    </div>`;
}

function amountHero(amount, currency, label) {
  return `
    <div style="margin:26px 0;padding:24px 20px;border-radius:18px;background:${COLORS.successSoft};border:1px solid rgba(0,200,150,0.16);text-align:center;">
      <div style="margin:0 0 8px;color:${COLORS.primaryDark};font-size:12px;line-height:1;text-transform:uppercase;letter-spacing:1.2px;font-weight:750;">${escapeHtml(label)}</div>
      <div style="color:${COLORS.text};font-size:34px;line-height:1.1;font-weight:760;letter-spacing:-0.4px;">${formatMoney(amount, currency)}</div>
    </div>`;
}

function summaryCard(rows, title = 'Payout summary') {
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
      <tr>
        <td colspan="2" style="padding:0 0 12px;color:${COLORS.text};font-size:14px;line-height:1.3;font-weight:750;">
          ${escapeHtml(title)}
        </td>
      </tr>
      ${body}
    </table>`;
}

function layout({ preheader, eyebrow, title, children }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${COLORS.background};">
    <tr>
      <td align="center" style="padding:44px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:${COLORS.container};border:1px solid ${COLORS.border};border-radius:18px;overflow:hidden;">
          <tr>
            <td style="padding:26px 42px 14px;text-align:center;">
              <div style="width:36px;height:36px;border-radius:9px;background:#000;margin:0 auto 10px;overflow:hidden;">
                <img src="${escapeHtml(BRAND.logoUrl)}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;">
              </div>
              <div style="margin:0;color:${COLORS.text};font-size:17px;line-height:1.2;font-weight:760;">${BRAND.name}</div>
              <div style="margin:4px 0 0;color:${COLORS.tertiary};font-size:12px;line-height:1.4;">Digital tipping made effortless</div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 42px 34px;">
              <div style="margin:0 0 13px;color:${COLORS.primaryDark};font-size:13px;line-height:1.2;font-weight:750;">${escapeHtml(eyebrow)}</div>
              <h1 style="margin:0 0 14px;color:${COLORS.text};font-size:26px;line-height:1.2;font-weight:760;letter-spacing:-0.25px;">${escapeHtml(title)}</h1>
              ${children}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 42px 28px;border-top:1px solid ${COLORS.border};background:#fbfbfb;text-align:center;">
              <p style="margin:0 auto 12px;color:${COLORS.secondary};font-size:13px;line-height:1.55;text-align:center;max-width:420px;">
                Questions? Contact SnapTip support at <a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:${COLORS.text};text-decoration:none;">${escapeHtml(BRAND.supportEmail)}</a>.
              </p>
              <p style="margin:0 auto;color:${COLORS.tertiary};font-size:12px;line-height:1.55;text-align:center;max-width:420px;">
                This transactional email was sent by SnapTip. Please keep it for your records.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function payoutRows(data, includeTransferId = false) {
  return [
    ['Withdrawal ID', data.withdrawalId ? `<span style="font-family:'SF Mono',Consolas,Menlo,monospace;font-size:12px;">${escapeHtml(data.withdrawalId)}</span>` : 'Pending'],
    ['Requested amount', formatMoney(data.grossAmount, data.currency)],
    ['SnapTip fee (10%)', formatMoney(data.platformFeeAmount, data.currency)],
    ['Net payout', formatMoney(data.netPayoutAmount, data.currency)],
    ['Payout method', escapeHtml(data.payoutMethod)],
    ['Stripe transfer', includeTransferId && data.stripeTransferId ? `<span style="font-family:'SF Mono',Consolas,Menlo,monospace;font-size:12px;">${escapeHtml(data.stripeTransferId)}</span>` : undefined],
    ['Date', escapeHtml(formatDate(data.date))],
  ];
}

function buildStripeConnectWithdrawalSuccessEmail(data = {}) {
  const name = firstName(data.employeeName);
  return layout({
    preheader: `Your ${formatMoney(data.netPayoutAmount, data.currency)} Stripe Express payout is on the way.`,
    eyebrow: 'Withdrawal completed',
    title: 'Your payout is on the way',
    children: `
      ${badge('Stripe Express payout sent')}
      ${paragraph(`${name ? `Hi ${escapeHtml(name)}, ` : ''}your withdrawal was successful. Your payout is on the way to your connected Stripe account.`)}
      ${amountHero(data.netPayoutAmount, data.currency, 'Net payout')}
      ${summaryCard(payoutRows({ ...data, payoutMethod: 'Stripe Express' }, true))}
      ${paragraph('Stripe may take additional time to make funds available depending on your connected account and bank.')}
    `,
  });
}

function buildStripeConnectWithdrawalFailedEmail(data = {}) {
  const name = firstName(data.employeeName);
  return layout({
    preheader: `Your ${formatMoney(data.grossAmount, data.currency)} withdrawal could not be completed. Funds were returned to your SnapTip balance.`,
    eyebrow: 'Withdrawal update',
    title: 'Your payout could not be completed',
    children: `
      ${badge('Balance restored', 'warning')}
      ${paragraph(`${name ? `Hi ${escapeHtml(name)}, ` : ''}we could not complete your Stripe Express payout. Your funds are safe and have been returned to your SnapTip balance.`)}
      ${amountHero(data.grossAmount, data.currency, 'Amount returned')}
      ${summaryCard([
        ['Withdrawal ID', data.withdrawalId ? `<span style="font-family:'SF Mono',Consolas,Menlo,monospace;font-size:12px;">${escapeHtml(data.withdrawalId)}</span>` : 'Pending'],
        ['Requested amount', formatMoney(data.grossAmount, data.currency)],
        ['Currency', escapeHtml(data.currency)],
        ['Status', 'Returned to SnapTip balance'],
        ['Date', escapeHtml(formatDate(data.date))],
      ], 'Withdrawal summary')}
      ${paragraph('Please try again later. If the issue continues, contact SnapTip support and we will help review your payout setup.')}
    `,
  });
}

function buildWiseManualWithdrawalRequestedEmail(data = {}) {
  const name = firstName(data.employeeName);
  return layout({
    preheader: `Your ${formatMoney(data.grossAmount, data.currency)} manual payout request was received.`,
    eyebrow: 'Manual payout request',
    title: 'We received your payout request',
    children: `
      ${badge('Manual review pending', 'warning')}
      ${paragraph(`${name ? `Hi ${escapeHtml(name)}, ` : ''}your manual payout request was received. SnapTip will review and process your payout manually.`)}
      ${amountHero(data.netPayoutAmount, data.currency, 'You receive')}
      ${summaryCard(payoutRows({ ...data, payoutMethod: data.payoutMethod || 'Manual bank transfer / Wise' }))}
      ${paragraph('Manual payouts are reviewed for accuracy and processed outside the app. We will notify you when the payout is completed.')}
    `,
  });
}

async function sendWithdrawalEmail(to, subject, html) {
  if (!to) return;
  await sendEmail(to, subject, html);
}

module.exports = {
  buildStripeConnectWithdrawalSuccessEmail,
  buildStripeConnectWithdrawalFailedEmail,
  buildWiseManualWithdrawalRequestedEmail,
  sendWithdrawalEmail,
};
