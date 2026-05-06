import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const STORAGE_KEY = 'snaptip.cookieConsent.v1';

// Routes where the banner is allowed to render. Anything else (notably the
// `/:username` tourist tip page) is suppressed so the banner does not pop up
// in front of someone who never opted into the SnapTip product.
const ALLOWED_PREFIXES = ['/login', '/register', '/dashboard', '/admin'];

function isAllowedRoute(pathname) {
  return ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch (_) {
      // Private mode / storage disabled — show the banner; the user can dismiss
      // it for the session even if we can't persist their choice.
      setVisible(true);
    }
  }, []);

  const persist = (value) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: Date.now() })); } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;
  if (!isAllowedRoute(pathname)) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 720,
        margin: '0 auto',
        background: '#222222',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        padding: '18px 20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
        color: 'rgba(255,255,255,0.85)',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        fontSize: 14,
        lineHeight: 1.5,
        zIndex: 9999,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <p style={{ margin: 0, flex: '1 1 320px' }}>
        SnapTip uses a single essential cookie to keep you signed in. We do not use advertising
        or third-party tracking cookies. See our{' '}
        <Link to="/privacy" style={{ color: '#00C896' }}>Privacy Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => persist('declined')}
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => persist('accepted')}
          style={{
            background: '#00C896',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 10,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
