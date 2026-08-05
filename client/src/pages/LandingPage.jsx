/* ──────────────────────────────────────────────────────────────────────────
   SnapTip — public marketing landing page

   Consumer-app structure (inDrive / Grab shape): a big bold hero, a stats band,
   short numbered steps, then one full alternating section per real product
   screenshot, repeated download CTAs, and a wide footer.

   Brand stays dark: near-black ground, mint accent, pill buttons, Ionicons-style
   outline icons, no emoji anywhere.

   Two things worth knowing before editing:

   1. Every number on this page is traceable to source — see the provenance note
      in client/src/i18n/landing.js. There is no invented social proof here by
      design: no testimonials, user counts, press logos or star ratings. If you
      add a claim, add the file it comes from.

   2. Layout uses logical properties throughout (padding-inline, text-align:start,
      inset-inline) so the Arabic RTL pass is structural rather than mirrored.
      The alternating image/copy rows flip automatically under dir="rtl".
   ────────────────────────────────────────────────────────────────────────── */

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../components/Logo';
import img3Screens from '../assets/images/screenshot_3images.png';
import imgGuest from '../assets/images/screenshot_tourist_page.png';
import imgStaff from '../assets/images/screenshot_employee_page.png';
import imgBusiness from '../assets/images/screenshot_business_dashboard.png';
import imgPayout from '../assets/images/screenshot_employee_settings.png';
import {
  LANDING_LANGUAGES,
  getLandingCopy,
  getLandingLang,
  isLandingRTL,
  setLandingLang,
} from '../i18n/landing';

/* ── Palette ──────────────────────────────────────────────────────────── */
const INK = '#0A0A0B';
const BAND = '#101013';
const MINT = '#00ffcc';
const GREEN = '#00C896';
const DEEP = '#04231C';
const MUTED = '#9A9A96';

const PLAY_URL = 'https://play.google.com/store/apps/details?id=me.snaptip.app';
const APPLE_URL = 'https://apps.apple.com/search?term=SnapTip';
const SUPPORT_EMAIL = 'mailto:support@snaptip.me';

const appUrl = () =>
  (typeof window !== 'undefined' ? window.location.origin : 'https://snaptip.me') + '/#get-app';

/* ── Icons — Ionicons-style outline geometry, hand-rolled to stay dependency
      free. No emoji anywhere on this page by brand rule. ───────────────── */
const Icon = ({ name, size = 20 }) => {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': 'true',
  };
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    play: <path d="m5 3 14 9-14 9V3Z" />,
    apple: <><path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" /><path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" /></>,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
};

const StoreButton = ({ href, icon, eyebrow, label, solid }) => (
  <a className={`store${solid ? ' store-solid' : ''}`} href={href} aria-label={`${eyebrow} ${label}`}>
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

/* One product section: copy on one side, a real screenshot on the other.
   `flip` alternates the sides; under dir="rtl" the whole grid mirrors. */
const Showcase = ({ id, block, image, flip, band, eager }) => (
  <section className={`sec${band ? ' band' : ''}`} id={id} data-reveal>
    <div className={`wrap row${flip ? ' flip' : ''}`}>
      <div className="row-copy">
        <p className="kicker">{block.kicker}</p>
        <h2>{block.title}</h2>
        <p className="lede">{block.body}</p>
        <ul className="ticks">
          {block.points.map((pt) => (
            <li key={pt}><Icon name="check" size={18} /><span>{pt}</span></li>
          ))}
        </ul>
      </div>
      <div className="row-media">
        <div className="shot">
          <img
            src={image}
            alt={block.alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      </div>
    </div>
  </section>
);

/* Scroll reveal, built to fail open.
   The hidden state is gated behind .reveal-armed, which only JS adds — so if
   this hook never runs (JS error, blocked bundle) the page renders fully
   visible instead of blank. The timeout covers the other direction: an
   environment where IntersectionObserver exists but never reports. For a page
   whose whole job is conversion, a missed animation is cheap and a blank page
   is not. */
function useReveal(dep) {
  useLayoutEffect(() => {
    const root = document.querySelector('.lp');
    if (!root) return;

    const nodes = [...document.querySelectorAll('[data-reveal]')];
    const revealAll = () => nodes.forEach((n) => n.classList.add('in'));

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { revealAll(); return; }

    root.classList.add('reveal-armed');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach((n) => io.observe(n));

    const safety = setTimeout(revealAll, 2500);
    return () => { clearTimeout(safety); io.disconnect(); root.classList.remove('reveal-armed'); };
  }, [dep]);
}

export default function LandingPage() {
  const [lang, setLang] = useState(() => getLandingLang());
  const [menuOpen, setMenuOpen] = useState(false);
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
          <Logo href="/" showText size={30} className="brand" textColor="#fff" />

          <nav className="nav-links" aria-label={c.a11y.nav}>
            <a href="#how">{c.nav.how}</a>
            <a href="#staff">{c.nav.staff}</a>
            <a href="#business">{c.nav.business}</a>
            <a href="#pricing">{c.nav.pricing}</a>
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
            <a className="btn btn-mint nav-cta" href="#get-app">{c.nav.app}</a>
            <button
              type="button"
              className="burger"
              aria-label={c.a11y.nav}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="drawer">
            <a href="#how" onClick={() => setMenuOpen(false)}>{c.nav.how}</a>
            <a href="#staff" onClick={() => setMenuOpen(false)}>{c.nav.staff}</a>
            <a href="#business" onClick={() => setMenuOpen(false)}>{c.nav.business}</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>{c.nav.pricing}</a>
            <a className="drawer-cta" href="#get-app" onClick={() => setMenuOpen(false)}>{c.nav.app}</a>
          </div>
        )}
      </header>

      <main id="main">
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="hero">
          <div className="wrap hero-in">
            <p className="kicker">{c.hero.eyebrow}</p>
            <h1>{c.hero.title}</h1>
            <p className="lede hero-lede">{c.hero.body}</p>

            <div className="hero-cta">
              <StoreButton href={APPLE_URL} icon="apple" eyebrow={c.app.appleEyebrow} label={c.app.apple} solid />
              <StoreButton href={PLAY_URL} icon="play" eyebrow={c.app.playEyebrow} label={c.app.play} solid />
            </div>

            <p className="hero-trust"><Icon name="lock" size={13} /> {c.hero.trust}</p>
          </div>

          <div className="hero-shot wrap">
            <img
              src={img3Screens}
              alt={c.hero.alt}
              width="1678"
              height="937"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        </section>

        {/* ── Stats band ─────────────────────────────────────────────── */}
        <section className="stats" data-reveal aria-label={c.hero.eyebrow}>
          <div className="wrap stats-in">
            {c.stats.map(([n, label]) => (
              <div className="stat" key={label}>
                <span className="stat-n">{n}</span>
                <span className="stat-l">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────── */}
        <section className="sec band" id="how" data-reveal>
          <div className="wrap">
            <p className="kicker">{c.how.kicker}</p>
            <h2 className="center-h">{c.how.title}</h2>
            <ol className="steps">
              {c.how.steps.map(([title, body], i) => (
                <li key={title}>
                  <span className="step-n">{i + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── One section per real screenshot ────────────────────────── */}
        <Showcase id="guests" block={c.guest} image={imgGuest} />
        <Showcase id="staff" block={c.staff} image={imgStaff} flip band />
        <Showcase id="business" block={c.business} image={imgBusiness} />
        <Showcase id="payout" block={c.payout} image={imgPayout} flip band />

        {/* ── Pricing ────────────────────────────────────────────────── */}
        <section className="sec" id="pricing" data-reveal>
          <div className="wrap">
            <div className="price-card">
              <p className="kicker">{c.pricing.kicker}</p>
              <h2>{c.pricing.title}</h2>
              <p className="lede">{c.pricing.body}</p>
              <ul className="ticks price-ticks">
                {c.pricing.points.map((pt) => (
                  <li key={pt}><Icon name="check" size={18} /><span>{pt}</span></li>
                ))}
              </ul>
              <p className="price-note">{c.pricing.note}</p>
            </div>
          </div>
        </section>

        {/* ── Trust ──────────────────────────────────────────────────── */}
        <section className="sec band" data-reveal>
          <div className="wrap">
            <p className="kicker">{c.trust.kicker}</p>
            <h2>{c.trust.title}</h2>
            <ul className="ticks trust-ticks">
              {c.trust.points.map((pt) => (
                <li key={pt}><Icon name="check" size={18} /><span>{pt}</span></li>
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
        </section>

        {/* ── Download ───────────────────────────────────────────────── */}
        <section className="get" id="get-app" data-reveal>
          <div className="wrap get-in">
            <div className="get-copy">
              <h2>{c.app.title}</h2>
              <p>{c.app.body}</p>
              <div className="stores">
                <StoreButton href={APPLE_URL} icon="apple" eyebrow={c.app.appleEyebrow} label={c.app.apple} />
                <StoreButton href={PLAY_URL} icon="play" eyebrow={c.app.playEyebrow} label={c.app.play} />
              </div>
            </div>
            <div className="dl">
              <div className="dl-qr">
                <QRCodeSVG value={appUrl()} size={128} bgColor="#ffffff" fgColor="#0A0A0B" level="M" marginSize={0} />
              </div>
              <p>{c.app.qr}</p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="foot">
        <div className="wrap foot-in">
          <div className="foot-brand">
            <Logo href="/" showText size={28} className="brand" textColor="#fff" />
            <p>{c.footer.tagline}</p>
          </div>
          <nav className="foot-links" aria-label={c.a11y.nav}>
            <a href="#how">{c.nav.how}</a>
            <a href="#pricing">{c.nav.pricing}</a>
            <a href="/privacy">{c.footer.privacy}</a>
            <a href="/terms">{c.footer.terms}</a>
            <a href={SUPPORT_EMAIL}>{c.footer.contact}</a>
          </nav>
        </div>
        <div className="wrap foot-bottom">
          <span>© {new Date().getFullYear()} {c.footer.rights}</span>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        body { background: ${INK}; }

        .lp {
          --ink:${INK}; --band:${BAND}; --mint:${MINT}; --green:${GREEN};
          --deep:${DEEP}; --muted:${MUTED};
          --line: rgba(255,255,255,0.09);
          --card: rgba(255,255,255,0.04);
          --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, 'Helvetica Neue', sans-serif;
          background: ${INK};
          color: #fff;
          font-family: var(--sans);
          font-size: 16px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }
        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
        /* :where() keeps the reset at zero specificity so single-class rules
           below can still set margins without being outranked. */
        :where(.lp) :where(h1,h2,h3,p,ul,ol,figure) { margin: 0; padding: 0; }
        :where(.lp) :where(ul,ol) { list-style: none; }

        .wrap { width: 100%; max-width: 1140px; margin-inline: auto; padding-inline: 20px; }

        .skip {
          position: absolute; inset-inline-start: -9999px; top: 10px; z-index: 100;
          background: var(--mint); color: var(--deep); padding: 10px 16px;
          border-radius: 999px; font-weight: 700; text-decoration: none;
        }
        .skip:focus { inset-inline-start: 16px; }
        .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

        .lp a:focus-visible, .lp button:focus-visible, .lp select:focus-visible {
          outline: 3px solid var(--mint); outline-offset: 3px; border-radius: 10px;
        }

        h1, h2 { font-weight: 800; letter-spacing: -0.03em; line-height: 1.03; text-wrap: balance; }
        .lp-rtl h1, .lp-rtl h2 { letter-spacing: 0; line-height: 1.25; }
        h1 { font-size: clamp(33px, 7.4vw, 66px); }
        h2 { font-size: clamp(27px, 5.4vw, 46px); }
        h3 { font-size: 19px; font-weight: 750; letter-spacing: -0.01em; }
        .lede { color: var(--muted); font-size: clamp(15.5px, 3.6vw, 18px); line-height: 1.62; }

        .kicker {
          display: inline-block; margin-bottom: 14px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--mint);
        }
        .lp-rtl .kicker { letter-spacing: 0; }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 60;
          background: rgba(10,10,11,0.85);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--line);
        }
        .nav-in { display: flex; align-items: center; gap: 14px; height: 66px; }
        .brand { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; }
        .nav-links { display: flex; gap: 28px; margin-inline: auto; }
        .nav-links a { color: #C9C9C5; font-size: 14.5px; font-weight: 600; text-decoration: none; }
        .nav-links a:hover { color: #fff; }
        .nav-right { display: flex; align-items: center; gap: 10px; margin-inline-start: auto; }

        .lang {
          display: inline-flex; align-items: center; gap: 6px;
          color: var(--muted); padding-inline: 9px; height: 40px;
          border-radius: 999px; border: 1px solid var(--line); background: var(--card);
        }
        .lang select {
          appearance: none; background: transparent; border: 0; color: #fff;
          font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer;
        }
        .lang select option { background: ${BAND}; color: #fff; }

        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          min-height: 44px; padding-inline: 22px; border-radius: 999px;
          font-size: 14.5px; font-weight: 800; text-decoration: none; white-space: nowrap;
          border: 0; cursor: pointer; transition: transform .16s ease, background .18s ease;
        }
        .btn-mint { background: var(--mint); color: var(--deep); }
        .btn-mint:hover { background: #5cffe0; transform: translateY(-1px); }

        .burger {
          display: none; width: 44px; height: 44px; place-items: center;
          border-radius: 12px; border: 1px solid var(--line);
          background: var(--card); color: #fff; cursor: pointer;
        }
        .drawer { display: none; }

        /* ── Hero ── */
        .hero { padding-block: clamp(44px, 8vw, 86px) 0; text-align: center; }
        .hero-in { display: flex; flex-direction: column; align-items: center; }
        .hero h1 { max-width: 17ch; }
        .hero-lede { max-width: 56ch; margin-top: 20px; }
        .hero-cta { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 32px; }
        .hero-trust {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          flex-wrap: wrap; margin-top: 22px; color: #6F6E6A; font-size: 13px; font-weight: 600;
        }
        .hero-trust svg { color: var(--green); }
        .hero-shot { margin-top: clamp(38px, 7vw, 64px); }
        .hero-shot img {
          width: 100%; height: auto; display: block;
          filter: drop-shadow(0 40px 80px rgba(0,0,0,0.55));
        }

        /* ── Stats ── */
        .stats { padding-block: clamp(34px, 6vw, 56px); border-block: 1px solid var(--line); background: var(--band); }
        .stats-in { display: grid; grid-template-columns: repeat(2, 1fr); gap: 26px 16px; text-align: center; }
        .stat { display: grid; gap: 6px; }
        .stat-n { font-size: clamp(30px, 6.6vw, 46px); font-weight: 800; letter-spacing: -0.03em; color: var(--mint); }
        .lp-rtl .stat-n { letter-spacing: 0; }
        .stat-l { font-size: 13.5px; font-weight: 600; color: var(--muted); }

        /* ── Sections ── */
        .sec { padding-block: clamp(56px, 10vw, 104px); }
        .sec.band { background: var(--band); }
        .center-h { text-align: center; margin-inline: auto; max-width: 18ch; }
        .sec .kicker { display: block; }
        .center-h + .steps { margin-top: clamp(34px, 6vw, 54px); }

        /* ── Steps ── */
        .steps { display: grid; gap: 18px; }
        .steps li {
          padding: clamp(24px, 4.4vw, 32px);
          border-radius: 22px; background: var(--card); border: 1px solid var(--line);
        }
        .step-n {
          display: inline-grid; place-items: center;
          width: 42px; height: 42px; margin-bottom: 18px;
          border-radius: 50%; background: var(--mint); color: var(--deep);
          font-size: 17px; font-weight: 800;
        }
        .steps h3 { margin-bottom: 9px; }
        .steps p { color: var(--muted); font-size: 15.5px; line-height: 1.6; }

        /* ── Showcase rows ── */
        .row { display: grid; gap: clamp(32px, 6vw, 64px); align-items: center; }
        .row-copy h2 { max-width: 16ch; }
        .row-copy .lede { margin-top: 16px; max-width: 50ch; }
        .ticks { margin-top: 26px; display: grid; gap: 14px; }
        .ticks li { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; }
        .ticks svg { color: var(--mint); margin-top: 2px; }
        .ticks span { color: #D8D7D2; font-size: 15.5px; line-height: 1.5; }

        .shot {
          width: min(100%, 320px); margin-inline: auto; padding: 10px;
          border-radius: 30px; background: #08080A; border: 1px solid var(--line);
          box-shadow: 0 34px 74px rgba(0,0,0,0.5);
        }
        .shot img { width: 100%; height: auto; display: block; border-radius: 22px; }

        /* ── Pricing ── */
        .price-card {
          padding: clamp(28px, 5.6vw, 52px);
          border-radius: 28px;
          background: linear-gradient(160deg, rgba(0,255,204,0.10), rgba(255,255,255,0.03) 55%);
          border: 1px solid rgba(0,255,204,0.24);
        }
        .price-card h2 { max-width: 16ch; }
        .price-card .lede { margin-top: 16px; max-width: 60ch; }
        .price-ticks { margin-top: 26px; }
        .price-note {
          margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--line);
          color: #6F6E6A; font-size: 13.5px; line-height: 1.65; max-width: 60ch;
        }

        .trust-ticks { margin-top: 26px; max-width: 62ch; }
        .marks { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; margin-top: 34px; }
        .pm { display: inline-flex; align-items: center; gap: 4px; color: #6F6E6A; height: 20px; }
        .pm-text { font-size: 14px; }
        .pm-pay { font-size: 13px; gap: 3px; }
        .pm-pay strong { font-weight: 700; }
        .gpay {
          display: inline-grid; place-items: center; width: 15px; height: 15px;
          border-radius: 50%; background: currentColor; color: ${INK};
          font-weight: 800; font-size: 10px;
        }

        /* ── Store buttons ── */
        .stores, .hero-cta { display: flex; flex-wrap: wrap; gap: 12px; }
        .stores { margin-top: 26px; }
        .store {
          display: flex; align-items: center; gap: 12px;
          min-height: 58px; padding-inline: 20px; border-radius: 999px;
          background: var(--card); border: 1px solid var(--line);
          color: #fff; text-decoration: none; text-align: start;
          transition: border-color .2s ease, background .2s ease, transform .16s ease;
        }
        .store:hover { border-color: rgba(0,255,204,0.4); background: rgba(255,255,255,0.07); transform: translateY(-1px); }
        .store-solid { background: #fff; color: ${INK}; border-color: #fff; }
        .store-solid:hover { background: #EDEDEA; border-color: #EDEDEA; }
        .store-solid small { color: #5F5E5A; }
        .store small { display: block; color: var(--muted); font-size: 11px; line-height: 1.2; }
        .store strong { display: block; font-size: 15.5px; font-weight: 750; line-height: 1.25; }

        /* ── Download ── */
        .get { padding-block: clamp(56px, 10vw, 104px); }
        .get-in {
          display: grid; gap: clamp(30px, 5vw, 54px); align-items: center;
          padding: clamp(30px, 5.6vw, 56px);
          border-radius: 30px; background: var(--band); border: 1px solid var(--line);
        }
        .get-copy h2 { max-width: 15ch; }
        .get-copy > p { margin-top: 14px; color: var(--muted); font-size: 16px; line-height: 1.6; }
        .dl { justify-self: center; text-align: center; }
        .dl-qr { padding: 12px; border-radius: 18px; background: #fff; display: inline-flex; }
        .dl-qr svg { display: block; }
        .dl p { margin-top: 12px; color: var(--muted); font-size: 13px; font-weight: 700; }

        /* ── Footer ── */
        .foot { border-top: 1px solid var(--line); padding-block: 44px 30px; }
        .foot-in { display: grid; gap: 28px; }
        .foot-brand p { margin-top: 12px; color: var(--muted); font-size: 14.5px; max-width: 34ch; }
        .foot-links { display: flex; gap: 18px 26px; flex-wrap: wrap; align-items: flex-start; }
        .foot-links a { color: var(--muted); font-size: 14.5px; text-decoration: none; }
        .foot-links a:hover { color: #fff; }
        .foot-bottom { margin-top: 34px; padding-top: 22px; border-top: 1px solid var(--line); }
        .foot-bottom span { color: #5F5E5A; font-size: 12.5px; }

        /* ── Reveal — hidden only once JS has armed it (see useReveal) ── */
        .lp.reveal-armed [data-reveal] {
          opacity: 0; transform: translateY(20px);
          transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1);
        }
        .lp.reveal-armed [data-reveal].in { opacity: 1; transform: none; }

        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .lp *, .lp *::before, .lp *::after {
            animation-duration: .001ms !important; animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }
          .lp.reveal-armed [data-reveal] { opacity: 1; transform: none; }
        }

        /* ── Phone first ── */
        @media (max-width: 860px) {
          .nav-links { display: none; }
          .nav-cta { display: none; }
          .burger { display: grid; }
          .drawer {
            display: grid; gap: 8px; padding: 10px 20px 20px;
            border-top: 1px solid var(--line); background: rgba(10,10,11,0.98);
          }
          .drawer a {
            min-height: 50px; display: flex; align-items: center; padding-inline: 16px;
            border-radius: 14px; background: var(--card);
            color: #fff; text-decoration: none; font-size: 15px; font-weight: 700;
          }
          .drawer-cta { background: var(--mint) !important; color: var(--deep) !important; justify-content: center; }
        }

        @media (min-width: 861px) {
          .lp { font-size: 17px; }
          .stats-in { grid-template-columns: repeat(4, 1fr); }
          .steps { grid-template-columns: repeat(3, 1fr); gap: 22px; }
          .row { grid-template-columns: 1fr 1fr; }
          .row.flip .row-media { order: -1; }
          .shot { width: min(100%, 340px); }
          .get-in { grid-template-columns: 1fr auto; }
          .foot-in { grid-template-columns: 1fr auto; align-items: start; }
        }
      `}</style>
    </div>
  );
}
