const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/sendEmail');

// POST /api/support/contact — public, no auth required
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'name, email, subject, and message are all required.' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const html = `<!DOCTYPE html>
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
      <h2 style="color:#080818;font-size:24px;margin:0 0 16px;">New support message</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px;">
        You have received a new support request via the SnapTip app.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#888;font-size:14px;width:80px;">From</td>
          <td style="padding:8px 0;color:#080818;font-size:14px;font-weight:600;">${name}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;font-size:14px;">Email</td>
          <td style="padding:8px 0;color:#080818;font-size:14px;"><a href="mailto:${email}" style="color:#00C896;text-decoration:none;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;font-size:14px;">Subject</td>
          <td style="padding:8px 0;color:#080818;font-size:14px;font-weight:600;">${subject}</td>
        </tr>
      </table>

      <div style="background:#f5f5f7;border-radius:12px;padding:20px;">
        <p style="color:#444;font-size:14px;line-height:1.7;margin:0;white-space:pre-wrap;">${message}</p>
      </div>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;

    await sendEmail('snaptip.me@gmail.com', `[SnapTip Support] ${subject}`, html);

    console.log(`[support/contact] Message from ${name} <${email}>: ${subject}`);
    res.json({ success: true, message: 'Your message has been sent' });
  } catch (err) {
    console.error('[support/contact]', err.message);
    res.status(500).json({ error: 'Failed to send support message. Please try again later.' });
  }
});

module.exports = router;
