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
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
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
      text-rendering: optimizeLegibility;
    }
    .container { width: 100%; max-width: 400px; }

    /* ── Brand lockup ── */
    .brand { display: flex; justify-content: center; margin-bottom: 32px; }
    .brand-lockup {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      line-height: 1;
    }
    /* Official app icon. Same file and same URL the web app's Logo component
       uses (client/src/components/Logo.jsx), served from client/public at the
       site root — so this mark is byte-identical to the rest of the product and
       picks up any future asset change automatically. The black tile matches
       Logo.jsx's treatment and fills the PNG's transparent rounded corners. */
    .brand-mark {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: #000;
      overflow: hidden;
      display: block;
      flex-shrink: 0;
    }
    .brand-mark img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .brand-lockup .wordmark {
      font-size: 21px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.025em;
    }

    /* ── Card ── */
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 22px;
      padding: 36px 26px 30px;
      text-align: center;
    }

    /* ── Business identity ── */
    .avatar {
      position: relative;
      width: 84px;
      height: 84px;
      border-radius: 42px;
      background: rgba(0, 200, 150, 0.10);
      border: 2px solid rgba(0, 200, 150, 0.85);
      color: #00C896;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px;
      font-size: 32px;
      font-weight: 800;
      line-height: 1;
      overflow: hidden;
      flex-shrink: 0;
    }
    .avatar img {
      display: none;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* Once a real logo paints, drop the mint wash so it reads as the brand's own */
    .avatar.has-logo { background: #fff; border-color: rgba(255, 255, 255, 0.16); }
    .avatar.has-logo img { display: block; }
    .avatar.has-logo .initial { display: none; }

    .biz-name { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 3px; }
    .biz-type { font-size: 13px; color: rgba(255, 255, 255, 0.4); margin-bottom: 14px; }
    .invite-msg {
      font-size: 13.5px;
      color: rgba(255, 255, 255, 0.42);
      line-height: 1.6;
      max-width: 290px;
      margin: 0 auto;
    }

    /* ── States ── */
    #loading, #error-state, #success-state, #blocked-state, #preview { display: none; }
    #loading.active, #error-state.active, #success-state.active,
    #blocked-state.active, #preview.active { display: block; }

    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(0, 200, 150, 0.2);
      border-top-color: #00C896;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { font-size: 14px; color: rgba(255, 255, 255, 0.4); }

    /* ── Buttons ── */
    .actions { margin-top: 26px; display: flex; flex-direction: column; gap: 10px; }
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
    .btn-outline { background: transparent; color: rgba(255,255,255,0.4); font-size: 14px; font-weight: 500; height: 40px; }

    .joining-as { font-size: 13px; color: rgba(255, 255, 255, 0.4); margin-bottom: -8px; }
    .joining-as strong { color: #fff; font-weight: 600; }
    .helper { font-size: 12.5px; color: rgba(255, 255, 255, 0.3); margin-top: 2px; line-height: 1.5; }

    /* Store links stay out of the primary flow — revealed only on request */
    .store-toggle {
      background: none;
      border: none;
      font-family: inherit;
      font-size: 12.5px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.45);
      cursor: pointer;
      padding: 8px 4px 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .store-toggle:hover { color: #00C896; }
    .store-links { display: none; gap: 18px; justify-content: center; margin-top: 10px; }
    .store-links.open { display: flex; }
    .store-links a {
      font-size: 13px;
      font-weight: 600;
      color: #00C896;
      text-decoration: none;
    }
    .store-links a:hover { opacity: 0.8; }

    /* ── Error / blocked / success ── */
    .status-icon {
      width: 76px; height: 76px;
      border-radius: 38px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 18px;
      font-size: 38px;
      line-height: 1;
    }
    .status-icon.err { background: rgba(239, 68, 68, 0.12); border: 2px solid #ef4444; color: #ef4444; }
    .status-icon.ok  { background: rgba(0, 200, 150, 0.12); border: 2px solid #00C896; color: #00C896; }
    .status-title { font-size: 21px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 8px; }
    .status-msg {
      font-size: 14px;
      color: rgba(255,255,255,0.5);
      line-height: 1.6;
      margin: 0 auto 24px;
      max-width: 300px;
    }
    .success-biz { font-size: 16px; font-weight: 700; color: #00C896; margin: 4px 0 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="brand">
      <div class="brand-lockup">
        <span class="brand-mark">
          <img src="/snaptip_icon.png?v=black-20260524" alt="" aria-hidden="true" width="30" height="30">
        </span>
        <span class="wordmark">SnapTip</span>
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
        <div class="status-icon err">&#10007;</div>
        <div class="status-title">Invitation Error</div>
        <div class="status-msg" id="error-msg">This invitation link is invalid or has expired.</div>
        <a href="/" class="btn btn-outline">Go to SnapTip</a>
      </div>
    </div>

    <!-- Blocked: a business/owner account cannot join as an employee -->
    <div id="blocked-state">
      <div class="card">
        <div class="status-icon err">&#33;</div>
        <div class="status-title">Action Denied</div>
        <div class="status-msg">
          You are signed in with a business account. Business accounts cannot join a team
          as an employee. Please log out and sign in with an employee account to accept
          this invitation.
        </div>
        <button type="button" class="btn btn-primary" id="logout-btn">Log Out</button>
        <a href="/" class="btn btn-outline">Go to SnapTip</a>
      </div>
    </div>

    <!-- Success -->
    <div id="success-state">
      <div class="card">
        <div class="status-icon ok">&#10003;</div>
        <div class="status-title">You're in</div>
        <div class="loading-text">You've successfully joined</div>
        <div class="success-biz" id="success-biz-name"></div>
        <button type="button" class="btn btn-primary" id="open-app-home">Open SnapTip</button>
      </div>
    </div>

    <!-- Preview -->
    <div id="preview">
      <div class="card">
        <div class="avatar" id="biz-avatar">
          <img id="biz-logo" alt="">
          <span class="initial" id="biz-initial"></span>
        </div>
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

    // Web signup was retired in favour of the app (client/src/App.jsx redirects
    // /login and /register to /), so the stores are the fallback for people
    // without the app. They stay collapsed to keep the primary action clean.
    const PLAY_URL = 'https://play.google.com/store/apps/details?id=me.snaptip.app';
    const APPLE_URL = 'https://apps.apple.com/search?term=SnapTip';

    const $ = id => document.getElementById(id);

    function show(id) {
      ['loading', 'error-state', 'success-state', 'blocked-state', 'preview'].forEach(s => {
        const el = $(s);
        if (el) el.classList.toggle('active', s === id);
      });
    }

    // ── Deep-link handlers ──
    function openAppJoin() { window.location.href = APP_JOIN_LINK; }
    $('open-app-home').addEventListener('click', () => { window.location.href = 'snaptip://home'; });

    // ── Session helpers ──
    function getStoredToken() {
      try { return localStorage.getItem('snaptip_token'); } catch { return null; }
    }
    function clearStoredSession() {
      try {
        localStorage.removeItem('snaptip_token');
        localStorage.removeItem('snaptip_user');
      } catch {}
    }
    $('logout-btn').addEventListener('click', () => {
      clearStoredSession();
      window.location.reload();
    });

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

    // Mirrors mobile/lib/imageUtils.ts so a logo stored as a relative upload
    // path, an absolute URL, or a base64 data URI all resolve the same way.
    function resolveImage(value) {
      const v = (value || '').trim();
      if (!v) return '';
      if (v.startsWith('data:') || v.startsWith('http://') || v.startsWith('https://')) return v;
      if (v.startsWith('/')) return v;
      if (v.startsWith('uploads/')) return '/' + v;
      // A bare base64 payload with no data: prefix
      if (/^[A-Za-z0-9+/=\\s]{100,}$/.test(v)) return 'data:image/png;base64,' + v.replace(/\\s/g, '');
      return v;
    }

    // Paints the real business logo when there is one; the initial stays as the
    // graceful fallback if none is set or the image fails to load.
    function renderLogo(logoValue, bizName) {
      $('biz-initial').textContent = (bizName || 'S').trim().charAt(0).toUpperCase() || 'S';
      const src = resolveImage(logoValue);
      if (!src) return;
      const img = $('biz-logo');
      img.onload = () => { $('biz-avatar').classList.add('has-logo'); };
      img.onerror = () => { $('biz-avatar').classList.remove('has-logo'); };
      img.src = src;
    }

    async function init() {
      try {
        const res = await fetch(API + '/business/invite-info/' + TOKEN);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Invalid invitation link.');
        }
        const data = await res.json();

        const bizName = data.business_name || 'Unknown Business';
        renderLogo(data.logo_url || data.logo_base64, bizName);
        $('biz-name').textContent = bizName;
        $('biz-type').textContent = data.business_type || '';

        const sessionUser = await getValidSession();

        // A signed-in business owner must never be offered the join action —
        // accepting would strip their account type. The server enforces this too.
        if (sessionUser && sessionUser.account_type === 'business') {
          show('blocked-state');
          return;
        }

        renderActions(bizName, sessionUser);
        show('preview');
      } catch (e) {
        $('error-msg').textContent = e.message;
        show('error-state');
      }
    }

    function renderActions(bizName, sessionUser) {
      const acts = $('actions');

      if (getStoredToken() && sessionUser) {
        acts.innerHTML =
          '<div class="joining-as">Joining as <strong>' + (sessionUser.full_name || sessionUser.username || '') + '</strong></div>' +
          '<button type="button" class="btn btn-primary" id="join-btn">Accept Invitation</button>' +
          '<a href="/" class="btn btn-outline">Decline</a>';
        $('join-btn').addEventListener('click', handleJoin);
        return;
      }

      // No web session — accepting happens in the app.
      acts.innerHTML =
        '<button type="button" class="btn btn-primary" id="accept-btn">Accept Invitation</button>' +
        '<div class="helper">Opens the SnapTip app to finish joining.</div>' +
        '<button type="button" class="store-toggle" id="store-toggle">Don&#39;t have the app?</button>' +
        '<div class="store-links" id="store-links">' +
          '<a href="' + APPLE_URL + '">App Store</a>' +
          '<a href="' + PLAY_URL + '">Google Play</a>' +
        '</div>';

      $('accept-btn').addEventListener('click', openAppJoin);
      $('store-toggle').addEventListener('click', () => {
        $('store-links').classList.toggle('open');
      });
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
        // Server-side guard, in case a business account reached this point
        if (res.status === 403 && data.code === 'BUSINESS_ACCOUNT_CANNOT_JOIN') {
          show('blocked-state');
          return;
        }
        if (!res.ok) throw new Error(data.error || 'Failed to join.');

        $('success-biz-name').textContent = data.business_name || $('biz-name').textContent;
        show('success-state');
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Error: ' + e.message;
        setTimeout(() => { btn.textContent = 'Accept Invitation'; }, 3000);
      }
    }

    init();
  </script>
</body>
</html>`);
});

module.exports = router;
