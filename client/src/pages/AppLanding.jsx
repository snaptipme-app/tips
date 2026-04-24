import { useEffect, useRef } from 'react';

/* ─── design tokens ──────────────────────────────────────────────────── */
const BG      = '#080818';
const GREEN   = '#00C896';
const ACCENT  = '#6c6cff';
const GREEN2  = '#00ff88';

/* ─── SVG logos ──────────────────────────────────────────────────────── */
const SnapTipSVG = ({ size = 36 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width={size} height={size} style={{ borderRadius: 12, display: 'block', flexShrink: 0 }}>
    <rect width="1024" height="1024" rx="220" fill="#080818" />
    <path d="M620 200 L340 580 H540 L440 840 L720 460 H520 L620 200 Z" fill="#00FF66" stroke="#00FF66" strokeWidth="14" strokeLinejoin="round" />
  </svg>
);

const AndroidIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M17.523 15.341a1.004 1.004 0 0 1-1.004-1.003 1.003 1.003 0 1 1 1.004 1.003zm-11.046 0a1.003 1.003 0 1 1 0-2.007 1.003 1.003 0 0 1 0 2.007zm11.404-6.261-1.961-3.39a.4.4 0 0 0-.546-.146.4.4 0 0 0-.147.546l1.94 3.355A11.83 11.83 0 0 0 12 8.333c-1.82 0-3.536.424-5.056 1.175l1.94-3.357a.4.4 0 0 0-.147-.546.4.4 0 0 0-.546.147L6.12 9.08A11.878 11.878 0 0 0 .333 19.5h23.334A11.878 11.878 0 0 0 17.881 9.08z" />
  </svg>
);

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

const BoltIcon = ({ color = GREEN, size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color}>
    <path d="M13 2L4.5 13.5H11L9 22L20 10H13.5L16 2Z" />
  </svg>
);

const GlobeIcon = ({ color = ACCENT, size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const WalletIcon = ({ color = '#a855f7', size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M16 12h2" />
    <path d="M2 10h20" />
  </svg>
);

const QRIcon = ({ color = '#f59e0b', size = 22 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="6" y="6" width="1" height="1" fill={color} />
    <rect x="17" y="6" width="1" height="1" fill={color} />
    <rect x="6" y="17" width="1" height="1" fill={color} />
    <path d="M14 14h2v2h-2zM18 14h3M14 18h1M18 18h3M18 20v-2" />
  </svg>
);

/* ─── features data ──────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <BoltIcon color={GREEN} size={24} />,
    bg: 'rgba(0,200,150,0.10)',
    border: 'rgba(0,200,150,0.18)',
    title: 'Quick Setup',
    desc: 'Register in under 2 minutes. Generate your smart QR code instantly and share it with anyone.',
  },
  {
    icon: <GlobeIcon color={ACCENT} size={24} />,
    bg: 'rgba(108,108,255,0.10)',
    border: 'rgba(108,108,255,0.18)',
    title: 'Global Payments',
    desc: 'Accept tips in MAD, EUR, USD, AED and more. Multi-currency support built in from day one.',
  },
  {
    icon: <WalletIcon color="#a855f7" size={24} />,
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.18)',
    title: 'Instant Withdrawals',
    desc: 'Cash out your balance at any time. Your earnings, your wallet — always in your control.',
  },
];

/* ─── component ──────────────────────────────────────────────────────── */
export default function AppLanding() {
  /* subtle parallax glow on mouse move */
  const glowRef = useRef(null);
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    const handle = (e) => {
      const x = (e.clientX / window.innerWidth  - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Inter', sans-serif", overflowX: 'hidden', color: '#fff' }}>

      {/* ── ambient glow ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div ref={glowRef} style={{ transition: 'transform 0.6s ease', position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 700, background: `radial-gradient(ellipse at center, rgba(0,200,150,0.12) 0%, rgba(108,108,255,0.06) 50%, transparent 80%)`, borderRadius: '50%', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(108,108,255,0.10) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)' }} />
      </div>

      {/* ════════════════════ NAVBAR ════════════════════ */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)', background: 'rgba(8,8,24,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SnapTipSVG size={36} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: '#fff' }}>SnapTip</span>
        </div>
        <a
          href="/admin/oh"
          style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', padding: '6px 14px', borderRadius: 50, border: '1px solid rgba(255,255,255,0.08)', transition: 'color 0.2s, border-color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          Admin
        </a>
      </nav>

      {/* ════════════════════ HERO ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '100px 24px 80px' }}>

        {/* badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,200,150,0.10)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 50, padding: '6px 16px', marginBottom: 32 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, boxShadow: '0 0 8px #00C896' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN, letterSpacing: 0.5 }}>Now Available on Android</span>
        </div>

        {/* headline */}
        <h1 style={{ fontSize: 'clamp(38px, 7vw, 76px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -2, margin: '0 auto 24px', maxWidth: 860 }}>
          The Future of{' '}
          <span style={{ background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN2} 50%, ${ACCENT} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Digital Tipping.
          </span>
        </h1>

        {/* subtitle */}
        <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 48px', fontWeight: 400 }}>
          No cash? No problem. Receive tips directly from your phone. Download the SnapTip app to generate your smart QR code and start earning in seconds.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://github.com/snaptipme-app/tips/releases/latest/download/snaptip.apk"
            download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: `linear-gradient(135deg, ${GREEN} 0%, #00e8aa 100%)`,
              color: '#080818', fontWeight: 800, fontSize: 16,
              padding: '14px 28px', borderRadius: 50,
              boxShadow: '0 8px 32px rgba(0,200,150,0.35)',
              textDecoration: 'none', transition: 'transform 0.2s, box-shadow 0.2s',
              border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(0,200,150,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,200,150,0.35)'; }}
          >
            <AndroidIcon />
            Download APK (Android)
          </a>

          <button
            disabled
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: 16,
              padding: '14px 28px', borderRadius: 50,
              cursor: 'not-allowed', transition: 'opacity 0.2s',
            }}
          >
            <AppleIcon />
            Coming soon on App Store
          </button>
        </div>
      </section>

      {/* ════════════════════ FEATURES ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, padding: '40px 24px 100px', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 16 }}>Why SnapTip</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, letterSpacing: -0.8, marginBottom: 48, color: '#fff' }}>
          Built for the modern service industry
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${f.border}`,
                borderRadius: 20,
                padding: '28px 26px',
                transition: 'transform 0.25s, box-shadow 0.25s',
                cursor: 'default',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${f.border}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 10, letterSpacing: -0.3 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, fontWeight: 400 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════ HOW IT WORKS ════════════════════ */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 100px', textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 24, padding: '48px 36px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, letterSpacing: -0.5, marginBottom: 40, color: '#fff' }}>
            Three steps to your first tip
          </h2>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { step: '01', label: 'Download the App', desc: 'Install SnapTip on your Android device in seconds.' },
              { step: '02', label: 'Create Your Profile', desc: 'Register, add your photo and job title.' },
              { step: '03', label: 'Share Your QR Code', desc: 'Print or display your QR. Tourists scan and tip instantly.' },
            ].map((s, i) => (
              <div key={i} style={{ flex: '1 1 180px', padding: '0 20px', position: 'relative' }}>
                {i < 2 && (
                  <div style={{ display: 'none', position: 'absolute', top: 16, right: 0, width: '40%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
                )}
                <div style={{ fontSize: 32, fontWeight: 900, background: `linear-gradient(135deg, ${GREEN}, ${ACCENT})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 10 }}>{s.step}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, background: 'rgba(8,8,24,0.5)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SnapTipSVG size={24} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
            © {new Date().getFullYear()} SnapTip. All rights reserved.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="mailto:support@snaptip.me" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            Contact Support
          </a>
          <a href="/admin/oh" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}>
            Admin
          </a>
        </div>
      </footer>

      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${BG}; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        section { animation: fadeUp 0.7s ease-out both; }
        section:nth-child(2) { animation-delay: 0.1s; }
        section:nth-child(3) { animation-delay: 0.2s; }
        section:nth-child(4) { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
}
