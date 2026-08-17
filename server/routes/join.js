const express = require('express');
const router = express.Router();

// GET /join/:token → serve a self-contained HTML page
//
// NOTE: this page is NOT part of the React app in client/. It is served
// directly by Express (mounted at /join in server/index.js) so an invite link
// renders instantly without booting the SPA bundle.
router.get('/:token', (req, res) => {
  const { token } = req.params;

  // The token is untrusted path input that gets interpolated into a <script>
  // block below. JSON.stringify gives a safely quoted+escaped JS string literal;
  // escaping </ prevents a crafted token from closing the script tag early.
  const tokenLiteral = JSON.stringify(String(token)).replace(/<\//g, '<\\/');

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
      background: #1a1a1a;
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
    .brand-lockup {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .brand-lockup svg { display: block; }
    .brand-lockup span {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.02em;
    }
    /* Card */
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
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
      background: rgba(0, 200, 150, 0.12);
      border: 2px solid #00C896;
      color: #00C896;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      font-size: 32px;
      font-weight: 800;
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
      border: 3px solid rgba(0, 200, 150, 0.2);
      border-top-color: #00C896;
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
    .btn-primary { background: #00C896; color: #04231C; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.12); }
    .btn-secondary:hover { border-color: rgba(255,255,255,0.25); }
    .btn-outline { background: transparent; color: rgba(255,255,255,0.4); font-size: 14px; font-weight: 500; height: 40px; }
    /* Store fallback: two half-width pills side by side */
    .store-row { display: flex; gap: 10px; }
    .store-row .btn { font-size: 14px; height: 46px; }
    .joining-as {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.4);
      text-align: center;
      margin-bottom: -8px;
    }
    .joining-as strong { color: #fff; }
    .helper {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.25);
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
    .success-biz { font-size: 16px; font-weight: 700; color: #00C896; text-align: center; margin: 4px 0 24px; }
    /* App Banner */
    .app-banner {
      margin-top: 20px;
      padding: 16px;
      background: rgba(0, 200, 150, 0.08);
      border: 1px solid rgba(0, 200, 150, 0.2);
      border-radius: 14px;
      text-align: center;
    }
    .app-banner p { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 10px; }
    .app-link {
      display: inline-block;
      font-size: 13px;
      font-weight: 600;
      color: #00C896;
      background: none;
      border: none;
      font-family: inherit;
      cursor: pointer;
      padding: 0;
      text-decoration: none;
    }
    .app-link:hover { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <div class="brand-lockup">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M13 2L4.09 12.64a1 1 0 00.78 1.62H11v5.49a.5.5 0 00.9.31L20.91 9.36a1 1 0 00-.78-1.62H13V2.25a.5.5 0 00-.9-.31L13 2z" fill="#00C896"/>
        </svg>
        <span>SnapTip</span>
      </div>
    </div>

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
        <div class="error-icon" style="font-size:48px;color:#ef4444;">&#10007;</div>
        <div class="error-title">Invitation Error</div>
        <div class="error-msg" id="error-msg">This invitation link is invalid or has expired.</div>
        <a href="/" class="btn btn-outline">Go to SnapTip</a>
      </div>
    </div>

    <!-- Success -->
    <div id="success-state">
      <div class="card">
        <div class="success-icon" style="font-size:48px;color:#00C896;">&#10003;</div>
        <div class="success-title">You're in!</div>
        <div class="success-sub">You've successfully joined</div>
        <div class="success-biz" id="success-biz-name"></div>
        <a href="/" class="btn btn-primary">Open SnapTip</a>
      </div>
      <div class="app-banner">
        <p>Open the SnapTip app to see your team dashboard</p>
        <button type="button" class="app-link" id="open-app-home">Open App &rarr;</button>
      </div>
    </div>

    <!-- Preview -->
    <div id="preview">
      <div class="card">
        <div class="avatar" id="biz-initial"></div>
        <div class="biz-name" id="biz-name"></div>
        <div class="biz-type" id="biz-type"></div>
        <div class="invite-msg">has invited you to join their team on SnapTip and start receiving digital tips.</div>
        <div class="actions" id="actions"></div>
      </div>
    </div>
  </div>

  <script>
    // Token comes from the Express route param (safely encoded server-side).
    // window.location is kept as a fallback for any cached/edge-rewritten HTML.
    const TOKEN = ${tokenLiteral} || window.location.pathname.split('/join/')[1] || window.location.pathname.split('/').pop();
    const API = '/api'; // Always use relative path so it correctly proxies through Nginx

    // Deep link into the mobile app's invite screen (mobile/app/join/[token].tsx),
    // which handles both registering and joining in one pass.
    const APP_JOIN_LINK = 'snaptip://join/' + TOKEN;

    // There is no web signup — web auth was retired in favour of the app
    // (client/src/App.jsx redirects /login and /register to /). Invitees without
    // an account install the app and re-open this link.
    const PLAY_URL = 'https://play.google.com/store/apps/details?id=me.snaptip.app';
    const APPLE_URL = 'https://apps.apple.com/search?term=SnapTip';

    const $ = id => document.getElementById(id);

    function show(id) {
      ['loading', 'error-state', 'success-state', 'preview'].forEach(s => {
        const el = $(s);
        if (el) el.classList.toggle('active', s === id);
      });
    }

    // ── Deep-link handlers ──
    function openAppJoin() { window.location.href = APP_JOIN_LINK; }
    function openAppHome() { window.location.href = 'snaptip://home'; }

    $('open-app-home').addEventListener('click', openAppHome);

    // Check if user has a stored JWT
    function getStoredToken() {
      try { return localStorage.getItem('snaptip_token'); } catch { return null; }
    }
    function clearStoredSession() {
      try {
        localStorage.removeItem('snaptip_token');
        localStorage.removeItem('snaptip_user');
      } catch {}
    }
    async function getValidSession() {
      const jwt = getStoredToken();
      if (!jwt) return null;

      try {
        const res = await fetch(API + '/business/join-session', {
          headers: { 'Authorization': 'Bearer ' + jwt },
        });
        if (!res.ok) {
          clearStoredSession();
          return null;
        }
        const data = await res.json();
        return data.employee || null;
      } catch {
        return null;
      }
    }

    async function init() {
      try {
        const res = await fetch(API + '/business/invite-info/' + TOKEN);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Invalid invitation link.');
        }
        const data = await res.json();

        // Populate preview. Initial-letter avatar mirrors the mobile app —
        // the brand uses Ionicons/initials, never emoji.
        const bizName = data.business_name || 'Unknown Business';
        $('biz-initial').textContent = bizName.trim().charAt(0).toUpperCase() || 'S';
        $('biz-name').textContent = bizName;
        $('biz-type').textContent = data.business_type || '';

        const sessionUser = await getValidSession();
        renderActions(data.business_name, sessionUser);
        show('preview');
      } catch (e) {
        $('error-msg').textContent = e.message;
        show('error-state');
      }
    }

    function renderActions(bizName, sessionUser) {
      const jwt = getStoredToken();
      const acts = $('actions');

      if (jwt && sessionUser) {
        // Logged in
        acts.innerHTML =
          '<div class="joining-as">Joining as <strong>' + (sessionUser.full_name || sessionUser.username || '') + '</strong></div>' +
          '<button type="button" class="btn btn-primary" id="join-btn">&#10003; Join ' + (bizName || 'Team') + '</button>' +
          '<a href="/" class="btn btn-outline">Decline</a>';

        $('join-btn').addEventListener('click', handleJoin);
      } else {
        // No web session. Accepting happens in the app — hand off via deep link,
        // with the stores as the fallback for people who don't have it yet.
        acts.innerHTML =
          '<button type="button" class="btn btn-primary" id="accept-in-app-btn">Accept in the App</button>' +
          '<div class="store-row">' +
            '<a class="btn btn-secondary" href="' + APPLE_URL + '">App Store</a>' +
            '<a class="btn btn-secondary" href="' + PLAY_URL + '">Google Play</a>' +
          '</div>' +
          '<div class="helper">Don\\'t have SnapTip yet? Install the app, then open this invite link again to join.</div>';

        $('accept-in-app-btn').addEventListener('click', openAppJoin);
      }
    }

    async function handleJoin() {
      const btn = $('join-btn');
      const jwt = getStoredToken();
      if (!jwt) { renderActions($('biz-name').textContent, null); return; }

      btn.disabled = true;
      btn.textContent = 'Joining...';

      try {
        const res = await fetch(API + '/business/join/' + TOKEN, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + jwt, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.status === 401) {
          clearStoredSession();
          renderActions($('biz-name').textContent, null);
          throw new Error('Please log in again to accept this invitation.');
        }
        if (!res.ok) throw new Error(data.error || 'Failed to join.');

        $('success-biz-name').textContent = data.business_name || $('biz-name').textContent;
        show('success-state');
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Error: ' + e.message;
        setTimeout(() => { btn.textContent = 'Join Team'; }, 3000);
      }
    }

    init();
  </script>
</body>
</html>`);
});

module.exports = router;
