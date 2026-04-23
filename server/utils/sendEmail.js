const nodemailer = require('nodemailer');

const FROM = () => `SnapTip <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;

/**
 * Reusable transporter — Brevo SMTP relay.
 * Credentials: EMAIL_USER (Brevo login), EMAIL_PASS (Brevo SMTP key).
 */
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

/**
 * Send a 6-digit OTP to the user's email address.
 * @param {string} email  Recipient email
 * @param {string} code   Plain-text 6-digit OTP (never stored; caller hashes before DB)
 */
async function sendOTPEmail(email, code) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: FROM(),
    to: email,
    subject: 'SnapTip — Your verification code',
    text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <div style="background:#080818;padding:32px;text-align:center;">
      <img src="http://156.67.28.181:5000/assets/images/snaptip_icon.png" width="56" height="56" alt="SnapTip Logo" style="display:inline-block;border-radius:12px;" />
      <h1 style="color:white;font-size:22px;margin:12px 0 0;">SnapTip</h1>
    </div>

    <div style="padding:40px 32px;">
      <h2 style="color:#080818;font-size:24px;margin:0 0 16px;">Your verification code</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 28px;">
        Use this code to verify your email address. Never share it with anyone.
      </p>

      <div style="background:#f0fdf9;border:2px solid #00C896;border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
        <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#00C896;">${code}</span>
      </div>

      <p style="color:#888;font-size:14px;margin:0;text-align:center;">
        Expires in <strong style="color:#080818;">5 minutes</strong>
      </p>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`,
  });
}

/**
 * Send a generic HTML email (used for invitations, etc.)
 * @param {string} to       Recipient email
 * @param {string} subject  Email subject
 * @param {string} html     Full HTML body
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

module.exports = { sendOTPEmail, sendEmail };
