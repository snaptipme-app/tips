/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — public marketing landing page

   Structure follows a service moment in order: the card on the table, the ten
   seconds, who gets what, where the money actually goes.

   Two things worth knowing before editing:

   1. The hero is a real, scannable QR pointing at /demo. It is the product,
      not a picture of the product. Keep the card light — QR contrast depends
      on it, and it is the one physical object on the page.

   2. Every number here is traceable to source (see client/src/i18n/landing.js
      for the provenance note). There is no invented social proof on this page
      by design — no testimonials, user counts, press logos or ratings. If you
      add a claim, add the file it comes from.

   Layout uses logical properties throughout (padding-inline, border-inline-start,
   text-align: start) so the Arabic RTL pass is structural rather than mirrored.
   ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../components/Logo';
import imgBusiness from '../assets/images/screenshot_business_dashboard.png';
import {
  LANDING_LANGUAGES,
  getLandingCopy,
  getLandingLang,
  isLandingRTL,
  setLandingLang,
} from '../i18n/landing';

/* ── Palette ──────────────────────────────────────────────────────────── */
const INK = '#060607';   // page ground
const SLATE = '#101012'; // raised surface
const MINT = '#00ffcc';  // accent — rules, brackets, marks
const GREEN = '#00C896'; // money, actions
const DEEP = '#04231C';  // text on mint
const PAPER = '#F2EEE6'; // the printed card face
const BONE = '#F6F4F1';  // primary text
const ASH = '#8B8A85';   // muted text — warm, not neutral

const PLAY_URL = 'https://play.google.com/store/apps/details?id=me.snaptip.app';
const APPLE_URL = 'https://apps.apple.com/search?term=SnapTip';
const SUPPORT_EMAIL = 'mailto:support@snaptip.me';

/* Absolute so a phone scanning a desktop screen resolves correctly, and so
   staging scans open staging rather than production. */
const demoUrl = () =>
  (typeof window !== 'undefined' ? window.location.origin : 'https://snaptip.me') + '/demo';
const appUrl = () =>
  (typeof window !== 'undefined' ? window.location.origin : 'https://snaptip.me') + '/#get-app';

/* ── Icons — Ionicons-style outline geometry, hand-rolled to stay dependency
      free. No emoji anywhere on this page by brand rule. ───────────────── */
const Icon = ({ name, size = 20 }) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': 'true',
  };
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    play: <path d="m5 3 14 9-14 9V3Z" />,
    apple: <><path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" /><path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
};

/* ── The signature element: a QR viewfinder's corner marks. The page's only
      decorative device, reused as a section marker. Continuity with the app's
      PrintableQRCard, which already frames codes this way. ──────────────── */
const ScanBrackets = ({ inset = 0, len = 26, thickness = 2, color = MINT, radius = 6 }) => (
  <span aria-hidden="true" className="brackets" style={{ '--bk': color, '--bl': `${len}px`, '--bt': `${thickness}px`, '--bi': `${inset}px`, '--br': `${radius}px` }}>
    <i data-c="tl" /><i data-c="tr" /><i data-c="bl" /><i data-c="br" />
  </span>
);

const SectionMark = () => (
  <span aria-hidden="true" className="sec-mark">
    <i /><i /><i /><i />
  </span>
);

const StoreButton = ({ href, icon, eyebrow, label }) => (
  <a className="store" href={href} aria-label={`${eyebrow} ${label}`}>
    <Icon name={icon} size={22} />
    <span>
      <small>{eyebrow}</small>
      <strong>{label}</strong>
    </span>
  </a>
);

const PaymentMark = ({ name }) => {
  if (name === 'visa') return <span className="pm pm-text" aria-label="Visa" style={{ fontStyle: 'italic', fontWeight: 900, letterSpacing: '0.06em' }}>VISA</span>;
  if (name === 'stripe') return <span className="pm pm-text" aria-label="Stripe" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>stripe</span>;
  if (name === 'mastercard') return (
    <span className="pm" aria-label="Mastercard">
      <svg width="32" height="20" viewBox="0 0 34 20" aria-hidden="true">
        <circle cx="13" cy="10" r="8" fill="currentColor" opacity="0.95" />
        <circle cx="21" cy="10" r="8" fill="currentColor" opacity="0.5" />
      </svg>
    </span>
  );
  if (name === 'applepay') return (
    <span className="pm pm-pay" aria-label="Apple Pay">
      <svg width="13" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" />
        <path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" />
      </svg>
      <strong>Pay</strong>
    </span>
  );
  if (name === 'gpay') return (
    <span className="pm pm-pay" aria-label="Google Pay">
      <span className="gpay" aria-hidden="true">G</span><strong>Pay</strong>
    </span>
  );
  return null;
};

function useReveal(dep) {
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const nodes = document.querySelectorAll('[data-reveal]');
    if (reduce) { nodes.forEach((n) => n.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [dep]);
}

export default function LandingPage() {
  const [lang, setLang] = useState(() => getLandingLang());
  const c = useMemo(() => getLandingCopy(lang), [lang]);
  const rtl = useMemo(() => isLandingRTL(lang), [lang]);

  useReveal(lang);

  useEffect(() => {
    const html = document.documentElement;
    const prevLang = html.lang;
    const prevDir = html.dir;
    html.lang = lang;
    html.dir = rtl ? 'rtl' : 'ltr';
    return () => { html.lang = prevLang; html.dir = prevDir; };
  }, [lang, rtl]);

  const changeLang = (next) => { setLandingLang(next); setLang(next); };

  return (
    <div className={`lp${rtl ? ' lp-rtl' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
      <a className="skip" href="#main">{c.a11y.skip}</a>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="nav">
        <div className="wrap nav-in">
          <Logo href="/" showText size={30} className="brand" textColor={BONE} />
          <nav className="nav-links" aria-label={c.a11y.nav}>
            <a href="#seconds">{c.nav.how}</a>
            <a href="#money">{c.nav.money}</a>
            <a href="#operators">{c.nav.business}</a>
          </nav>
          <div className="nav-right">
            <label className="lang">
              <span className="sr">{c.a11y.lang}</span>
              <Icon name="globe" size={15} />
              <select value={lang} onChange={(e) => changeLang(e.target.value)}>
                {LANDING_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
            <a className="btn btn-p" href="#get-app">{c.nav.app}</a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ── Hero: the card is the product ──────────────────────────── */}
        <section className="hero">
          <div className="wrap hero-in">
            <p className="kicker">{c.hero.eyebrow}</p>
            <h1 className="display hero-t">{c.hero.title}</h1>
            <p className="hero-b">{c.hero.body}</p>

            <Link to="/demo" className="card-link" aria-label={c.hero.scanDesktop}>
              <article className="tipcard">
                <ScanBrackets inset={-11} len={30} />
                <div className="tipcard-top">
                  <Logo size={26} />
                  <span className="tipcard-name">{c.hero.cardName}</span>
                </div>
                <div className="qr-well">
                  <QRCodeSVG
                    value={demoUrl()}
                    size={188}
                    bgColor={PAPER}
                    fgColor="#0B0B0C"
                    level="M"
                    marginSize={0}
                  />
                </div>
                <p className="tipcard-hint">
                  <span className="only-desktop">{c.hero.scanDesktop}</span>
                  <span className="only-mobile">{c.hero.scanMobile}</span>
                </p>
                <p className="tipcard-role">{c.hero.cardRole}</p>
              </article>
            </Link>

            <p className="hero-trust">
              <Icon name="lock" size={13} /> {c.hero.trust}
            </p>
          </div>
        </section>

        {/* ── The ten seconds: time as the page's spine ──────────────── */}
        <section className="sec" id="seconds" data-reveal>
          <div className="wrap">
            <SectionMark />
            <p className="kicker">{c.seconds.kicker}</p>
            <h2 className="display">{c.seconds.title}</h2>
            <ol className="spine">
              {c.seconds.rows.map(([time, text]) => (
                <li key={time}>
                  <span className="spine-t">{time}</span>
                  <span className="spine-x">{text}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Three doors: all three audiences, one band ─────────────── */}
        <section className="sec" data-reveal>
          <div className="wrap">
            <SectionMark />
            <p className="kicker">{c.doors.kicker}</p>
            <ul className="doors">
              {c.doors.items.map(([title, body, cta, href]) => (
                <li key={title}>
                  <h3>{title}</h3>
                  <p>{body}</p>
                  {href.startsWith('/') ? (
                    <Link className="door-cta" to={href}>{cta} <Icon name="arrow" size={15} /></Link>
                  ) : (
                    <a className="door-cta" href={href}>{cta} <Icon name="arrow" size={15} /></a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── The receipt: honest structure where social proof would sit ─ */}
        <section className="sec" id="money" data-reveal>
          <div className="wrap">
            <SectionMark />
            <p className="kicker">{c.money.kicker}</p>
            <h2 className="display">{c.money.title}</h2>

            <div className="receipt">
              <p className="rcpt-head">{c.money.example}</p>
              {c.money.rows.map(([label, amt]) => (
                <div className="rcpt-row" key={label}>
                  <span className="rcpt-l">{label}</span>
                  <span className="rcpt-d" aria-hidden="true" />
                  <span className="rcpt-a">{amt}</span>
                </div>
              ))}
              <div className="rcpt-row rcpt-total">
                <span className="rcpt-l">{c.money.total[0]}</span>
                <span className="rcpt-d" aria-hidden="true" />
                <span className="rcpt-a">{c.money.total[1]}</span>
              </div>
              <div className="rcpt-split" aria-hidden="true" />
              {c.money.zeros.map(([label, amt]) => (
                <div className="rcpt-row rcpt-zero" key={label}>
                  <span className="rcpt-l">{label}</span>
                  <span className="rcpt-d" aria-hidden="true" />
                  <span className="rcpt-a">{amt}</span>
                </div>
              ))}
            </div>
            <p className="note">{c.money.note}</p>
          </div>
        </section>

        {/* ── Operators: the highest-value visitor ───────────────────── */}
        <section className="sec" id="operators" data-reveal>
          <div className="wrap ops">
            <div className="ops-copy">
              <SectionMark />
              <p className="kicker">{c.ops.kicker}</p>
              <h2 className="display">{c.ops.title}</h2>
              <ul className="ticks">
                {c.ops.points.map((p) => (
                  <li key={p}><Icon name="check" size={17} /><span>{p}</span></li>
                ))}
              </ul>
            </div>
            <div className="ops-shot">
              <img
                src={imgBusiness}
                alt=""
                width="1024"
                height="1536"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* ── Reach + trust: quiet type, no count-up ─────────────────── */}
        <section className="sec" data-reveal>
          <div className="wrap">
            <SectionMark />
            <p className="kicker">{c.reach.kicker}</p>
            <div className="reach">
              {c.reach.items.map(([n, label]) => (
                <div key={label}>
                  <span className="reach-n display">{n}</span>
                  <span className="reach-l">{label}</span>
                </div>
              ))}
            </div>
            <p className="note">{c.reach.note}</p>

            <div className="trust">
              <h3 className="display">{c.trust.title}</h3>
              <ul className="ticks">
                {c.trust.points.map((p) => (
                  <li key={p}><Icon name="check" size={17} /><span>{p}</span></li>
                ))}
              </ul>
              <div className="marks">
                <PaymentMark name="stripe" />
                <PaymentMark name="visa" />
                <PaymentMark name="mastercard" />
                <PaymentMark name="applepay" />
                <PaymentMark name="gpay" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Get the app ────────────────────────────────────────────── */}
        <section className="sec get" id="get-app" data-reveal>
          <div className="wrap get-in">
            <div>
              <SectionMark />
              <h2 className="display">{c.app.title}</h2>
              <p className="get-b">{c.app.body}</p>
              <div className="stores">
                <StoreButton href={APPLE_URL} icon="apple" eyebrow={c.app.appleEyebrow} label={c.app.apple} />
                <StoreButton href={PLAY_URL} icon="play" eyebrow={c.app.playEyebrow} label={c.app.play} />
              </div>
            </div>
            <div className="dl">
              <div className="dl-qr">
                <QRCodeSVG value={appUrl()} size={132} bgColor={PAPER} fgColor="#0B0B0C" level="M" marginSize={0} />
              </div>
              <p>{c.app.qr}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="foot">
        <div className="wrap foot-in">
          <Logo href="/" showText size={26} className="brand" textColor={BONE} />
          <nav className="foot-links" aria-label={c.a11y.nav}>
            <a href="/privacy">{c.footer.privacy}</a>
            <a href="/terms">{c.footer.terms}</a>
            <a href={SUPPORT_EMAIL}>{c.footer.contact}</a>
          </nav>
          <span className="foot-c">© {new Date().getFullYear()} {c.footer.rights}</span>
        </div>
      </footer>

      <style>{`
        /* Self-hosted: no CDN round-trip on hotel wifi. Latin subset only —
           Arabic deliberately uses the platform stack instead (see .lp-rtl). */
        @font-face {
          font-family: 'Instrument Serif';
          src: url('/fonts/instrument-serif-latin.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        html { scroll-behavior: smooth; }
        body { background: ${INK}; }

        .lp {
          --ink:${INK}; --slate:${SLATE}; --mint:${MINT}; --green:${GREEN};
          --deep:${DEEP}; --paper:${PAPER}; --bone:${BONE}; --ash:${ASH};
          --line: rgba(255,255,255,0.09);
          --glass: rgba(255,255,255,0.045);
          --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif;
          --mono: ui-monospace, SFMono-Regular, 'SF Mono', Cascadia Mono, Menlo, monospace;
          --display: 'Instrument Serif', Georgia, 'Times New Roman', serif;
          position: relative;
          background: ${INK};
          color: var(--bone);
          font-family: var(--sans);
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }
        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
        /* :where() keeps the reset at zero specificity so a single utility class
           can still set margins. A plain ".lp p" reset would outrank them. */
        :where(.lp) :where(h1, h2, h3, p, ul, ol, figure) { margin: 0; padding: 0; }
        :where(.lp) :where(ul, ol) { list-style: none; }

        /* Arabic gets the platform stack — Instrument Serif has no Arabic
           coverage, and a Latin display face over fallback Arabic is exactly
           the mirrored afterthought this layout is meant to avoid. */
        .lp-rtl {
          --display: 'SF Arabic', 'Geeza Pro', 'Segoe UI', 'Noto Naskh Arabic', 'Traditional Arabic', serif;
        }
        .display {
          font-family: var(--display);
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1.05;
          text-wrap: balance;
        }
        .lp-rtl .display { font-weight: 600; letter-spacing: 0; line-height: 1.3; }

        .wrap { width: 100%; max-width: 1060px; margin-inline: auto; padding-inline: 20px; }

        .skip {
          position: absolute; inset-inline-start: -9999px; top: 10px; z-index: 100;
          background: var(--mint); color: var(--deep); padding: 10px 16px;
          border-radius: 999px; font-weight: 700; text-decoration: none;
        }
        .skip:focus { inset-inline-start: 16px; }
        .sr {
          position: absolute; width: 1px; height: 1px; overflow: hidden;
          clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap;
        }

        .lp a:focus-visible, .lp button:focus-visible, .lp select:focus-visible {
          outline: 2px solid var(--mint);
          outline-offset: 3px;
          border-radius: 8px;
        }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(6,6,7,0.82);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--line);
        }
        .nav-in { display: flex; align-items: center; gap: 16px; height: 62px; }
        .brand { font-family: var(--sans); font-size: 16.5px; font-weight: 700; letter-spacing: -0.01em; }
        .nav-links { display: flex; gap: 26px; margin-inline-start: auto; }
        .nav-links a { color: var(--ash); font-size: 14px; font-weight: 550; text-decoration: none; }
        .nav-links a:hover { color: var(--bone); }
        .nav-right { display: flex; align-items: center; gap: 10px; margin-inline-start: auto; }
        .nav-links + .nav-right { margin-inline-start: 26px; }

        .lang {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--ash); padding-inline: 8px; height: 38px;
          border-radius: 999px; border: 1px solid var(--line); background: var(--glass);
        }
        .lang select {
          appearance: none; background: transparent; border: 0; color: var(--bone);
          font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
          padding-inline-end: 4px;
        }
        .lang select option { background: ${SLATE}; color: ${BONE}; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          min-height: 40px; padding-inline: 18px; border-radius: 999px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          border: 1px solid transparent; white-space: nowrap;
          transition: transform .16s ease, background .18s ease;
        }
        .btn-p { background: var(--mint); color: var(--deep); }
        .btn-p:hover { transform: translateY(-1px); background: #4dffdb; }

        /* ── Hero ── */
        .hero { padding-block: clamp(40px, 9vw, 84px) clamp(48px, 10vw, 96px); }
        .hero-in { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .kicker {
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--mint); margin-bottom: 16px;
        }
        .lp-rtl .kicker { letter-spacing: 0; }
        .hero-t { font-size: clamp(32px, 7vw, 50px); max-width: 15ch; }
        .hero-b {
          max-width: 52ch; margin-top: 16px; color: var(--ash);
          font-size: clamp(15px, 3.6vw, 17px); line-height: 1.65;
        }

        .card-link { display: block; margin-top: clamp(30px, 7vw, 46px); text-decoration: none; }
        .card-link:focus-visible { outline-offset: 12px; }
        .tipcard {
          position: relative;
          width: min(300px, 82vw);
          padding: 22px 20px 20px;
          border-radius: 20px;
          background: linear-gradient(175deg, #FBF9F4 0%, var(--paper) 62%, #E7E2D7 100%);
          box-shadow: 0 30px 70px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
          text-align: center;
          transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease;
        }
        .card-link:hover .tipcard {
          transform: translateY(-4px);
          box-shadow: 0 40px 90px rgba(0,0,0,0.6), 0 0 60px rgba(0,255,204,0.09), 0 0 0 1px rgba(255,255,255,0.08);
        }
        .tipcard-top {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          margin-bottom: 16px;
        }
        .tipcard-name { color: #14140F; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
        .qr-well {
          display: grid; place-items: center;
          padding: 12px; border-radius: 14px; background: var(--paper);
        }
        .qr-well svg { display: block; width: 100%; height: auto; max-width: 188px; }
        .tipcard-hint {
          margin-top: 16px; color: #14140F;
          font-size: 13.5px; font-weight: 700; letter-spacing: -0.005em;
        }
        .tipcard-role { margin-top: 5px; color: #6D6A5F; font-size: 11.5px; font-weight: 600; }
        .only-mobile { display: none; }

        .hero-trust {
          display: inline-flex; align-items: center; gap: 7px; flex-wrap: wrap;
          justify-content: center; margin-top: 34px;
          color: #6F6E6A; font-size: 12.5px; font-weight: 550;
        }
        .hero-trust svg { color: var(--green); }

        /* ── Scan-bracket motif ── */
        .brackets { position: absolute; inset: var(--bi); pointer-events: none; }
        .brackets i {
          position: absolute; width: var(--bl); height: var(--bl);
          border: 0 solid var(--bk); opacity: .9;
        }
        .brackets i[data-c="tl"] { top: 0; inset-inline-start: 0; border-top-width: var(--bt); border-inline-start-width: var(--bt); border-start-start-radius: var(--br); }
        .brackets i[data-c="tr"] { top: 0; inset-inline-end: 0; border-top-width: var(--bt); border-inline-end-width: var(--bt); border-start-end-radius: var(--br); }
        .brackets i[data-c="bl"] { bottom: 0; inset-inline-start: 0; border-bottom-width: var(--bt); border-inline-start-width: var(--bt); border-end-start-radius: var(--br); }
        .brackets i[data-c="br"] { bottom: 0; inset-inline-end: 0; border-bottom-width: var(--bt); border-inline-end-width: var(--bt); border-end-end-radius: var(--br); }

        .sec-mark { display: grid; grid-template-columns: 5px 5px; gap: 3px; margin-bottom: 22px; }
        .sec-mark i { width: 5px; height: 5px; background: var(--mint); opacity: .75; }
        .sec-mark i:nth-child(2), .sec-mark i:nth-child(3) { opacity: .28; }

        /* ── Sections ── */
        .sec { padding-block: clamp(56px, 11vw, 104px); }
        .sec h2 { font-size: clamp(27px, 5.6vw, 41px); max-width: 20ch; }
        .note {
          max-width: 62ch; margin-top: 22px; color: #6F6E6A;
          font-size: 13.5px; line-height: 1.7;
        }

        /* ── Ten seconds spine ── */
        .spine {
          margin-top: clamp(28px, 6vw, 44px);
          border-inline-start: 1px solid rgba(0,255,204,0.25);
          padding-inline-start: 26px;
          display: grid; gap: clamp(20px, 4.4vw, 30px);
        }
        .spine li { position: relative; display: grid; gap: 5px; }
        .spine li::before {
          content: ''; position: absolute; top: 7px;
          inset-inline-start: calc(-26px - 4px);
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--mint); box-shadow: 0 0 0 4px ${INK};
        }
        .spine-t {
          font-family: var(--mono); font-size: 12px; font-weight: 600;
          letter-spacing: 0.06em; color: var(--mint);
          font-variant-numeric: tabular-nums;
        }
        .spine-x { font-size: clamp(15.5px, 3.7vw, 18px); line-height: 1.55; color: #D6D4CE; max-width: 46ch; }

        /* ── Three doors ── */
        .doors { margin-top: 30px; display: grid; gap: 1px; background: var(--line); border-block: 1px solid var(--line); }
        .doors li { background: ${INK}; padding-block: clamp(22px, 4.6vw, 30px); display: grid; gap: 7px; }
        .doors h3 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
        .doors p { color: var(--ash); font-size: 15px; line-height: 1.6; max-width: 48ch; }
        .door-cta {
          justify-self: start; display: inline-flex; align-items: center; gap: 6px;
          margin-top: 4px; color: var(--mint); font-size: 14px; font-weight: 650; text-decoration: none;
        }
        .door-cta svg { transition: transform .2s ease; }
        .lp-rtl .door-cta svg { transform: scaleX(-1); }
        .door-cta:hover svg { transform: translateX(3px); }
        .lp-rtl .door-cta:hover svg { transform: scaleX(-1) translateX(3px); }

        /* ── Receipt ── */
        .receipt {
          margin-top: clamp(26px, 5.5vw, 40px);
          max-width: 560px; padding: clamp(20px, 4.5vw, 30px);
          border: 1px solid var(--line); border-radius: 16px;
          background: linear-gradient(180deg, var(--glass), rgba(255,255,255,0.015));
          font-family: var(--mono);
        }
        .rcpt-head {
          font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
          color: #6F6E6A; margin-bottom: 18px;
        }
        .lp-rtl .rcpt-head { letter-spacing: 0; }
        .rcpt-row { display: flex; align-items: baseline; gap: 8px; padding-block: 9px; font-size: 13.5px; }
        .rcpt-l { color: #C4C2BC; }
        .rcpt-d { flex: 1; border-bottom: 1px dotted rgba(255,255,255,0.18); transform: translateY(-3px); min-width: 18px; }
        .rcpt-a { color: var(--bone); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .rcpt-total { padding-top: 14px; margin-top: 5px; border-top: 1px solid var(--line); }
        .rcpt-total .rcpt-l { color: var(--bone); font-weight: 600; }
        .rcpt-total .rcpt-a { color: var(--green); font-size: 16px; font-weight: 700; }
        .rcpt-split { height: 1px; margin-block: 16px; background: repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 5px, transparent 5px 10px); }
        .rcpt-zero .rcpt-l, .rcpt-zero .rcpt-a { color: #6F6E6A; }

        /* ── Operators ── */
        .ops { display: grid; gap: clamp(32px, 6vw, 56px); }
        .ticks { margin-top: 24px; display: grid; gap: 13px; }
        .ticks li { display: grid; grid-template-columns: auto 1fr; gap: 11px; align-items: start; }
        .ticks svg { color: var(--green); margin-top: 3px; }
        .ticks span { color: #D6D4CE; font-size: 15.5px; line-height: 1.55; }
        .ops-shot {
          position: relative; justify-self: center;
          width: min(100%, 300px); padding: 10px;
          border-radius: 26px; background: ${SLATE};
          border: 1px solid var(--line);
          box-shadow: 0 30px 70px rgba(0,0,0,0.5);
        }
        .ops-shot img { width: 100%; height: auto; display: block; border-radius: 18px; }

        /* ── Reach ── */
        .reach { margin-top: 30px; display: grid; gap: 26px; }
        .reach > div { display: grid; gap: 5px; padding-inline-start: 16px; border-inline-start: 2px solid rgba(0,255,204,0.3); }
        .reach-n { font-size: clamp(34px, 8vw, 50px); color: var(--bone); font-variant-numeric: tabular-nums; }
        .reach-l { color: var(--ash); font-size: 14.5px; line-height: 1.5; }

        .trust { margin-top: clamp(50px, 9vw, 78px); padding-top: clamp(34px, 6vw, 48px); border-top: 1px solid var(--line); }
        .trust h3 { font-size: clamp(23px, 4.6vw, 30px); }
        .marks { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 28px; }
        .pm { display: inline-flex; align-items: center; gap: 4px; color: #6F6E6A; height: 20px; }
        .pm-text { font-size: 14px; }
        .pm-pay { font-size: 13px; gap: 3px; }
        .pm-pay strong { font-weight: 700; }
        .gpay {
          display: inline-grid; place-items: center; width: 15px; height: 15px;
          border-radius: 50%; background: currentColor; color: ${INK};
          font-weight: 800; font-size: 10px;
        }

        /* ── Get the app ── */
        .get-in { display: grid; gap: clamp(30px, 6vw, 50px); align-items: center; }
        .get h2 { font-size: clamp(28px, 6vw, 42px); }
        .get-b { margin-top: 14px; color: var(--ash); font-size: 16px; line-height: 1.6; }
        .stores { display: grid; gap: 10px; margin-top: 26px; max-width: 300px; }
        .store {
          display: flex; align-items: center; gap: 12px;
          min-height: 56px; padding-inline: 16px; border-radius: 14px;
          background: var(--glass); border: 1px solid var(--line);
          color: var(--bone); text-decoration: none; text-align: start;
          transition: border-color .2s ease, background .2s ease;
        }
        .store:hover { border-color: rgba(0,255,204,0.3); background: rgba(255,255,255,0.06); }
        .store small { display: block; color: var(--ash); font-size: 11px; line-height: 1.2; }
        .store strong { display: block; font-size: 15px; line-height: 1.25; }
        .dl { justify-self: center; text-align: center; }
        .dl-qr { padding: 12px; border-radius: 16px; background: var(--paper); display: inline-flex; }
        .dl-qr svg { display: block; }
        .dl p { margin-top: 12px; color: var(--ash); font-size: 13px; font-weight: 600; }

        /* ── Footer ── */
        .foot { border-top: 1px solid var(--line); padding-block: 32px 40px; }
        .foot-in { display: grid; gap: 20px; justify-items: start; }
        .foot-links { display: flex; gap: 22px; flex-wrap: wrap; }
        .foot-links a { color: var(--ash); font-size: 14px; text-decoration: none; }
        .foot-links a:hover { color: var(--bone); }
        .foot-c { color: #5F5E5A; font-size: 12.5px; }

        /* ── Reveal ── */
        [data-reveal] { opacity: 0; transform: translateY(18px); transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); }
        [data-reveal].in { opacity: 1; transform: none; }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .lp *, .lp *::before, .lp *::after {
            animation-duration: .001ms !important; animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }
          [data-reveal] { opacity: 1; transform: none; }
          .card-link:hover .tipcard { transform: none; }
        }

        /* ── Phone first, so these widen rather than repair ── */
        @media (max-width: 720px) {
          .nav-links { display: none; }
          .only-desktop { display: none; }
          .only-mobile { display: inline; }
          .lang { height: 36px; }
        }

        @media (min-width: 721px) {
          .hero-in { padding-block: 10px; }
          .doors { grid-template-columns: repeat(3, 1fr); gap: 1px; }
          .doors li { padding-inline: 24px; }
          .doors li:first-child { padding-inline-start: 0; }
          .reach { grid-template-columns: repeat(3, 1fr); gap: 30px; }
          .ops { grid-template-columns: 1fr 0.8fr; align-items: center; }
          .get-in { grid-template-columns: 1fr auto; }
          .foot-in { grid-template-columns: auto 1fr auto; align-items: center; justify-items: initial; }
          .foot-links { justify-content: center; }
        }

        @media (min-width: 1000px) {
          .lp { font-size: 17px; }
        }
      `}</style>
    </div>
  );
}
