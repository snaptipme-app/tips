const express = require('express');
const router = express.Router();
const { sendEmail, buildSupportRequestEmail } = require('../utils/sendEmail');

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

    const html = buildSupportRequestEmail({ name, email, subject, message });

    await sendEmail('snaptip.me@gmail.com', `[SnapTip Support] ${subject}`, html);

    console.log(`[support/contact] Message from ${name} <${email}>: ${subject}`);
    res.json({ success: true, message: 'Your message has been sent' });
  } catch (err) {
    console.error('[support/contact]', err.message);
    res.status(500).json({ error: 'Failed to send support message. Please try again later.' });
  }
});

module.exports = router;
