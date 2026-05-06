const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimit');
const { logFromReq } = require('../lib/audit');

/* ══════════════════════════════════════════════════════
   GET /api/split/search?q=<partial>
   Partial-match username search for autocomplete.
   Returns up to 5 results ordered: exact first, prefix
   matches second, substring matches last.
   Auth required.
   ══════════════════════════════════════════════════════ */
router.get('/search', authMiddleware, searchLimiter, async (req, res) => {
  try {
    const { q } = req.query;
    const senderId = req.employee.id;

    const cleaned = String(q || '').trim().toLowerCase().replace(/^@/, '');
    if (cleaned.length < 2) {
      return res.json({ results: [] });
    }

    const { rows } = await pool.query(
      `SELECT id, full_name, username, profile_image_url, photo_url, photo_base64, currency
       FROM employees
       WHERE LOWER(username) ILIKE $1
         AND id != $2
         AND deleted_at IS NULL
         AND is_suspended = 0
       ORDER BY
         CASE WHEN LOWER(username) = $3        THEN 0
              WHEN LOWER(username) LIKE $4      THEN 1
              ELSE 2 END,
         username ASC
       LIMIT 5`,
      [`%${cleaned}%`, senderId, cleaned, `${cleaned}%`]
    );

    const results = rows.map(u => ({
      id: u.id,
      fullName: u.full_name,
      username: u.username,
      profilePicture: u.photo_url || u.profile_image_url || null,
      photoBase64: u.photo_base64 || null,
      currency: u.currency || 'MAD',
    }));

    res.json({ results });
  } catch (err) {
    console.error('[split/search]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   GET /api/split/verify/:username
   Exact-match lookup kept for backwards compatibility.
   Auth required (only logged-in employees can search).
   ══════════════════════════════════════════════════════ */
router.get('/verify/:username', authMiddleware, searchLimiter, async (req, res) => {
  try {
    const { username } = req.params;
    const senderId = req.employee.id;

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username too short.' });
    }

    const cleaned = username.trim().toLowerCase().replace(/^@/, '');

    const { rows } = await pool.query(
      `SELECT id, full_name, username, profile_image_url, photo_url, photo_base64, currency
       FROM employees
       WHERE LOWER(username) = $1
         AND id != $2
         AND deleted_at IS NULL
         AND is_suspended = 0
       LIMIT 1`,
      [cleaned, senderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];
    res.json({
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      profilePicture: user.photo_url || user.profile_image_url || null,
      photoBase64: user.photo_base64 || null,
      currency: user.currency || 'MAD',
    });
  } catch (err) {
    console.error('[split/verify]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

/* ══════════════════════════════════════════════════════
   POST /api/split/send
   Atomic internal ledger transfer between two employees.
   NO real money moves — only database balance adjustments.
   ══════════════════════════════════════════════════════ */
router.post('/send', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const senderId = req.employee.id;
    const { recipientId, amount } = req.body;

    // ── Input validation ──
    if (!recipientId || !amount) {
      return res.status(400).json({ error: 'recipientId and amount are required.' });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }
    if (amt < 1) {
      return res.status(400).json({ error: 'Minimum split amount is 1.' });
    }
    if (senderId === Number(recipientId)) {
      return res.status(400).json({ error: 'You cannot split tips with yourself.' });
    }

    await client.query('BEGIN');

    // ── Lock sender row to prevent race conditions ──
    const { rows: senderRows } = await client.query(
      'SELECT id, balance, currency, full_name FROM employees WHERE id = $1 FOR UPDATE',
      [senderId]
    );
    if (senderRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sender not found.' });
    }

    const sender = senderRows[0];
    const senderBalance = Number(sender.balance);

    if (senderBalance < amt) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient balance. You have ${senderBalance.toFixed(2)} ${sender.currency}.`,
      });
    }

    // ── Lock recipient row ──
    const { rows: recipientRows } = await client.query(
      'SELECT id, balance, currency, full_name FROM employees WHERE id = $1 AND deleted_at IS NULL AND is_suspended = 0 FOR UPDATE',
      [recipientId]
    );
    if (recipientRows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipient not found or account is inactive.' });
    }

    const recipient = recipientRows[0];

    // ── Currency check — only allow same-currency splits ──
    if (sender.currency !== recipient.currency) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Currency mismatch. You use ${sender.currency} but ${recipient.full_name} uses ${recipient.currency}.`,
      });
    }

    // ── Debit sender ──
    await client.query(
      'UPDATE employees SET balance = balance - $1 WHERE id = $2',
      [amt, senderId]
    );

    // ── Credit recipient ──
    await client.query(
      'UPDATE employees SET balance = balance + $1 WHERE id = $2',
      [amt, recipientId]
    );

    // ── Record in payments table for audit trail ──
    // SPLIT_OUT for sender
    await client.query(
      `INSERT INTO payments (employee_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, 'split_out', 'completed', NOW())`,
      [senderId, -amt, sender.currency]
    );
    // SPLIT_IN for recipient
    await client.query(
      `INSERT INTO payments (employee_id, amount, currency, payment_method, status, created_at)
       VALUES ($1, $2, $3, 'split_in', 'completed', NOW())`,
      [recipientId, amt, sender.currency]
    );

    await client.query('COMMIT');

    // ── Audit log ──
    logFromReq(req, {
      actorType: 'employee',
      actorId: senderId,
      action: 'split.send',
      targetType: 'employee',
      targetId: Number(recipientId),
      metadata: { amount: amt, currency: sender.currency },
    });

    // ── Fetch updated sender balance ──
    const { rows: updatedSender } = await pool.query(
      'SELECT balance FROM employees WHERE id = $1',
      [senderId]
    );

    res.json({
      success: true,
      message: `${amt.toFixed(2)} ${sender.currency} sent to ${recipient.full_name}.`,
      newBalance: Number(updatedSender[0]?.balance ?? 0),
      recipientName: recipient.full_name,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[split/send]', err.message);
    res.status(500).json({ error: 'Server error during split.' });
  } finally {
    client.release();
  }
});

module.exports = router;
