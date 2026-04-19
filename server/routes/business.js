const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/sendEmail');

/* ── Helper: map sql.js result to array of objects ── */
function rowsToObjs(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((vals) => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = vals[i]; });
    return obj;
  });
}
function rowToObj(result) {
  const rows = rowsToObjs(result);
  return rows.length ? rows[0] : null;
}

/* ── Helper: find the business owned by the logged-in employee ── */
function getOwnedBusiness(db, ownerId) {
  return rowToObj(db.exec('SELECT * FROM businesses WHERE owner_id = ?', [ownerId]));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create', authMiddleware, (req, res) => {
  try {
    const { business_name, business_type, logo_url = '', address = '' } = req.body;
    const ownerId = req.employee.id;
    const db = getDB();

    if (!business_name || !business_type) {
      return res.status(400).json({ error: 'business_name and business_type are required.' });
    }

    // One business per owner
    const existing = getOwnedBusiness(db, ownerId);
    if (existing) {
      return res.status(409).json({ error: 'You already have a business account.', business: existing });
    }

    db.run(
      'INSERT INTO businesses (owner_id, business_name, business_type, logo_url, address) VALUES (?, ?, ?, ?, ?)',
      [ownerId, business_name.trim(), business_type.trim(), logo_url.trim(), address.trim()]
    );
    saveDB();

    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const id = idResult[0].values[0][0];

    console.log(`[business] Created business "${business_name}" (id=${id}) for owner ${ownerId}`);
    res.status(201).json({ success: true, business_id: id, business_name, business_type });
  } catch (err) {
    console.error('[business/create]', err.message);
    res.status(500).json({ error: 'Server error creating business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);

    if (!business) {
      return res.status(404).json({ error: 'No business found for this account.' });
    }

    const memberCount = rowToObj(
      db.exec('SELECT COUNT(*) as count FROM team_members WHERE business_id = ?', [business.id])
    )?.count ?? 0;

    const totalTipsRes = rowToObj(
      db.exec(
        `SELECT COALESCE(SUM(p.amount), 0) as total
         FROM payments p
         INNER JOIN team_members tm ON tm.employee_id = p.employee_id
         WHERE tm.business_id = ?`,
        [business.id]
      )
    );
    const total_tips = totalTipsRes?.total ?? 0;

    console.log(`[business/me] owner=${req.employee.id}, business_id=${business.id}`);
    res.json({ business, stats: { member_count: memberCount, total_tips } });
  } catch (err) {
    console.error('[business/me]', err.message);
    res.status(500).json({ error: 'Server error fetching business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/invite
// ─────────────────────────────────────────────────────────────────────────────
router.post('/invite', authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const db = getDB();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const normalizedEmail = email.trim().toLowerCase();

    db.run(
      'INSERT INTO invitations (business_id, email, token) VALUES (?, ?, ?)',
      [business.id, normalizedEmail, token]
    );
    saveDB();

    // Send invite email (fire-and-forget)
    const inviteUrl = `${process.env.CLIENT_URL || 'https://snaptip.me'}/join/${token}`;
    try {
      await sendOTPEmail(normalizedEmail, `You're invited to join ${business.business_name} on SnapTip`, `
        <p>You have been invited to join <strong>${business.business_name}</strong> on SnapTip.</p>
        <p>Click below to accept the invitation:</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6c6cff;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">Accept Invitation</a>
        <p style="color:#999;font-size:12px;margin-top:16px;">Or copy this link: ${inviteUrl}</p>
      `);
    } catch (emailErr) {
      console.warn('[business/invite] Email send failed:', emailErr.message);
    }

    console.log(`[business/invite] Invited ${normalizedEmail} to business_id=${business.id}, token=${token}`);
    res.json({ success: true, message: `Invitation sent to ${normalizedEmail}`, token });
  } catch (err) {
    console.error('[business/invite]', err.message);
    res.status(500).json({ error: 'Server error sending invitation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/members
// ─────────────────────────────────────────────────────────────────────────────
router.get('/members', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);

    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const members = rowsToObjs(db.exec(
      `SELECT
         tm.id as member_id,
         tm.role,
         tm.joined_at,
         e.id as employee_id,
         e.username,
         e.full_name,
         e.email,
         e.balance,
         e.profile_image_url,
         COALESCE((SELECT SUM(amount) FROM payments WHERE employee_id = e.id), 0) as total_tips
       FROM team_members tm
       INNER JOIN employees e ON e.id = tm.employee_id
       WHERE tm.business_id = ?
       ORDER BY tm.joined_at DESC`,
      [business.id]
    ));

    console.log(`[business/members] business_id=${business.id}, count=${members.length}`);
    res.json({ members });
  } catch (err) {
    console.error('[business/members]', err.message);
    res.status(500).json({ error: 'Server error fetching members.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/join/:token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/join/:token', authMiddleware, (req, res) => {
  try {
    const { token } = req.params;
    const db = getDB();
    const employeeId = req.employee.id;

    const invitation = rowToObj(
      db.exec('SELECT * FROM invitations WHERE token = ? AND status = ?', [token, 'pending'])
    );

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already used.' });
    }

    // Check not already a member
    const alreadyMember = rowToObj(
      db.exec(
        'SELECT id FROM team_members WHERE business_id = ? AND employee_id = ?',
        [invitation.business_id, employeeId]
      )
    );
    if (alreadyMember) {
      return res.status(409).json({ error: 'You are already a member of this business.' });
    }

    db.run(
      'INSERT INTO team_members (business_id, employee_id, role) VALUES (?, ?, ?)',
      [invitation.business_id, employeeId, 'member']
    );
    db.run(
      "UPDATE invitations SET status = 'accepted' WHERE token = ?",
      [token]
    );
    saveDB();

    console.log(`[business/join] Employee ${employeeId} joined business_id=${invitation.business_id}`);
    res.json({ success: true, message: 'You have joined the business successfully.' });
  } catch (err) {
    console.error('[business/join]', err.message);
    res.status(500).json({ error: 'Server error joining business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/business/members/:employeeId
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/members/:employeeId', authMiddleware, (req, res) => {
  try {
    const { employeeId } = req.params;
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);

    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const member = rowToObj(
      db.exec(
        'SELECT id FROM team_members WHERE business_id = ? AND employee_id = ?',
        [business.id, employeeId]
      )
    );
    if (!member) {
      return res.status(404).json({ error: 'Member not found in your business.' });
    }

    db.run(
      'DELETE FROM team_members WHERE business_id = ? AND employee_id = ?',
      [business.id, employeeId]
    );
    saveDB();

    console.log(`[business/members] Removed employee_id=${employeeId} from business_id=${business.id}`);
    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (err) {
    console.error('[business/members DELETE]', err.message);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

module.exports = router;
