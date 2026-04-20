const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB, saveDB } = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');

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
      "INSERT INTO invitations (business_id, email, token, expires_at) VALUES (?, ?, ?, datetime('now', '+48 hours'))",
      [business.id, normalizedEmail, token]
    );
    saveDB();

    const inviteUrl = `https://snaptip.me/join/${token}`;

    // Professional branded HTML email
    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#080818;font-family:Arial,sans-serif;">
  <div style="max-width:500px;margin:40px auto;background:linear-gradient(135deg,#1a1a3e,#0d0d2b);border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
    <div style="background:linear-gradient(135deg,#6c6cff,#a855f7);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:28px;">&#9889; SnapTip</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Digital Tipping Platform</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:white;font-size:22px;margin:0 0 12px;">You're invited!</h2>
      <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 8px;">
        <strong style="color:white;">${business.business_name}</strong> has invited you to join their team on SnapTip and start receiving digital tips from tourists.
      </p>
      <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 28px;">
        Click the button below to accept the invitation and create your account.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#4facfe,#a855f7);color:white;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:bold;letter-spacing:0.5px;">&#10003; Accept Invitation</a>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;text-align:center;margin:16px 0 0;">
        Or copy this link:<br>
        <a href="${inviteUrl}" style="color:#6c6cff;word-break:break-all;font-size:11px;">${inviteUrl}</a>
      </p>
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;margin:24px 0 0;border:1px solid rgba(255,255,255,0.08);">
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0;line-height:1.6;">
          &#128274; This invitation link expires in <strong style="color:white;">48 hours</strong><br>
          &#8226; You'll need a SnapTip account to accept this invitation<br>
          &#8226; If you didn't expect this email, you can safely ignore it
        </p>
      </div>
    </div>
    <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
      <p style="color:rgba(255,255,255,0.3);font-size:11px;margin:0;">Powered by SnapTip • snaptip.me<br>The smart way to receive tips from tourists worldwide</p>
    </div>
  </div>
</body>
</html>`;

    try {
      await sendEmail(normalizedEmail, `You're invited to join ${business.business_name} on SnapTip`, htmlBody);
    } catch (emailErr) {
      console.warn('[business/invite] Email send failed:', emailErr.message);
    }

    console.log(`[business/invite] Invited ${normalizedEmail} to business_id=${business.id}, token=${token}`);
    res.json({ success: true, message: `Invitation sent to ${normalizedEmail}`, token });
  } catch (err) {
    console.error('[business/invite] FULL ERROR:', err);
    res.status(500).json({ error: 'Server error sending invitation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/invite-link  (get or create a shareable invite link)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invite-link', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    // Look for existing active link invite
    let linkInvite = rowToObj(
      db.exec("SELECT * FROM invitations WHERE business_id = ? AND email = 'link_invite' AND status = 'active'", [business.id])
    );

    // If exists but expired, invalidate it
    if (linkInvite && linkInvite.expires_at && new Date(linkInvite.expires_at) < new Date()) {
      db.run("UPDATE invitations SET status = 'expired' WHERE id = ?", [linkInvite.id]);
      saveDB();
      linkInvite = null;
    }

    // Create new if none exists
    if (!linkInvite) {
      const token = crypto.randomBytes(32).toString('hex');
      db.run(
        "INSERT INTO invitations (business_id, email, token, status, expires_at) VALUES (?, 'link_invite', ?, 'active', datetime('now', '+48 hours'))",
        [business.id, token]
      );
      saveDB();
      linkInvite = rowToObj(
        db.exec("SELECT * FROM invitations WHERE token = ?", [token])
      );
    }

    const invite_url = `https://snaptip.me/join/${linkInvite.token}`;
    console.log(`[business/invite-link] business_id=${business.id}, token=${linkInvite.token}`);
    res.json({ invite_url, token: linkInvite.token, expires_at: linkInvite.expires_at });
  } catch (err) {
    console.error('[business/invite-link]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/refresh-invite-link
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh-invite-link', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    // Invalidate all existing link invites
    db.run("UPDATE invitations SET status = 'expired' WHERE business_id = ? AND email = 'link_invite' AND status = 'active'", [business.id]);

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    db.run(
      "INSERT INTO invitations (business_id, email, token, status, expires_at) VALUES (?, 'link_invite', ?, 'active', datetime('now', '+48 hours'))",
      [business.id, token]
    );
    saveDB();

    const invite_url = `https://snaptip.me/join/${token}`;
    const linkInvite = rowToObj(db.exec("SELECT expires_at FROM invitations WHERE token = ?", [token]));

    console.log(`[business/refresh-invite-link] New token for business_id=${business.id}`);
    res.json({ invite_url, token, expires_at: linkInvite?.expires_at });
  } catch (err) {
    console.error('[business/refresh-invite-link]', err.message);
    res.status(500).json({ error: 'Server error.' });
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
// GET /api/business/invite-info/:token  (public — for preview before joining)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invite-info/:token', (req, res) => {
  try {
    const { token } = req.params;
    const db = getDB();

    console.log('[business/invite-info] Looking up token:', token);

    const invitation = rowToObj(
      db.exec('SELECT * FROM invitations WHERE token = ?', [token])
    );
    if (!invitation) {
      console.log('[business/invite-info] Token not found');
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    console.log('[business/invite-info] Found invitation:', JSON.stringify({ id: invitation.id, status: invitation.status, email: invitation.email, business_id: invitation.business_id }));

    if (invitation.status !== 'pending' && invitation.status !== 'active') {
      return res.status(400).json({ error: 'This invitation has already been used.' });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    const business = rowToObj(
      db.exec('SELECT business_name, business_type, logo_url FROM businesses WHERE id = ?', [invitation.business_id])
    );

    console.log('[business/invite-info] Business:', JSON.stringify(business));

    res.json({
      business_name: business?.business_name || 'Unknown Business',
      business_type: business?.business_type || '',
      logo_url: business?.logo_url || '',
      email: invitation.email,
    });
  } catch (err) {
    console.error('[business/invite-info] FULL ERROR:', err);
    res.status(500).json({ error: 'Server error.' });
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

    console.log(`[business/join] Employee ${employeeId} attempting to join with token: ${token}`);

    const invitation = rowToObj(
      db.exec("SELECT * FROM invitations WHERE token = ? AND status IN ('pending', 'active')", [token])
    );

    if (!invitation) {
      console.log('[business/join] Invitation not found or already used');
      return res.status(404).json({ error: 'Invitation not found or already used.' });
    }

    console.log(`[business/join] Found invitation: business_id=${invitation.business_id}, email=${invitation.email}`);

    // Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired.' });
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

    // Insert into team_members
    db.run(
      'INSERT INTO team_members (business_id, employee_id, role) VALUES (?, ?, ?)',
      [invitation.business_id, employeeId, 'member']
    );

    // Update employee record — set business_id and account_type
    db.run(
      "UPDATE employees SET business_id = ?, account_type = 'member' WHERE id = ?",
      [invitation.business_id, employeeId]
    );

    // Only mark email invites as accepted; link invites stay active (reusable)
    if (invitation.email !== 'link_invite') {
      db.run(
        "UPDATE invitations SET status = 'accepted' WHERE token = ?",
        [token]
      );
    }
    saveDB();

    // Get business name for the response
    const business = rowToObj(
      db.exec('SELECT business_name FROM businesses WHERE id = ?', [invitation.business_id])
    );

    // Get updated employee data to return
    const updatedEmployee = rowToObj(
      db.exec('SELECT id, username, full_name, email, account_type, business_id, balance, photo_url, photo_base64, profile_image_url FROM employees WHERE id = ?', [employeeId])
    );

    console.log(`[business/join] SUCCESS: Employee ${employeeId} joined business_id=${invitation.business_id}, account_type=member`);
    res.json({
      success: true,
      message: 'You have joined the business successfully.',
      business_name: business?.business_name || '',
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error('[business/join]', err.message, err.stack);
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/stats  — KPI cards + top performers leaderboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const totalTipsRow = rowToObj(db.exec(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       WHERE tm.business_id = ?`,
      [business.id]
    ));

    const totalTxRow = rowToObj(db.exec(
      `SELECT COUNT(*) as count
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       WHERE tm.business_id = ?`,
      [business.id]
    ));

    const activeMembersRow = rowToObj(db.exec(
      'SELECT COUNT(*) as count FROM team_members WHERE business_id = ?',
      [business.id]
    ));

    const topPerformers = rowsToObjs(db.exec(
      `SELECT e.id, e.full_name, e.username, e.photo_base64, e.profile_image_url,
              COALESCE(SUM(p.amount), 0) as total_tips
       FROM team_members tm
       INNER JOIN employees e ON e.id = tm.employee_id
       LEFT JOIN payments p ON p.employee_id = e.id
       WHERE tm.business_id = ?
       GROUP BY e.id
       ORDER BY total_tips DESC
       LIMIT 3`,
      [business.id]
    ));

    res.json({
      total_tips: Number(totalTipsRow?.total) || 0,
      total_transactions: Number(totalTxRow?.count) || 0,
      active_members: Number(activeMembersRow?.count) || 0,
      top_performers: topPerformers,
      business_name: business.business_name,
    });
  } catch (err) {
    console.error('[business/stats]', err.message);
    res.status(500).json({ error: 'Server error fetching stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/transactions  — all payments to all employees in business
// ─────────────────────────────────────────────────────────────────────────────
router.get('/transactions', authMiddleware, (req, res) => {
  try {
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const transactions = rowsToObjs(db.exec(
      `SELECT p.id, p.amount, p.status, p.created_at,
              e.full_name as employee_name, e.username as employee_username
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       INNER JOIN employees e ON e.id = p.employee_id
       WHERE tm.business_id = ?
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [business.id]
    ));

    res.json({ transactions });
  } catch (err) {
    console.error('[business/transactions]', err.message);
    res.status(500).json({ error: 'Server error fetching transactions.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/business/update  — update business profile
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/update', authMiddleware, (req, res) => {
  try {
    const { business_name, business_type, address, thank_you_message, logo_base64, logo_url } = req.body;
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const updates = [];
    const values = [];

    if (business_name?.trim()) { updates.push('business_name = ?'); values.push(business_name.trim()); }
    if (business_type?.trim()) { updates.push('business_type = ?'); values.push(business_type.trim()); }
    if (address !== undefined)  { updates.push('address = ?'); values.push(address.trim()); }
    if (thank_you_message !== undefined) { updates.push('thank_you_message = ?'); values.push(thank_you_message.trim()); }
    if (logo_base64 !== undefined) { updates.push('logo_base64 = ?'); values.push(logo_base64); }
    if (logo_url !== undefined)    { updates.push('logo_url = ?'); values.push(logo_url); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(business.id);
    db.run(`UPDATE businesses SET ${updates.join(', ')} WHERE id = ?`, values);
    saveDB();

    const updated = rowToObj(db.exec('SELECT * FROM businesses WHERE id = ?', [business.id]));
    console.log(`[business/update] Updated business_id=${business.id}`);
    res.json({ success: true, business: updated });
  } catch (err) {
    console.error('[business/update]', err.message);
    res.status(500).json({ error: 'Server error updating business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/business/member/:employeeId  (alias for /members/:employeeId)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/member/:employeeId', authMiddleware, (req, res) => {
  try {
    const { employeeId } = req.params;
    const db = getDB();
    const business = getOwnedBusiness(db, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const member = rowToObj(db.exec(
      'SELECT id FROM team_members WHERE business_id = ? AND employee_id = ?',
      [business.id, employeeId]
    ));
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    db.run('DELETE FROM team_members WHERE business_id = ? AND employee_id = ?', [business.id, employeeId]);
    // Reset employee's business linkage
    db.run("UPDATE employees SET business_id = NULL, account_type = 'individual' WHERE id = ?", [employeeId]);
    saveDB();

    console.log(`[business/member] Removed employee_id=${employeeId} from business_id=${business.id}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[business/member DELETE]', err.message);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

module.exports = router;

