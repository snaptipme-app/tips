const express = require('express');
const router = express.Router();

// GET /join/:token → serve a self-contained HTML page
router.get('/:token', (req, res) => {
  const { token } = req.params;
  const apiBase = `${req.protocol}://${req.get('host')}`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Join Team — SnapTip</title>
  <meta name="description" content="Accept your team invitation on SnapTip — the smart digital tipping platform.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #080818;
      color: #fff;
      min-height: 100dvh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      width: 100%;
      max-width: 420px;
    }
    /* Brand */
    .brand {
      text-align: center;
      margin-bottom: 28px;
    }
    .brand h1 {
      font-size: 22px;
      font-weight: 800;
      background: linear-gradient(135deg, #6c6cff, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    /* Card */
    .card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 20px;
      padding: 36px 28px;
      text-align: center;
      backdrop-filter: blur(12px);
    }
    /* Avatar */
    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: rgba(108, 108, 255, 0.12);
      border: 2px solid #6c6cff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
      line-height: 1;
    }
    .biz-name {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .biz-type {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 12px;
    }
    .invite-msg {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.35);
      line-height: 1.6;
      margin-bottom: 0;
    }
    /* States */
    #loading, #error-state, #success-state { display: none; }
    #loading.active, #error-state.active, #success-state.active, #preview.active { display: block; }
    /* Spinner */
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(108, 108, 255, 0.2);
      border-top-color: #6c6cff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
    }
    /* Buttons */
    .actions { margin-top: 28px; display: flex; flex-direction: column; gap: 10px; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 52px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: opacity 0.2s, transform 0.1s;
      width: 100%;
    }
    .btn:active { transform: scale(0.97); }
    .btn-primary { background: #00C896; color: #fff; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.12); }
    .btn-secondary:hover { border-color: rgba(255,255,255,0.25); }
    .btn-outline { background: transparent; color: rgba(255,255,255,0.4); font-size: 14px; font-weight: 500; height: 40px; }
    .joining-as {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      margin-bottom: -8px;
    }
    .joining-as strong { color: #fff; }
    .helper {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.2);
      text-align: center;
      margin-top: 8px;
    }
    /* Error */
    .error-icon {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: rgba(239, 68, 68, 0.12);
      border: 2px solid #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 36px;
    }
    .error-title { font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 8px; }
    .error-msg { font-size: 14px; color: rgba(255,255,255,0.5); text-align: center; line-height: 1.5; margin-bottom: 24px; }
    /* Success */
    .success-icon {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: rgba(0, 200, 150, 0.12);
      border: 2px solid #00C896;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 40px;
    }
    .success-title { font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 4px; }
    .success-sub { font-size: 14px; color: rgba(255,255,255,0.4); text-align: center; }
    .success-biz { font-size: 16px; font-weight: 700; color: #6c6cff; text-align: center; margin: 4px 0 24px; }
    .btn-accent { background: #6c6cff; color: #fff; }
    /* App Banner */
    .app-banner {
      margin-top: 20px;
      padding: 16px;
      background: rgba(108, 108, 255, 0.08);
      border: 1px solid rgba(108, 108, 255, 0.2);
      border-radius: 14px;
      text-align: center;
    }
    .app-banner p { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
    .app-banner a {
      display: inline-block;
      font-size: 13px;
      font-weight: 600;
      color: #6c6cff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand"><h1>⚡ SnapTip</h1></div>

    <!-- Loading -->
    <div id="loading" class="active">
      <div class="card">
        <div class="spinner"></div>
        <div class="loading-text">Loading invitation...</div>
      </div>
    </div>

    <!-- Error -->
    <div id="error-state">
      <div class="card">
        <div class="error-icon">❌</div>
        <div class="error-title">Invitation Error</div>
        <div class="error-msg" id="error-msg">This invitation link is invalid or has expired.</div>
        <a href="/" class="btn btn-outline">Go to SnapTip</a>
      </div>
    </div>

    <!-- Success -->
    <div id="success-state">
      <div class="card">
        <div class="success-icon">✅</div>
        <div class="success-title">You're in! 🎉</div>
        <div class="success-sub">You've successfully joined</div>
        <div class="success-biz" id="success-biz-name"></div>
        <a href="/" class="btn btn-accent">Open SnapTip</a>
      </div>
      <div class="app-banner">
        <p>Open the SnapTip app to see your team dashboard</p>
        <a href="snaptip://home">Open App →</a>
      </div>
    </div>

    <!-- Preview -->
    <div id="preview">
      <div class="card">
        <div class="avatar" id="biz-emoji">🏢</div>
        <div class="biz-name" id="biz-name"></div>
        <div class="biz-type" id="biz-type"></div>
        <div class="invite-msg">has invited you to join their team on SnapTip and start receiving digital tips.</div>
        <div class="actions" id="actions"></div>
      </div>
      <div class="app-banner">
        <p>Already have the SnapTip app?</p>
        <a href="snaptip://join/${token}">Open in App →</a>
      </div>
    </div>
  </div>

  <script>
    const TOKEN = '${token}';
    const API = '${apiBase}/api';

    const $ = id => document.getElementById(id);

    function show(id) {
      ['loading', 'error-state', 'success-state', 'preview'].forEach(s => {
        const el = $(s);
        if (el) el.classList.toggle('active', s === id);
      });
    }

    // Check if user has a stored JWT
    function getStoredToken() {
      try { return localStorage.getItem('snaptip_token'); } catch { return null; }
    }
    function getStoredUser() {
      try { const u = localStorage.getItem('snaptip_user'); return u ? JSON.parse(u) : null; } catch { return null; }
    }

    async function init() {
      try {
        const res = await fetch(API + '/business/invite-info/' + TOKEN);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Invalid invitation link.');
        }
        const data = await res.json();

        // Populate preview
        const typeMap = { Restaurant: '🍽️', Hotel: '🏨', Transport: '🚗' };
        $('biz-emoji').textContent = typeMap[data.business_type] || '🏢';
        $('biz-name').textContent = data.business_name || 'Unknown Business';
        $('biz-type').textContent = data.business_type || '';

        renderActions(data.business_name);
        show('preview');
      } catch (e) {
        $('error-msg').textContent = e.message;
        show('error-state');
      }
    }

    function renderActions(bizName) {
      const jwt = getStoredToken();
      const user = getStoredUser();
      const acts = $('actions');

      if (jwt && user) {
        // Logged in
        acts.innerHTML = 
          '<div class="joining-as">Joining as <strong>' + (user.full_name || user.username || '') + '</strong></div>' +
          '<button class="btn btn-primary" id="join-btn">✅ Join ' + (bizName || 'Team') + '</button>' +
          '<a href="/" class="btn btn-outline">Decline</a>';

        $('join-btn').addEventListener('click', handleJoin);
      } else {
        // Not logged in
        const redirectUrl = encodeURIComponent('/join/' + TOKEN);
        acts.innerHTML = 
          '<a href="/login?redirect=' + redirectUrl + '" class="btn btn-primary">🔑 Log in to Accept</a>' +
          '<a href="/register?redirect=' + redirectUrl + '" class="btn btn-secondary">👤 Create Account</a>' +
          '<div class="helper">You need a SnapTip account to join the team</div>';
      }
    }

    async function handleJoin() {
      const btn = $('join-btn');
      const jwt = getStoredToken();
      if (!jwt) { renderActions($('biz-name').textContent); return; }

      btn.disabled = true;
      btn.textContent = 'Joining...';

      try {
        const res = await fetch(API + '/business/join/' + TOKEN, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to join.');

        $('success-biz-name').textContent = data.business_name || $('biz-name').textContent;
        show('success-state');
      } catch (e) {
        btn.disabled = false;
        btn.textContent = '❌ ' + e.message;
        setTimeout(() => { btn.textContent = '✅ Join Team'; }, 3000);
      }
    }

    init();
  </script>
</body>
</html>`);
});

module.exports = router;
