import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import img3Screens from '../assets/images/screenshot_3images.png';
import imgTourist from '../assets/images/screenshot_tourist_page.png';
import imgEmployee from '../assets/images/screenshot_employee_page.png';
import imgBusiness from '../assets/images/screenshot_business_dashboard.png';
import Logo from '../components/Logo';

const green = '#00C896';
const accent = '#00ffcc';
const appDownloadUrl = 'https://snaptip.me/#get-app';
const playStoreUrl = 'https://play.google.com/store/apps/details?id=me.snaptip.app';
const appStoreUrl = 'https://apps.apple.com/search?term=SnapTip';

const Icon = ({ name, size = 20 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bolt: <path d="M13 2 4 14h7l-1 8 10-13h-7l2-7Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    play: <path d="m5 3 14 9-14 9V3Z" />,
    apple: <><path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" /><path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h2v2h-2z" /><path d="M18 14h3" /><path d="M14 18h1" /><path d="M18 18h3" /><path d="M18 20v-2" /></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h2" /><path d="M2 9h20" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m8 15 3-4 3 2 5-7" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>,
    bank: <><path d="m12 3 10 5H2l10-5Z" /><path d="M4 10v8" /><path d="M9 10v8" /><path d="M15 10v8" /><path d="M20 10v8" /><path d="M2 21h20" /></>,
    spark: <><path d="M12 3v3" /><path d="M12 18v3" /><path d="M3 12h3" /><path d="M18 12h3" /><path d="m5.6 5.6 2.1 2.1" /><path d="m16.3 16.3 2.1 2.1" /><path d="m5.6 18.4 2.1-2.1" /><path d="m16.3 7.7 2.1-2.1" /></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

const Button = ({ href, children, variant = 'primary', onClick }) => (
  <a className={`button button-${variant}`} href={href} onClick={onClick}>
    {children}
  </a>
);

const StoreButton = ({ href, icon, eyebrow, label }) => (
  <a className="store-button" href={href} aria-label={`${eyebrow} ${label}`}>
    <Icon name={icon} size={24} />
    <span>
      <small>{eyebrow}</small>
      <strong>{label}</strong>
    </span>
  </a>
);

const PaymentMark = ({ name }) => {
  if (name === 'visa') {
    return (
      <span className="payment-mark payment-text" aria-label="Visa" style={{ fontStyle: 'italic', fontWeight: 900, letterSpacing: '0.06em' }}>VISA</span>
    );
  }
  if (name === 'stripe') {
    return (
      <span className="payment-mark payment-text" aria-label="Stripe" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>stripe</span>
    );
  }
  if (name === 'mastercard') {
    return (
      <span className="payment-mark" aria-label="Mastercard">
        <svg width="34" height="20" viewBox="0 0 34 20" aria-hidden="true">
          <circle cx="13" cy="10" r="8" fill="currentColor" opacity="0.95" />
          <circle cx="21" cy="10" r="8" fill="currentColor" opacity="0.55" />
        </svg>
      </span>
    );
  }
  if (name === 'applepay') {
    return (
      <span className="payment-mark payment-pay" aria-label="Apple Pay">
        <svg width="14" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" />
          <path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" />
        </svg>
        <strong>Pay</strong>
      </span>
    );
  }
  if (name === 'gpay') {
    return (
      <span className="payment-mark payment-pay" aria-label="Google Pay">
        <span className="gpay-g" aria-hidden="true">G</span>
        <strong>Pay</strong>
      </span>
    );
  }
  return null;
};

const productTabs = [
  {
    id: 'employees',
    label: 'Employees',
    title: 'A personal tipping page for every team member.',
    copy: 'Staff get a QR code they can print, save, or share. Every tip, rating, and payout is visible without needing a manager to reconcile cash.',
    image: imgEmployee,
    alt: 'SnapTip employee app with balance, ratings, and tip history',
  },
  {
    id: 'guests',
    label: 'Guests',
    title: 'Guests tip in seconds, without downloading anything.',
    copy: 'A camera scan opens a clean payment flow with card and wallet options. The guest leaves a tip, a rating, and moves on.',
    image: imgTourist,
    alt: 'SnapTip guest tipping page with amount choices and rating',
  },
  {
    id: 'businesses',
    label: 'Businesses',
    title: 'Operators see performance without spreadsheets.',
    copy: 'Invite staff, understand team earnings, spot top performers, and keep a transparent record across locations and shifts.',
    image: imgBusiness,
    alt: 'SnapTip business dashboard with team performance analytics',
  },
];

const features = [
  ['qr', 'Instant QR tipping', 'No hardware, no app download for guests, no cash handling at the end of a shift.'],
  ['wallet', 'Real-time payouts', 'Every tip lands in the employee account with a clear balance and withdrawal flow.'],
  ['chart', 'Team analytics', 'Give businesses a single view of staff earnings, ratings, and guest feedback.'],
];

const steps = [
  {
    icon: 'qr',
    title: 'Create your QR',
    copy: 'Employee signs up and gets a personal QR code to print, save, or share.',
  },
  {
    icon: 'phone',
    title: 'Guest scans & tips',
    copy: 'No app download. Pay in seconds with card, Google Pay, or Apple Pay.',
  },
  {
    icon: 'bank',
    title: 'Cash out anytime',
    copy: 'Tips land instantly in your balance. Withdraw to any bank account.',
  },
];

const stats = [
  { value: 30, suffix: '+', label: 'Countries supported' },
  { value: 3, suffix: '', label: 'Currencies & wallets' },
  { value: 10, suffix: '%', label: 'Only when you earn' },
  { value: 1, suffix: '–3 days', label: 'Payout time' },
];

const testimonials = [
  ['International guests rarely carry local cash. SnapTip made tipping feel natural again.', 'James M.', 'Waiter, Marrakech'],
  ['The dashboard gives us a simple way to understand service quality without adding admin work.', 'Sarah K.', 'Hotel Manager, Agadir'],
];

function useScrollReveal() {
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function Counter({ to, suffix = '' }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const prefersReduced =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !ref.current) {
      setValue(to);
      return;
    }
    const node = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const duration = 1400;
            const start = performance.now();
            const tick = (now) => {
              const t = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - t, 3);
              setValue(Math.round(to * eased));
              if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            observer.unobserve(node);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [to]);
  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(productTabs[0].id);

  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeProduct = productTabs.find((tab) => tab.id === activeTab) || productTabs[0];
  const activeIndex = productTabs.findIndex((tab) => tab.id === activeTab);

  return (
    <main className="landing">
      <div className="grain" aria-hidden="true" />

      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`} aria-label="Main navigation">
        <div className="nav-inner">
          <Logo href="/" showText size={32} className="logo" textColor="#ffffff" />
          <div className="nav-actions">
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#product">Product</a>
            <a className="nav-link" href="#pricing">Pricing</a>
            <a className="nav-link" href="#get-app">Login</a>
            <Button href="#get-app">Get Started</Button>
          </div>
          <button
            className="menu-button"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#product" onClick={() => setMenuOpen(false)}>Product</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#get-app" onClick={() => setMenuOpen(false)}>Login</a>
            <a href="#get-app" onClick={() => setMenuOpen(false)}>Get Started</a>
          </div>
        )}
      </nav>

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow hero-rise">Cashless tipping for modern hospitality</p>
          <h1 className="hero-rise">Tip moments should feel effortless.</h1>
          <p className="hero-text hero-rise">
            SnapTip gives every employee a QR code, every guest a fast payment flow, and every business a clearer view of service performance.
          </p>
          <div className="hero-actions hero-rise">
            <Button href="#get-app">
              Get Started <Icon name="arrow" size={18} />
            </Button>
            <Button href="#product" variant="secondary">
              See product
            </Button>
          </div>
          <p className="trust-line hero-rise">
            <Icon name="lock" size={14} /> Powered by Stripe · No app needed for guests · Free to start
          </p>
        </div>
        <div className="hero-showcase" aria-label="SnapTip product preview">
          <div className="hero-phone-glow" aria-hidden="true" />
          <img
            src={img3Screens}
            alt="SnapTip mobile app screens for employees, guests, and business dashboards"
            width="610"
            height="510"
          />
        </div>
      </section>

      <section className="how" id="how" data-reveal aria-labelledby="how-title">
        <div className="section-head">
          <p className="section-kicker">How it works</p>
          <h2 id="how-title">From scan to payout, in three steps.</h2>
        </div>
        <ol className="steps">
          {steps.map((step, i) => (
            <li key={step.title} className="step" style={{ '--i': i }}>
              <div className="step-badge">
                <Icon name={step.icon} size={26} />
                <span className="step-num" aria-hidden="true">{i + 1}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="stats" data-reveal aria-label="SnapTip at a glance">
        <div className="stats-row">
          {stats.map((s, i) => (
            <div className="stat" key={s.label} style={{ '--i': i }}>
              <div className="stat-value">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="product" id="product" data-reveal aria-labelledby="product-title">
        <div className="section-kicker">Product experience</div>
        <div className="product-shell">
          <div className="product-copy">
            <h2 id="product-title">One system. Three calm experiences.</h2>
            <div
              className="segmented"
              role="tablist"
              aria-label="Product audience"
              style={{ '--active-tab': activeIndex }}
            >
              <div className="segmented-pill" aria-hidden="true" />
              {productTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="tab-copy" aria-live="polite">
              <h3>{activeProduct.title}</h3>
              <p>{activeProduct.copy}</p>
            </div>
          </div>
          <div className="product-image">
            <img
              key={activeProduct.id}
              src={activeProduct.image}
              alt={activeProduct.alt}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </section>

      <section className="features" data-reveal aria-labelledby="features-title">
        <div className="features-head">
          <p className="section-kicker">What matters</p>
          <h2 id="features-title">Built around the tipping workflow, not around dashboards.</h2>
        </div>
        <div className="feature-list">
          {features.map(([icon, title, copy], i) => (
            <article key={title} className="feature-card" style={{ '--i': i }}>
              <div className="feature-icon">
                <Icon name={icon} size={22} />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="proof" data-reveal aria-labelledby="proof-title">
        <div className="proof-heading">
          <p className="section-kicker">Trusted by service teams</p>
          <h2 id="proof-title">A quieter way to earn more.</h2>
        </div>
        <div className="quotes">
          {testimonials.map(([quote, name, role], i) => (
            <figure key={name} style={{ '--i': i }}>
              <blockquote>"{quote}"</blockquote>
              <figcaption>
                {name}
                <span>{role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pricing" id="get-app" data-reveal aria-labelledby="pricing-title">
        <div className="pricing-copy">
          <p className="section-kicker">Pricing</p>
          <h2 id="pricing-title">Free to start. 10% only when tips come in.</h2>
          <p>If your team earns $0, you pay $0. SnapTip succeeds only when employees earn.</p>
          <ul>
            <li><Icon name="check" />No monthly fee</li>
            <li><Icon name="check" />Unlimited QR codes</li>
            <li><Icon name="check" />Dashboard included</li>
          </ul>
          <div className="stripe-badge" aria-label="Payments secured by Stripe">
            <Icon name="lock" size={14} />
            <span>Payments secured by</span>
            <PaymentMark name="stripe" />
          </div>
        </div>
        <div className="download-card">
          <div className="qr">
            <QRCodeSVG
              value={appDownloadUrl}
              size={138}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin
            />
          </div>
          <p>Scan to get SnapTip</p>
          <div className="store-stack">
            <StoreButton href={playStoreUrl} icon="play" eyebrow="Get it on" label="Google Play" />
            <StoreButton href={appStoreUrl} icon="apple" eyebrow="Download on the" label="App Store" />
          </div>
        </div>
      </section>

      <section className="final" data-reveal>
        <h2>Give every tip a clean path.</h2>
        <p>Launch SnapTip for your team in minutes. No cash. No awkward handoff. No monthly commitment.</p>
        <Button href="#get-app">
          Get Started <Icon name="arrow" size={18} />
        </Button>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <Logo href="/" showText size={28} className="logo" textColor="#ffffff" />
            <div className="footer-links">
              <a href="#how">How it works</a>
              <a href="#product">Product</a>
              <a href="#pricing">Pricing</a>
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
              <a href="mailto:support@snaptip.me">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">© 2026 SnapTip by Hitte Technologies LLC.</span>
            <div className="payment-row" aria-label="Supported payment methods">
              <PaymentMark name="stripe" />
              <PaymentMark name="visa" />
              <PaymentMark name="mastercard" />
              <PaymentMark name="applepay" />
              <PaymentMark name="gpay" />
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        body { background: #000; }

        .landing {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(1200px 600px at 50% -10%, rgba(0,255,204,0.07), transparent 60%),
            radial-gradient(800px 400px at 100% 30%, rgba(0,200,150,0.04), transparent 60%),
            #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif;
          font-size: 17px;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          overflow-x: hidden;
        }
        .landing * { box-sizing: border-box; letter-spacing: 0; }

        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.035;
          background-image: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border-bottom: 1px solid transparent;
          transition: border-color 0.25s ease, background 0.25s ease;
        }
        .nav-scrolled {
          border-bottom-color: rgba(255,255,255,0.08);
          background: rgba(0,0,0,0.85);
        }
        .nav-inner {
          max-width: 1200px;
          height: 72px;
          margin: 0 auto;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo { font-size: 18px; font-weight: 760; }
        .logo .snaptip-logo-icon {
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
        }
        .logo .snaptip-logo-wordmark { color: #fff; }
        .nav-actions { display: flex; align-items: center; gap: 22px; }
        .nav-link {
          color: #a0a0a0;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-link:hover { color: #fff; }

        .button {
          position: relative;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 20px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #fff;
          color: #000;
          text-decoration: none;
          font-size: 14.5px;
          font-weight: 720;
          cursor: pointer;
          transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, background 0.2s ease, border-color 0.2s ease;
          will-change: transform;
        }
        .button:hover {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 10px 30px rgba(0,255,204,0.18), 0 2px 8px rgba(255,255,255,0.08);
        }
        .button:active { transform: translateY(0) scale(0.98); transition-duration: 0.08s; }
        .button-secondary {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .button-secondary:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(0,255,204,0.35);
          box-shadow: 0 8px 24px rgba(0,255,204,0.12);
        }

        .menu-button {
          display: none;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
          cursor: pointer;
        }
        .mobile-menu { display: none; }

        .hero {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          padding: 124px 28px 110px;
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(360px, 1.05fr);
          gap: 72px;
          align-items: center;
          z-index: 2;
        }
        .hero-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 80%);
          pointer-events: none;
          z-index: 0;
        }
        .hero-glow {
          position: absolute;
          top: 10%;
          right: -5%;
          width: 720px;
          height: 720px;
          background:
            radial-gradient(circle at center, rgba(0,255,204,0.22), rgba(0,200,150,0.08) 35%, transparent 65%);
          filter: blur(70px);
          opacity: 0.85;
          pointer-events: none;
          z-index: 0;
          animation: glow-pulse 7.5s ease-in-out infinite;
        }
        .hero-copy { position: relative; z-index: 2; }

        .eyebrow, .section-kicker {
          margin: 0 0 18px;
          color: ${accent};
          font-size: 13px;
          font-weight: 760;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        h1, h2, h3, p { margin: 0; }

        .hero h1 {
          max-width: 640px;
          font-size: clamp(48px, 7vw, 80px);
          line-height: 0.96;
          font-weight: 760;
          letter-spacing: -0.02em;
          text-wrap: balance;
        }
        .hero-text {
          max-width: 560px;
          margin-top: 26px;
          color: #a8a8a8;
          font-size: 18px;
          line-height: 1.65;
        }
        .hero-actions { display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; }
        .trust-line {
          margin-top: 22px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #8a8a8a;
          font-size: 13.5px;
          font-weight: 550;
        }
        .trust-line svg { color: ${accent}; opacity: 0.9; }

        .hero-rise {
          opacity: 0;
          transform: translateY(20px);
          animation: rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hero-copy > .hero-rise:nth-child(1) { animation-delay: 0.05s; }
        .hero-copy > .hero-rise:nth-child(2) { animation-delay: 0.15s; }
        .hero-copy > .hero-rise:nth-child(3) { animation-delay: 0.25s; }
        .hero-copy > .hero-rise:nth-child(4) { animation-delay: 0.35s; }
        .hero-copy > .hero-rise:nth-child(5) { animation-delay: 0.45s; }

        .hero-showcase {
          position: relative;
          min-height: 520px;
          display: grid;
          place-items: center;
          z-index: 1;
        }
        .hero-phone-glow {
          position: absolute;
          width: 78%;
          height: 78%;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(0,255,204,0.18), rgba(0,200,150,0.06) 40%, transparent 70%);
          filter: blur(55px);
          animation: glow-pulse 6.5s ease-in-out infinite;
        }
        .hero-showcase img {
          position: relative;
          width: min(100%, 610px);
          border-radius: 26px;
          filter: drop-shadow(0 50px 90px rgba(0,0,0,0.55));
          opacity: 0;
          animation: hero-fade 1s 0.4s ease-out forwards, float 7s 1.2s ease-in-out infinite;
        }

        .product, .features, .proof, .pricing, .final, .how, .stats, .footer-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding-left: 28px;
          padding-right: 28px;
          position: relative;
          z-index: 2;
        }

        .how { padding-top: 60px; padding-bottom: 30px; }
        .section-head { max-width: 720px; }
        .how h2, .product h2, .features h2, .proof h2, .pricing h2, .final h2 {
          font-size: clamp(34px, 4.5vw, 52px);
          line-height: 1.05;
          font-weight: 740;
          letter-spacing: -0.015em;
          text-wrap: balance;
        }

        .steps {
          list-style: none;
          padding: 0;
          margin: 56px 0 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 40px;
          position: relative;
        }
        .steps::before {
          content: '';
          position: absolute;
          top: 32px;
          left: 16.67%;
          right: 16.67%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,255,204,0.35) 20%, rgba(0,255,204,0.35) 80%, transparent);
          z-index: 0;
        }
        .step {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 0 8px;
        }
        .step-badge {
          position: relative;
          width: 64px;
          height: 64px;
          margin: 0 auto 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background:
            radial-gradient(circle at 30% 30%, rgba(0,255,204,0.22), rgba(0,200,150,0.04) 70%);
          border: 1px solid rgba(0,255,204,0.28);
          color: ${accent};
          box-shadow: 0 6px 24px rgba(0,200,150,0.18), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .step-num {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: ${accent};
          color: #000;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 4px 12px rgba(0,255,204,0.35);
        }
        .step h3 {
          font-size: 19px;
          font-weight: 720;
          margin-bottom: 10px;
          letter-spacing: -0.005em;
        }
        .step p {
          max-width: 280px;
          margin: 0 auto;
          color: #9a9a9a;
          font-size: 15.5px;
          line-height: 1.6;
        }

        .stats {
          padding-top: 80px;
          padding-bottom: 30px;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          padding: 36px 36px;
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
          overflow: hidden;
        }
        .stats-row::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 0%, rgba(0,255,204,0.08), transparent 60%);
          pointer-events: none;
        }
        .stat {
          position: relative;
          text-align: center;
          padding: 4px 18px;
        }
        .stat + .stat {
          border-left: 1px solid rgba(255,255,255,0.06);
        }
        .stat-value {
          font-size: clamp(30px, 3.5vw, 42px);
          font-weight: 760;
          color: #fff;
          letter-spacing: -0.02em;
          background: linear-gradient(180deg, #ffffff 30%, rgba(0,255,204,0.85));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1.1;
        }
        .stat-label {
          margin-top: 8px;
          color: #9a9a9a;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .product { padding-top: 110px; }
        .product-shell {
          display: grid;
          grid-template-columns: 1fr 0.86fr;
          gap: 72px;
          align-items: center;
          padding: 48px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
        }
        .product-shell:hover {
          border-color: rgba(0,255,204,0.2);
          box-shadow: 0 22px 60px rgba(0,200,150,0.08);
        }

        .segmented {
          position: relative;
          width: fit-content;
          display: flex;
          gap: 0;
          margin: 32px 0;
          padding: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .segmented-pill {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 4px;
          width: calc((100% - 8px) / 3);
          background: #fff;
          border-radius: 999px;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(calc(var(--active-tab, 0) * 100%));
          z-index: 1;
          box-shadow: 0 4px 12px rgba(255,255,255,0.12);
        }
        .segmented button {
          flex: 1;
          position: relative;
          z-index: 2;
          min-height: 38px;
          padding: 0 18px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #a0a0a0;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: color 0.25s ease;
        }
        .segmented button.active { color: #000; }
        .segmented button:hover:not(.active) { color: #fff; }

        .tab-copy { animation: tab-fade 0.32s ease both; }
        .tab-copy h3 {
          max-width: 520px;
          font-size: 25px;
          line-height: 1.2;
          font-weight: 720;
          letter-spacing: -0.01em;
        }
        .tab-copy p {
          max-width: 560px;
          margin-top: 14px;
          color: #a0a0a0;
          font-size: 17px;
          line-height: 1.7;
        }
        .product-image {
          width: min(100%, 340px);
          margin: 0 auto;
          padding: 12px;
          border-radius: 34px;
          background: #080808;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 30px 70px rgba(0,0,0,0.45);
        }
        .product-image img {
          width: 100%;
          display: block;
          border-radius: 24px;
          animation: tab-fade 0.3s ease both;
        }

        .features {
          padding-top: 120px;
          display: grid;
          grid-template-columns: 0.85fr 1fr;
          gap: 80px;
          align-items: start;
        }
        .features-head { position: sticky; top: 100px; }
        .feature-list { display: grid; gap: 18px; }
        .feature-card {
          display: grid;
          grid-template-columns: 48px 1fr;
          gap: 22px;
          padding: 26px 28px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012));
          border: 1px solid rgba(255,255,255,0.07);
          transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease;
        }
        .feature-card:hover {
          border-color: rgba(0,255,204,0.32);
          box-shadow: 0 14px 38px rgba(0,200,150,0.1);
          transform: translateY(-2px);
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(0,255,204,0.08);
          border: 1px solid rgba(0,255,204,0.18);
          color: ${accent};
        }
        .feature-card h3 {
          font-size: 19px;
          font-weight: 720;
          margin-bottom: 8px;
          letter-spacing: -0.005em;
        }
        .feature-card p, .pricing-copy p, .final p {
          color: #9a9a9a;
          line-height: 1.7;
          font-size: 16px;
        }

        .proof {
          padding-top: 120px;
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 72px;
        }
        .quotes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        figure {
          margin: 0;
          padding: 28px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.07);
          transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.35s ease;
        }
        figure:hover {
          border-color: rgba(0,255,204,0.28);
          box-shadow: 0 14px 36px rgba(0,200,150,0.08);
          transform: translateY(-2px);
        }
        blockquote { margin: 0; color: #e8e8e8; font-size: 16.5px; line-height: 1.65; }
        figcaption { margin-top: 22px; color: #fff; font-size: 14px; font-weight: 740; }
        figcaption span { display: block; margin-top: 5px; color: #777; font-weight: 600; }

        .pricing {
          padding-top: 120px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 72px;
          align-items: center;
        }
        .pricing-copy p { max-width: 570px; margin-top: 18px; font-size: 17px; }
        .pricing-copy ul {
          list-style: none;
          display: grid;
          gap: 12px;
          margin: 28px 0 24px;
          padding: 0;
          color: #d8d8d8;
        }
        .pricing-copy li { display: flex; align-items: center; gap: 10px; font-size: 16px; }
        .pricing-copy li svg { color: ${green}; }
        .stripe-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 13px;
          color: #a0a0a0;
          font-weight: 600;
        }
        .stripe-badge svg { color: ${accent}; }
        .stripe-badge .payment-text { color: #fff; font-size: 15px; }

        .download-card {
          padding: 26px;
          border-radius: 24px;
          background: linear-gradient(180deg, #101010, #050505);
          border: 1px solid rgba(255,255,255,0.09);
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .download-card:hover {
          border-color: rgba(0,255,204,0.25);
          box-shadow: 0 22px 60px rgba(0,200,150,0.12);
        }
        .qr {
          width: fit-content;
          margin: 0 auto 18px;
          padding: 10px;
          border-radius: 16px;
          background: #fff;
        }
        .qr svg { display: block; }
        .download-card p { color: #fff; font-size: 15px; font-weight: 760; margin-bottom: 18px; }
        .store-stack { display: grid; gap: 10px; }
        .store-button {
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 14px;
          color: #fff;
          text-decoration: none;
          text-align: left;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.09);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .store-button:hover {
          transform: translateY(-1px);
          border-color: rgba(0,255,204,0.3);
          background: rgba(255,255,255,0.06);
        }
        .store-button small { display: block; color: #9a9a9a; font-size: 11px; line-height: 1.1; }
        .store-button strong { display: block; color: #fff; font-size: 15px; line-height: 1.2; }

        .final {
          padding-top: 130px;
          padding-bottom: 130px;
          text-align: center;
        }
        .final p {
          max-width: 620px;
          margin: 18px auto 32px;
          font-size: 17px;
        }

        .footer {
          border-top: 1px solid rgba(255,255,255,0.08);
          position: relative;
          z-index: 2;
        }
        .footer-inner {
          padding-top: 44px;
          padding-bottom: 36px;
        }
        .footer-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-wrap: wrap;
        }
        .footer-links {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
        }
        .footer-links a {
          color: #888;
          font-size: 14px;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-links a:hover { color: #fff; }
        .footer-bottom {
          padding-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .footer-copy {
          color: #666;
          font-size: 13px;
        }
        .payment-row {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
        }
        .payment-mark {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #888;
          height: 22px;
          transition: color 0.25s ease, transform 0.25s ease;
        }
        .payment-mark:hover { color: #ddd; transform: translateY(-1px); }
        .payment-text { font-size: 14px; }
        .payment-pay { font-size: 13px; gap: 3px; }
        .payment-pay strong { font-weight: 700; letter-spacing: -0.01em; }
        .gpay-g {
          display: inline-grid;
          place-items: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: currentColor;
          color: #000;
          font-weight: 800;
          font-size: 11px;
        }

        [data-reveal] {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.85s cubic-bezier(0.22, 1, 0.36, 1), transform 0.85s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }
        [data-reveal] .step,
        [data-reveal] .stat,
        [data-reveal] .feature-card,
        [data-reveal] .quotes figure {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: calc(var(--i, 0) * 90ms + 120ms);
        }
        [data-reveal].revealed .step,
        [data-reveal].revealed .stat,
        [data-reveal].revealed .feature-card,
        [data-reveal].revealed .quotes figure {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @keyframes hero-fade {
          to { opacity: 1; }
        }
        @keyframes rise {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tab-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50% { transform: scale(1.08); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
          .hero-rise { opacity: 1; transform: none; }
          .hero-showcase img { opacity: 1; }
          [data-reveal] { opacity: 1; transform: none; }
          [data-reveal] .step,
          [data-reveal] .stat,
          [data-reveal] .feature-card,
          [data-reveal] .quotes figure { opacity: 1; transform: none; }
        }

        @media (max-width: 1024px) {
          .features {
            grid-template-columns: 1fr;
            gap: 48px;
          }
          .features-head { position: static; }
          .proof { grid-template-columns: 1fr; gap: 40px; }
          .stats-row { padding: 28px 16px; }
        }

        @media (max-width: 900px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 48px;
            padding-top: 90px;
            padding-bottom: 80px;
            text-align: center;
          }
          .hero-copy { display: flex; flex-direction: column; align-items: center; }
          .hero-copy > * { margin-left: auto; margin-right: auto; }
          .hero h1, .hero-text { margin-left: auto; margin-right: auto; }
          .hero-actions, .segmented { justify-content: center; }
          .hero-showcase { min-height: auto; }
          .hero-glow { right: -30%; opacity: 0.6; }

          .product-shell {
            grid-template-columns: 1fr;
            padding: 32px;
            text-align: center;
            gap: 36px;
          }
          .segmented { margin-left: auto; margin-right: auto; }
          .tab-copy h3, .tab-copy p { margin-left: auto; margin-right: auto; }
          .product, .features, .proof, .pricing, .how, .stats { padding-top: 90px; }
          .pricing { grid-template-columns: 1fr; gap: 36px; }
          .download-card { max-width: 380px; margin: 0 auto; width: 100%; }
          .quotes { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 28px 20px; }
          .stat + .stat { border-left: 0; }
          .stat:nth-child(3), .stat:nth-child(4) { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
          .steps { grid-template-columns: 1fr; gap: 36px; }
          .steps::before { display: none; }
        }

        @media (max-width: 720px) {
          .nav-inner { height: 64px; padding: 0 18px; }
          .nav-actions { display: none; }
          .menu-button { display: grid; }
          .mobile-menu {
            display: grid;
            gap: 8px;
            padding: 10px 18px 18px;
            animation: tab-fade 0.22s ease both;
          }
          .mobile-menu a {
            min-height: 46px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            background: rgba(255,255,255,0.045);
            color: #fff;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
          }
          .mobile-menu a:last-child { background: #fff; color: #000; }

          .hero, .product, .features, .proof, .pricing, .final, .how, .stats, .footer-inner {
            padding-left: 18px;
            padding-right: 18px;
          }
          .hero { padding-top: 56px; padding-bottom: 60px; }
          .hero h1 { font-size: clamp(40px, 11vw, 56px); line-height: 0.98; }
          .hero-text { font-size: 16px; }
          .hero-actions { flex-direction: column; align-items: stretch; width: 100%; max-width: 320px; }
          .button { width: 100%; }
          .trust-line { font-size: 12.5px; flex-wrap: wrap; justify-content: center; }

          .product-shell { padding: 22px; border-radius: 22px; }
          .segmented { width: 100%; }
          .segmented button { flex: 1; padding: 0 8px; font-size: 13px; }
          .product h2, .features h2, .proof h2, .pricing h2, .final h2, .how h2 { font-size: 32px; }
          .feature-card { padding: 22px; }

          .product, .features, .proof, .pricing, .how, .stats { padding-top: 72px; }
          .stats { padding-bottom: 0; }
          .final { padding-top: 90px; padding-bottom: 90px; }

          .steps { margin-top: 36px; }
          .step p { font-size: 15px; }

          .footer-top { flex-direction: column; align-items: center; text-align: center; gap: 16px; }
          .footer-links { justify-content: center; gap: 16px 22px; }
          .footer-bottom { flex-direction: column-reverse; text-align: center; gap: 18px; }
          .payment-row { justify-content: center; gap: 14px 16px; }
        }

        @media (max-width: 380px) {
          .stats-row { grid-template-columns: 1fr; }
          .stat + .stat { border-top: 1px solid rgba(255,255,255,0.06); padding-top: 18px; }
        }
      `}</style>
    </main>
  );
}
