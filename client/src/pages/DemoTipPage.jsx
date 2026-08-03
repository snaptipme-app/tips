/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — /demo
   The destination for the landing page hero QR.

   Deliberately self-contained: no API calls, no Stripe, no employee lookup.
   It exists so a visitor who scans the hero code lands on something real
   rather than an app-store redirect.

   It collects NO payment details of any kind — there is no card field to type
   into. "Pay" advances a local state machine and nothing else. Combined with
   the persistent demo banner, there is no path where someone believes they
   have been charged.
   ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLandingCopy, getLandingLang, isLandingRTL } from '../i18n/landing';

const MINT = '#00ffcc';
const GREEN = '#00C896';
const ON_MINT = '#04231C';

const TIERS = [5, 15, 25, 50];
const POPULAR_INDEX = 1;

const Icon = ({ name, size = 20 }) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': 'true',
  };
  const paths = {
    person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></>,
    star: <path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17.2 6.4 20.1l1.2-6.2L3 9.6l6.3-.8L12 3Z" />,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    back: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
};

export default function DemoTipPage() {
  const lang = useMemo(() => getLandingLang(), []);
  const c = useMemo(() => getLandingCopy(lang), [lang]);
  const rtl = useMemo(() => isLandingRTL(lang), [lang]);
  const t = c.demo;

  const [amount, setAmount] = useState(TIERS[POPULAR_INDEX]);
  const [custom, setCustom] = useState('');
  const [rating, setRating] = useState(0);
  const [stage, setStage] = useState('choose'); // choose → paying → done

  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.lang;
    const prevDir = html.dir;
    html.lang = lang;
    html.dir = rtl ? 'rtl' : 'ltr';
    return () => { html.lang = prevLang; html.dir = prevDir; };
  }, [lang, rtl]);

  const effective = custom ? Math.max(0, Number(custom) || 0) : amount;

  const submit = () => {
    if (stage !== 'choose' || effective <= 0) return;
    setStage('paying');
    // Purely cosmetic — mirrors the beat of a real confirmation, charges nothing.
    setTimeout(() => setStage('done'), 900);
  };

  const reset = () => {
    setStage('choose');
    setAmount(TIERS[POPULAR_INDEX]);
    setCustom('');
    setRating(0);
  };

  const shell = {
    minHeight: '100dvh',
    background: 'radial-gradient(circle at 50% 0%, rgba(0,255,204,0.08) 0%, transparent 55%), #000',
    color: '#fff',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 16px 40px',
  };

  const card = {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={shell}>
      <style>{`
        .demo-chip, .demo-star, .demo-pay, .demo-link { font-family: inherit; }
        .demo-chip:focus-visible, .demo-star:focus-visible,
        .demo-pay:focus-visible, .demo-link:focus-visible {
          outline: 2px solid ${MINT};
          outline-offset: 3px;
          border-radius: 12px;
        }
        .demo-input:focus-visible { outline: 2px solid ${MINT}; outline-offset: 2px; }
        @keyframes demoIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes demoSpin { to { transform: rotate(360deg); } }
        .demo-anim { animation: demoIn .35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .demo-anim { animation: none; }
          .demo-spinner { animation: none !important; }
        }
      `}</style>

      {/* Persistent, unmissable: this is not a real payment surface. */}
      <div
        role="note"
        style={{
          width: '100%', maxWidth: 420, marginTop: 14, marginBottom: 18,
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', borderRadius: 14,
          background: 'rgba(0,255,204,0.07)',
          border: '1px solid rgba(0,255,204,0.22)',
        }}
      >
        <span style={{ color: MINT, flexShrink: 0, marginTop: 1 }}><Icon name="info" size={18} /></span>
        <div>
          <strong style={{ display: 'block', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: MINT, marginBottom: 3 }}>
            {t.badge}
          </strong>
          <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#c9c9c4' }}>{t.notice}</span>
        </div>
      </div>

      {stage === 'done' ? (
        <div className="demo-anim" style={{ ...card, padding: '36px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 18px',
            display: 'grid', placeItems: 'center',
            background: 'rgba(0,255,204,0.12)', color: MINT,
          }}>
            <Icon name="check" size={30} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 10px' }}>{t.done}</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#a3a39e', margin: '0 0 24px' }}>{t.doneBody}</p>
          <button
            type="button"
            className="demo-pay"
            onClick={reset}
            style={{
              width: '100%', height: 52, borderRadius: 50, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${MINT} 0%, ${GREEN} 100%)`,
              color: ON_MINT, fontSize: 15.5, fontWeight: 700, marginBottom: 12,
            }}
          >
            {t.again}
          </button>
          <Link
            to="/"
            className="demo-link"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#8b8a85', fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
            }}
          >
            <span style={{ transform: rtl ? 'scaleX(-1)' : 'none', display: 'inline-flex' }}>
              <Icon name="back" size={16} />
            </span>
            {t.back}
          </Link>
        </div>
      ) : (
        <div className="demo-anim" style={{ ...card, padding: 20 }}>
          {/* Who you're tipping */}
          <div style={{ textAlign: 'center', marginBottom: 22 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', margin: '0 auto 12px',
              display: 'grid', placeItems: 'center',
              background: 'rgba(0,200,150,0.14)',
              border: '1px solid rgba(0,255,204,0.25)',
              color: MINT,
            }}>
              <Icon name="person" size={34} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{t.name}</h1>
            <p style={{ fontSize: 13.5, color: '#8b8a85', margin: 0 }}>{t.role}</p>
            <p style={{ fontSize: 14.5, color: '#c9c9c4', margin: '14px 0 0' }}>{t.tagline}</p>
          </div>

          {/* Amounts */}
          <p style={{
            fontSize: 11.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#6f6e6a', margin: '0 0 10px',
          }}>
            {t.choose}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {TIERS.map((value, i) => {
              const active = !custom && amount === value;
              return (
                <button
                  key={value}
                  type="button"
                  className="demo-chip"
                  aria-pressed={active}
                  onClick={() => { setAmount(value); setCustom(''); }}
                  style={{
                    position: 'relative', textAlign: 'start', cursor: 'pointer',
                    padding: '14px 14px', borderRadius: 14,
                    background: active ? 'rgba(0,255,204,0.08)' : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${active ? 'rgba(0,255,204,0.55)' : 'rgba(255,255,255,0.07)'}`,
                    color: '#fff', transition: 'border-color .15s, background .15s',
                  }}
                >
                  {i === POPULAR_INDEX && (
                    <span style={{
                      position: 'absolute', top: -8, insetInlineEnd: 10,
                      padding: '2px 8px', borderRadius: 999,
                      background: MINT, color: ON_MINT,
                      fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>
                      {t.popular}
                    </span>
                  )}
                  <span style={{ display: 'block', fontSize: 13, color: '#a3a39e', marginBottom: 3 }}>
                    {t.amounts[i]}
                  </span>
                  <span style={{ display: 'block', fontSize: 19, fontWeight: 700 }}>${value}</span>
                </button>
              );
            })}
          </div>

          {/* Custom */}
          <label style={{ display: 'block', marginBottom: 18 }}>
            <span style={{ display: 'block', fontSize: 13, color: '#8b8a85', marginBottom: 7 }}>{t.custom}</span>
            <input
              className="demo-input"
              type="number"
              inputMode="decimal"
              min="1"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="$"
              style={{
                width: '100%', height: 50, borderRadius: 14, padding: '0 14px',
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${custom ? 'rgba(0,255,204,0.5)' : 'rgba(255,255,255,0.07)'}`,
                color: '#fff', fontSize: 16, fontFamily: 'inherit',
              }}
            />
          </label>

          {/* Rating */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'block', fontSize: 13, color: '#8b8a85', marginBottom: 9 }}>
              {t.rate} <span style={{ color: '#5f5e5a' }}>· {t.optional}</span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="demo-star"
                  aria-label={`${n}`}
                  aria-pressed={rating === n}
                  onClick={() => setRating(n)}
                  style={{
                    width: 42, height: 42, borderRadius: 12, cursor: 'pointer',
                    display: 'grid', placeItems: 'center',
                    background: 'rgba(255,255,255,0.035)',
                    border: `1px solid ${n <= rating ? 'rgba(0,255,204,0.45)' : 'rgba(255,255,255,0.07)'}`,
                    color: n <= rating ? MINT : '#5f5e5a',
                    transition: 'color .15s, border-color .15s',
                  }}
                >
                  <Icon name="star" size={19} />
                </button>
              ))}
            </div>
          </div>

          {/* Pay — advances local state, contacts nothing */}
          <button
            type="button"
            className="demo-pay"
            onClick={submit}
            disabled={stage === 'paying' || effective <= 0}
            style={{
              width: '100%', height: 56, borderRadius: 50, border: 'none',
              cursor: stage === 'paying' || effective <= 0 ? 'default' : 'pointer',
              background: effective > 0
                ? `linear-gradient(135deg, ${MINT} 0%, ${GREEN} 100%)`
                : 'rgba(255,255,255,0.08)',
              color: effective > 0 ? ON_MINT : '#6f6e6a',
              fontSize: 16.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
            }}
          >
            {stage === 'paying' ? (
              <span
                className="demo-spinner"
                style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${ON_MINT}`, borderTopColor: 'transparent',
                  animation: 'demoSpin .6s linear infinite',
                }}
              />
            ) : (
              <>{t.pay} ${effective || 0}</>
            )}
          </button>

          <p style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            margin: '14px 0 0', fontSize: 12.5, color: '#6f6e6a',
          }}>
            <span style={{ color: GREEN, display: 'inline-flex' }}><Icon name="lock" size={13} /></span>
            {t.secure}
          </p>
        </div>
      )}
    </div>
  );
}
