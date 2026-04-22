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
    subject: 'SnapTip Verification Code',
    text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;background:#0a0f1e;color:#ffffff;">
        <h2 style="color:#00C896;margin-bottom:8px;">&#9889; SnapTip</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Here is your verification code:</p>
        <div style="background:#ffffff12;border:1px solid #ffffff20;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#00C896;">${code}</span>
        </div>
        <p style="color:#64748b;font-size:13px;">This code expires in <strong>5 minutes</strong>. Never share it with anyone.</p>
      </div>
    `,
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
