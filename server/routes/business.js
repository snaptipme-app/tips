const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const { sendEmail } = require('../utils/sendEmail');
const { upload, multerErrorHandler } = require('../middleware/upload');

// Ensure required_country column exists
(async () => {
  try { await pool.query('ALTER TABLE invitations ADD COLUMN IF NOT EXISTS required_country TEXT'); } catch (_) {}
})();

/* ── Helper: find the business owned by the logged-in employee ── */
async function getOwnedBusiness(pool, ownerId) {
  const { rows } = await pool.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
  return rows.length ? rows[0] : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { business_name, business_type, logo_url = '', address = '' } = req.body;
    const ownerId = req.employee.id;
    console.log('[business/create] owner_id:', req.employee.id);

    if (!ownerId) {
      return res.status(400).json({ error: 'Authentication error: owner ID missing from token.' });
    }

    // Verify owner actually exists in DB
    const { rows: ownerCheck } = await pool.query('SELECT id FROM employees WHERE id = $1', [ownerId]);
    if (ownerCheck.length === 0) {
      return res.status(400).json({ error: 'Invalid owner: employee not found.' });
    }

    if (!business_name || !business_type) {
      return res.status(400).json({ error: 'business_name and business_type are required.' });
    }

    const existing = await getOwnedBusiness(pool, ownerId);
    if (existing) {
      const { rows: empRows } = await pool.query('SELECT account_type FROM employees WHERE id = $1', [ownerId]);
      const employee = empRows[0];
      
      if (employee && employee.account_type !== 'business') {
        console.log(`[business/create] Cleaning up orphaned business id=${existing.id}`);
        await pool.query('DELETE FROM businesses WHERE id = $1', [existing.id]);
      } else {
        return res.status(409).json({ error: 'You already have a business account.', business: existing });
      }
    }

    const { rows: insertRows } = await pool.query(
      'INSERT INTO businesses (owner_id, business_name, business_type, logo_url, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ownerId, business_name.trim(), business_type.trim(), logo_url.trim(), address.trim()]
    );
    const id = insertRows[0].id;

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
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);

    if (!business) {
      return res.status(404).json({ error: 'No business found for this account.' });
    }

    const { rows: countRows } = await pool.query('SELECT COUNT(*) as count FROM team_members WHERE business_id = $1', [business.id]);
    const memberCount = parseInt(countRows[0].count, 10) || 0;

    const { rows: tipsRows } = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       WHERE tm.business_id = $1`,
      [business.id]
    );
    const total_tips = Number(tipsRows[0]?.total) || 0;

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

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const normalizedEmail = email.trim().toLowerCase();

    // Prevent owner from inviting themselves
    const { rows: ownerRows } = await pool.query('SELECT email, full_name, country FROM employees WHERE id = $1', [req.employee.id]);
    const ownerEmail = ownerRows[0]?.email || '';
    const ownerName = ownerRows[0]?.full_name || 'The manager';
    const ownerCountry = ownerRows[0]?.country || 'Morocco';
    if (ownerEmail && ownerEmail.toLowerCase() === normalizedEmail) {
      return res.status(400).json({ error: 'You cannot invite yourself to your own business.' });
    }

    // Country validation: if invited employee already exists, check country match
    const { rows: existingEmpRows } = await pool.query('SELECT country FROM employees WHERE email = $1', [normalizedEmail]);
    if (existingEmpRows.length > 0 && existingEmpRows[0].country) {
      const inviteeCountry = existingEmpRows[0].country;
      if (inviteeCountry !== ownerCountry) {
        return res.status(400).json({
          error: `You can only invite employees from the same country as your business (${ownerCountry}). This employee is registered in ${inviteeCountry}.`
        });
      }
    }

    await pool.query(
      "INSERT INTO invitations (business_id, email, token, expires_at, required_country) VALUES ($1, $2, $3, extract(epoch from (now() + interval '48 hours')) * 1000, $4)",
      [business.id, normalizedEmail, token, ownerCountry]
    );

    const inviteUrl = `https://snaptip.me/join/${token}`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

    <div style="background:#080818;padding:32px;text-align:center;">
      <div style="display:inline-block; background:#00FF66; color:#080818; font-weight:900; padding:10px 20px; border-radius:12px; font-size:22px; letter-spacing:1px; font-family:sans-serif;">SNAPTIP</div>
      <h1 style="color:white;font-size:22px;margin:12px 0 0;">SnapTip</h1>
    </div>

    <div style="padding:40px 32px;">
      <h2 style="color:#080818;font-size:24px;margin:0 0 16px;">You've been invited to join ${business.business_name}</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#080818;">${ownerName}</strong> has invited you to join <strong style="color:#080818;">${business.business_name}</strong> on SnapTip and start receiving digital tips from customers.
      </p>

      <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#888;font-size:14px;padding:4px 0;width:100px;">Business</td>
            <td style="color:#080818;font-size:14px;font-weight:600;">${business.business_name}</td>
          </tr>
          <tr>
            <td style="color:#888;font-size:14px;padding:4px 0;">Manager</td>
            <td style="color:#080818;font-size:14px;">${ownerName}</td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:20px;">
        <a href="${inviteUrl}" style="display:inline-block;background:#00C896;color:white;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;">Accept Invitation</a>
      </div>

      <p style="color:#aaa;font-size:13px;text-align:center;margin:0;">
        This invitation expires in <strong style="color:#666;">48 hours</strong>
      </p>
    </div>

    <div style="background:#f5f5f7;padding:24px 32px;text-align:center;border-top:1px solid #e8e8ea;">
      <p style="color:#888;font-size:13px;margin:0 0 8px;">Secure payments powered by SnapTip</p>
      <p style="color:#aaa;font-size:12px;margin:0;">© 2026 SnapTip. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;

    try {
      await sendEmail(normalizedEmail, `You're invited to join ${business.business_name} on SnapTip`, htmlBody);
    } catch (emailErr) {
      console.warn('[business/invite] Email send failed:', emailErr.message);
    }

    res.json({ success: true, message: `Invitation sent to ${normalizedEmail}`, token });
  } catch (err) {
    console.error('[business/invite] FULL ERROR:', err);
    res.status(500).json({ error: 'Server error sending invitation.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/invite-link  (get or create a shareable invite link)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invite-link', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    let { rows: linkInviteRows } = await pool.query(
      "SELECT * FROM invitations WHERE business_id = $1 AND email = 'link_invite' AND status = 'active'",
      [business.id]
    );
    let linkInvite = linkInviteRows[0];

    // If exists but expired, invalidate it
    // expires_at is stored in postgres as BIGINT or INTEGER (epoch milliseconds)
    if (linkInvite && linkInvite.expires_at && linkInvite.expires_at < Date.now()) {
      await pool.query("UPDATE invitations SET status = 'expired' WHERE id = $1", [linkInvite.id]);
      linkInvite = null;
    }

    if (!linkInvite) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        "INSERT INTO invitations (business_id, email, token, status, expires_at) VALUES ($1, 'link_invite', $2, 'active', extract(epoch from (now() + interval '48 hours')) * 1000)",
        [business.id, token]
      );
      
      const { rows: newRows } = await pool.query("SELECT * FROM invitations WHERE token = $1", [token]);
      linkInvite = newRows[0];
    }

    const invite_url = `https://snaptip.me/join/${linkInvite.token}`;
    res.json({ invite_url, token: linkInvite.token, expires_at: linkInvite.expires_at });
  } catch (err) {
    console.error('[business/invite-link]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/refresh-invite-link
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh-invite-link', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    await pool.query("UPDATE invitations SET status = 'expired' WHERE business_id = $1 AND email = 'link_invite' AND status = 'active'", [business.id]);

    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      "INSERT INTO invitations (business_id, email, token, status, expires_at) VALUES ($1, 'link_invite', $2, 'active', extract(epoch from (now() + interval '48 hours')) * 1000)",
      [business.id, token]
    );

    const { rows: newRows } = await pool.query("SELECT expires_at FROM invitations WHERE token = $1", [token]);
    const linkInvite = newRows[0];

    const invite_url = `https://snaptip.me/join/${token}`;
    res.json({ invite_url, token, expires_at: linkInvite?.expires_at });
  } catch (err) {
    console.error('[business/refresh-invite-link]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/members
// ─────────────────────────────────────────────────────────────────────────────
router.get('/members', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const { rows: members } = await pool.query(
      `SELECT
         tm.id as member_id,
         tm.role,
         tm.joined_at,
         e.id as employee_id,
         e.username,
         e.full_name,
         e.email,
         e.balance,
         e.job_title,
         e.photo_url,
         e.photo_base64,
         e.profile_image_url,
         COALESCE((SELECT SUM(amount) FROM payments WHERE employee_id = e.id), 0) as total_tips
       FROM team_members tm
       INNER JOIN employees e ON e.id = tm.employee_id
       WHERE tm.business_id = $1
       ORDER BY tm.joined_at DESC`,
      [business.id]
    );

    res.json({ members });
  } catch (err) {
    console.error('[business/members]', err.message);
    res.status(500).json({ error: 'Server error fetching members.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/invite-info/:token  (public — for preview before joining)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/invite-info/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { rows: invRows } = await pool.query('SELECT * FROM invitations WHERE token = $1', [token]);
    const invitation = invRows[0];
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found.' });
    }

    if (invitation.status !== 'pending' && invitation.status !== 'active') {
      return res.status(400).json({ error: 'This invitation has already been used.' });
    }

    if (invitation.expires_at && invitation.expires_at < Date.now()) {
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    const { rows: bizRows } = await pool.query('SELECT business_name, business_type, logo_url FROM businesses WHERE id = $1', [invitation.business_id]);
    const business = bizRows[0];

    res.json({
      business_name: business?.business_name || 'Unknown Business',
      business_type: business?.business_type || '',
      logo_url: business?.logo_url || '',
      email: invitation.email,
    });
  } catch (err) {
    console.error('[business/invite-info]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/business/join/:token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/join/:token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.params;
    const employeeId = req.employee.id;

    const { rows: invRows } = await pool.query("SELECT * FROM invitations WHERE token = $1 AND status IN ('pending', 'active')", [token]);
    const invitation = invRows[0];

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or already used.' });
    }

    // Check expiry
    if (invitation.expires_at && invitation.expires_at < Date.now()) {
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    // Country validation
    const { rows: joiningEmpRows } = await pool.query('SELECT country FROM employees WHERE id = $1', [employeeId]);
    const employeeCountry = joiningEmpRows[0]?.country || '';
    const requiredCountry = invitation.required_country || '';
    if (requiredCountry && employeeCountry && requiredCountry !== employeeCountry) {
      return res.status(400).json({
        error: `This invitation is for employees from ${requiredCountry}. Your account is registered in ${employeeCountry}.`,
        code: 'COUNTRY_MISMATCH',
        required_country: requiredCountry,
        your_country: employeeCountry,
      });
    }

    // Check not already a member
    const { rows: memberRows } = await pool.query(
      'SELECT id FROM team_members WHERE business_id = $1 AND employee_id = $2',
      [invitation.business_id, employeeId]
    );
    if (memberRows.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this business.' });
    }

    // Insert into team_members
    await pool.query(
      'INSERT INTO team_members (business_id, employee_id, role) VALUES ($1, $2, $3)',
      [invitation.business_id, employeeId, 'member']
    );

    // Update employee record
    await pool.query(
      "UPDATE employees SET business_id = $1, account_type = 'member' WHERE id = $2",
      [invitation.business_id, employeeId]
    );

    // Only mark email invites as accepted; link invites stay active (reusable)
    if (invitation.email !== 'link_invite') {
      await pool.query("UPDATE invitations SET status = 'accepted' WHERE token = $1", [token]);
    }

    const { rows: bizRows } = await pool.query('SELECT business_name FROM businesses WHERE id = $1', [invitation.business_id]);
    const business = bizRows[0];

    const { rows: empRows } = await pool.query('SELECT id, username, full_name, email, account_type, business_id, balance, photo_url, photo_base64, profile_image_url FROM employees WHERE id = $1', [employeeId]);
    const updatedEmployee = empRows[0];

    res.json({
      success: true,
      message: 'You have joined the business successfully.',
      business_name: business?.business_name || '',
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error('[business/join]', err.message);
    res.status(500).json({ error: 'Server error joining business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/business/members/:employeeId
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/members/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const business = await getOwnedBusiness(pool, req.employee.id);

    if (!business) {
      return res.status(403).json({ error: 'You do not own a business.' });
    }

    const { rows: memberRows } = await pool.query(
      'SELECT id FROM team_members WHERE business_id = $1 AND employee_id = $2',
      [business.id, employeeId]
    );
    if (memberRows.length === 0) {
      return res.status(404).json({ error: 'Member not found in your business.' });
    }

    await pool.query('DELETE FROM team_members WHERE business_id = $1 AND employee_id = $2', [business.id, employeeId]);
    
    // Also reset business_id
    await pool.query("UPDATE employees SET business_id = NULL, account_type = 'individual' WHERE id = $1", [employeeId]);

    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (err) {
    console.error('[business/members DELETE]', err.message);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/stats  — KPI cards + top performers leaderboard
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const { rows: totalTipsRow } = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) as total
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       WHERE tm.business_id = $1`,
      [business.id]
    );

    const { rows: totalTxRow } = await pool.query(
      `SELECT COUNT(*) as count
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       WHERE tm.business_id = $1`,
      [business.id]
    );

    const { rows: activeMembersRow } = await pool.query(
      'SELECT COUNT(*) as count FROM team_members WHERE business_id = $1',
      [business.id]
    );

    const { rows: topPerformers } = await pool.query(
      `SELECT e.id, e.full_name, e.username, e.photo_base64, e.profile_image_url,
              COALESCE(SUM(p.amount), 0) as total_tips
       FROM team_members tm
       INNER JOIN employees e ON e.id = tm.employee_id
       LEFT JOIN payments p ON p.employee_id = e.id
       WHERE tm.business_id = $1
       GROUP BY e.id
       ORDER BY total_tips DESC
       LIMIT 3`,
      [business.id]
    );

    res.json({
      total_tips: Number(totalTipsRow[0]?.total) || 0,
      total_transactions: Number(totalTxRow[0]?.count) || 0,
      active_members: Number(activeMembersRow[0]?.count) || 0,
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
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const { rows: transactions } = await pool.query(
      `SELECT p.id, p.amount, p.status, p.created_at,
              e.full_name as employee_name, e.username as employee_username,
              e.photo_url, e.photo_base64, e.profile_image_url
       FROM payments p
       INNER JOIN team_members tm ON tm.employee_id = p.employee_id
       INNER JOIN employees e ON e.id = p.employee_id
       WHERE tm.business_id = $1
       ORDER BY p.created_at DESC
       LIMIT 200`,
      [business.id]
    );

    res.json({ transactions });
  } catch (err) {
    console.error('[business/transactions]', err.message);
    res.status(500).json({ error: 'Server error fetching transactions.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/business/update  — update business profile
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/update', authMiddleware, async (req, res) => {
  try {
    const { business_name, business_type, address, thank_you_message, logo_base64, logo_url } = req.body;
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const updates = [];
    const values = [];
    let idx = 1;

    if (business_name?.trim()) { updates.push(`business_name = $${idx++}`); values.push(business_name.trim()); }
    if (business_type?.trim()) { updates.push(`business_type = $${idx++}`); values.push(business_type.trim()); }
    if (address !== undefined)  { updates.push(`address = $${idx++}`); values.push(address.trim()); }
    if (thank_you_message !== undefined) { updates.push(`thank_you_message = $${idx++}`); values.push(thank_you_message.trim()); }
    if (logo_base64 !== undefined) { updates.push(`logo_base64 = $${idx++}`); values.push(logo_base64); }
    if (logo_url !== undefined)    { updates.push(`logo_url = $${idx++}`); values.push(logo_url); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update.' });

    values.push(business.id);
    await pool.query(`UPDATE businesses SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    const { rows: bizRows } = await pool.query('SELECT * FROM businesses WHERE id = $1', [business.id]);
    res.json({ success: true, business: bizRows[0] });
  } catch (err) {
    console.error('[business/update]', err.message);
    res.status(500).json({ error: 'Server error updating business.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/business/member/:employeeId  (alias for /members/:employeeId)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/member/:employeeId', authMiddleware, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const business = await getOwnedBusiness(pool, req.employee.id);
    if (!business) return res.status(403).json({ error: 'You do not own a business.' });

    const { rows: memberRows } = await pool.query(
      'SELECT id FROM team_members WHERE business_id = $1 AND employee_id = $2',
      [business.id, employeeId]
    );
    if (memberRows.length === 0) return res.status(404).json({ error: 'Member not found.' });

    await pool.query('DELETE FROM team_members WHERE business_id = $1 AND employee_id = $2', [business.id, employeeId]);
    await pool.query("UPDATE employees SET business_id = NULL, account_type = 'individual' WHERE id = $1", [employeeId]);

    res.json({ success: true });
  } catch (err) {
    console.error('[business/member DELETE]', err.message);
    res.status(500).json({ error: 'Server error removing member.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/member-business
// ─────────────────────────────────────────────────────────────────────────────
router.get('/member-business', authMiddleware, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const { rows: bizRows } = await pool.query(
      `SELECT b.id, b.business_name, b.business_type, b.logo_url, b.logo_base64, b.address, b.thank_you_message
       FROM businesses b
       JOIN team_members tm ON tm.business_id = b.id
       WHERE tm.employee_id = $1
       LIMIT 1`,
      [employeeId]
    );

    res.json({ business: bizRows[0] || null });
  } catch (err) {
    console.error('[business/member-business]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/business/public/:username
// ─────────────────────────────────────────────────────────────────────────────
router.get('/public/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const { rows: empRows } = await pool.query('SELECT id, business_id FROM employees WHERE username = $1', [username]);
    if (empRows.length === 0) {
      return res.json({ business: null });
    }
    const employee = empRows[0];

    let business = null;
    if (employee.business_id) {
      const { rows: bizRows } = await pool.query(
        'SELECT id, business_name, logo_url, logo_base64, thank_you_message FROM businesses WHERE id = $1',
        [employee.business_id]
      );
      business = bizRows[0];
    }

    if (!business) {
      const { rows: bizRows2 } = await pool.query(
        `SELECT b.id, b.business_name, b.logo_url, b.logo_base64, b.thank_you_message
         FROM businesses b
         JOIN team_members tm ON tm.business_id = b.id
         WHERE tm.employee_id = $1
         LIMIT 1`,
        [employee.id]
      );
      business = bizRows2[0];
    }

    res.json({ business: business || null });
  } catch (err) {
    console.error('[business/public]', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/business/upload-logo ───────────────────────────────────────────
// Receives a multipart logo image via expo-file-system FileSystem.uploadAsync.
router.post('/upload-logo', authMiddleware, upload.single('logo'), multerErrorHandler, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No logo file received.' });

    const logoUrl = `https://snaptip.me/uploads/${req.file.filename}`;
    console.log(`[upload-logo] Saved: ${logoUrl} (${req.file.size} bytes) for owner_id=${req.employee.id}`);

    await pool.query(
      'UPDATE businesses SET logo_url = $1, logo_base64 = NULL WHERE owner_id = $2',
      [logoUrl, req.employee.id]
    );

    const { rows } = await pool.query(
      'SELECT id, business_name, business_type, logo_url, address FROM businesses WHERE owner_id = $1',
      [req.employee.id]
    );
    res.json({ success: true, logo_url: logoUrl, business: rows[0] || {} });
  } catch (err) {
    console.error('[upload-logo] Error:', err.message);
    res.status(500).json({ error: 'Failed to save logo.' });
  }
});

module.exports = router;
