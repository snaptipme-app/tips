import { useState } from 'react';
import Logo from '../components/Logo';

const APP_DEEP_LINK = 'snaptip://member/withdraw';

const copy = {
  success: {
    icon: 'OK',
    title: 'Stripe Express setup completed',
    body: 'You can now return to the SnapTip app.',
    accent: '#00C896',
  },
  refresh: {
    icon: '!',
    title: 'Stripe Express setup was interrupted',
    body: 'Return to SnapTip and tap Continue setup.',
    accent: '#f59e0b',
  },
};

export default function StripeOnboardingReturn({ type = 'success' }) {
  const [showFallback, setShowFallback] = useState(false);
  const page = copy[type] || copy.success;

  const returnToApp = () => {
    setShowFallback(false);
    window.location.href = APP_DEEP_LINK;
    window.setTimeout(() => setShowFallback(true), 1200);
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#080818',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <Logo size={72} showText textColor="#fff" />

        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: `${page.accent}18`,
            border: `1px solid ${page.accent}44`,
            color: page.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 34,
            fontWeight: 800,
            marginTop: 12,
          }}
        >
          {page.icon}
        </div>

        <div>
          <h1 style={{ fontSize: 28, lineHeight: 1.15, marginBottom: 10 }}>{page.title}</h1>
          <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 16, lineHeight: 1.55 }}>
            {page.body}
          </p>
        </div>

        <button
          type="button"
          onClick={returnToApp}
          style={{
            width: '100%',
            height: 52,
            borderRadius: 999,
            border: 'none',
            background: 'linear-gradient(90deg, #5577ff, #00ffcc)',
            color: '#fff',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Return to app
        </button>

        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 13, lineHeight: 1.5 }}>
          {showFallback
            ? 'Close this browser window and return to the app.'
            : 'If the app does not open automatically, close this browser window and return to the app.'}
        </p>
      </section>
    </main>
  );
}
