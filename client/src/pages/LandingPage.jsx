import { useEffect, useState } from 'react';
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
  };
  return <svg {...props}>{paths[name]}</svg>;
};

const Button = ({ href, children, variant = 'primary' }) => (
  <a className={`button button-${variant}`} href={href}>
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

const testimonials = [
  ['International guests rarely carry local cash. SnapTip made tipping feel natural again.', 'James M.', 'Waiter, Marrakech'],
  ['The dashboard gives us a simple way to understand service quality without adding admin work.', 'Sarah K.', 'Hotel Manager, Agadir'],
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(productTabs[0].id);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeProduct = productTabs.find((tab) => tab.id === activeTab) || productTabs[0];

  return (
    <main className="landing">
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`} aria-label="Main navigation">
        <div className="nav-inner">
          <Logo href="/" showText size={32} className="logo" textColor="#ffffff" />
          <div className="nav-actions">
            <a className="nav-link" href="#get-app">Login</a>
            <Button href="#get-app">Get Started</Button>
          </div>
          <button className="menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#get-app" onClick={() => setMenuOpen(false)}>Login</a>
            <a href="#get-app" onClick={() => setMenuOpen(false)}>Get Started</a>
          </div>
        )}
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Cashless tipping for modern hospitality</p>
          <h1>Tip moments should feel effortless.</h1>
          <p className="hero-text">
            SnapTip gives every employee a QR code, every guest a fast payment flow, and every business a clearer view of service performance.
          </p>
          <div className="hero-actions">
            <Button href="#get-app">Get Started <Icon name="arrow" size={18} /></Button>
            <Button href="#product" variant="secondary">See product</Button>
          </div>
        </div>
        <div className="hero-showcase" aria-label="SnapTip product preview">
          <img src={img3Screens} alt="SnapTip mobile app screens for employees, guests, and business dashboards" />
        </div>
      </section>

      <section className="product" id="product" aria-labelledby="product-title">
        <div className="section-kicker">Product experience</div>
        <div className="product-shell">
          <div className="product-copy">
            <h2 id="product-title">One system. Three calm experiences.</h2>
            <div className="segmented" role="tablist" aria-label="Product audience">
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
            <img key={activeProduct.id} src={activeProduct.image} alt={activeProduct.alt} loading="lazy" />
          </div>
        </div>
      </section>

      <section className="features" aria-labelledby="features-title">
        <div>
          <p className="section-kicker">What matters</p>
          <h2 id="features-title">Built around the tipping workflow, not around dashboards.</h2>
        </div>
        <div className="feature-list">
          {features.map(([icon, title, copy]) => (
            <article key={title}>
              <Icon name={icon} />
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="proof" aria-labelledby="proof-title">
        <div className="proof-heading">
          <p className="section-kicker">Trusted by service teams</p>
          <h2 id="proof-title">A quieter way to earn more.</h2>
        </div>
        <div className="quotes">
          {testimonials.map(([quote, name, role]) => (
            <figure key={name}>
              <blockquote>"{quote}"</blockquote>
              <figcaption>{name}<span>{role}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pricing" id="get-app" aria-labelledby="pricing-title">
        <div className="pricing-copy">
          <p className="section-kicker">Pricing</p>
          <h2 id="pricing-title">Free to start. 10% only when tips come in.</h2>
          <p>If your team earns $0, you pay $0. SnapTip succeeds only when employees earn.</p>
          <ul>
            <li><Icon name="check" />No monthly fee</li>
            <li><Icon name="check" />Unlimited QR codes</li>
            <li><Icon name="check" />Dashboard included</li>
          </ul>
        </div>
        <div className="download-card">
          <div className="qr">
            <QRCodeSVG value={appDownloadUrl} size={138} bgColor="#ffffff" fgColor="#000000" level="M" includeMargin />
          </div>
          <p>Scan to get SnapTip</p>
          <div className="store-stack">
            <StoreButton href={playStoreUrl} icon="play" eyebrow="Get it on" label="Google Play" />
            <StoreButton href={appStoreUrl} icon="apple" eyebrow="Download on the" label="App Store" />
          </div>
        </div>
      </section>

      <section className="final">
        <h2>Give every tip a clean path.</h2>
        <p>Launch SnapTip for your team in minutes. No cash. No awkward handoff. No monthly commitment.</p>
        <Button href="#get-app">Get Started <Icon name="arrow" size={18} /></Button>
      </section>

      <footer className="footer">
        <div className="footer-brand">
          <Logo href="/" showText size={28} className="logo" textColor="#ffffff" />
        </div>
        <span className="footer-copy">© 2026 SnapTip by Hitte Technologies LLC.</span>
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:support@snaptip.me">Contact</a>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        body { background: #000; }
        .landing {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% -10%, rgba(0,255,204,0.055), transparent 34rem),
            #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          overflow-x: hidden;
        }
        .landing * { box-sizing: border-box; letter-spacing: 0; }
        .nav {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid transparent;
          transition: border-color 0.25s ease;
        }
        .nav-scrolled { border-bottom-color: rgba(255,255,255,0.08); }
        .nav-inner {
          max-width: 1120px;
          height: 72px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          font-size: 18px;
          font-weight: 760;
        }
        .logo .snaptip-logo-icon {
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 10px 24px rgba(0,0,0,0.35);
        }
        .logo .snaptip-logo-wordmark {
          color: #fff;
        }
        .nav-actions { display: flex; align-items: center; gap: 18px; }
        .nav-link {
          color: #a0a0a0;
          font-size: 14px;
          font-weight: 650;
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-link:hover { color: #fff; }
        .button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 17px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #fff;
          color: #000;
          text-decoration: none;
          font-size: 14px;
          font-weight: 760;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .button:hover { transform: translateY(-1px); }
        .button-secondary {
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .button-secondary:hover { border-color: rgba(255,255,255,0.24); }
        .menu-button {
          display: none;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
        }
        .mobile-menu { display: none; }
        .hero {
          max-width: 1120px;
          margin: 0 auto;
          padding: 118px 24px 96px;
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(360px, 1.08fr);
          gap: 72px;
          align-items: center;
        }
        .eyebrow, .section-kicker {
          margin: 0 0 18px;
          color: ${accent};
          font-size: 13px;
          font-weight: 760;
        }
        h1, h2, h3, p { margin: 0; }
        .hero h1 {
          max-width: 620px;
          font-size: clamp(48px, 7vw, 78px);
          line-height: 0.98;
          font-weight: 760;
          text-wrap: balance;
        }
        .hero-text {
          max-width: 560px;
          margin-top: 26px;
          color: #a0a0a0;
          font-size: 19px;
          line-height: 1.65;
        }
        .hero-actions { display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; }
        .hero-showcase {
          position: relative;
          min-height: 510px;
          display: grid;
          place-items: center;
        }
        .hero-showcase::before {
          content: "";
          position: absolute;
          width: 64%;
          height: 64%;
          border-radius: 999px;
          background: rgba(0,255,204,0.055);
          filter: blur(44px);
        }
        .hero-showcase img {
          position: relative;
          width: min(100%, 610px);
          border-radius: 26px;
          box-shadow: 0 46px 90px rgba(0,0,0,0.48);
          animation: float 7s ease-in-out infinite;
        }
        .product, .features, .proof, .pricing, .final, .footer {
          max-width: 1120px;
          margin: 0 auto;
          padding-left: 24px;
          padding-right: 24px;
        }
        .product { padding-top: 44px; }
        .product-shell {
          display: grid;
          grid-template-columns: 1fr 0.86fr;
          gap: 72px;
          align-items: center;
          padding: 44px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025));
          border: 1px solid rgba(255,255,255,0.08);
        }
        .product h2, .features h2, .proof h2, .pricing h2, .final h2 {
          font-size: clamp(32px, 4.5vw, 52px);
          line-height: 1.06;
          font-weight: 730;
          text-wrap: balance;
        }
        .segmented {
          width: fit-content;
          display: flex;
          gap: 4px;
          margin: 32px 0;
          padding: 4px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .segmented button {
          min-height: 38px;
          padding: 0 16px;
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #a0a0a0;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .segmented button.active { background: #fff; color: #000; }
        .tab-copy { animation: fade 0.28s ease both; }
        .tab-copy h3 { max-width: 500px; font-size: 25px; line-height: 1.2; font-weight: 720; }
        .tab-copy p { max-width: 560px; margin-top: 14px; color: #a0a0a0; font-size: 16px; line-height: 1.7; }
        .product-image {
          width: min(100%, 340px);
          margin: 0 auto;
          padding: 12px;
          border-radius: 34px;
          background: #080808;
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 28px 70px rgba(0,0,0,0.4);
        }
        .product-image img {
          width: 100%;
          display: block;
          border-radius: 24px;
          animation: fade 0.25s ease both;
        }
        .features {
          padding-top: 118px;
          display: grid;
          grid-template-columns: 0.86fr 1fr;
          gap: 78px;
        }
        .feature-list {
          display: grid;
          gap: 30px;
        }
        .feature-list article {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 18px;
          padding-bottom: 30px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .feature-list article:last-child { border-bottom: 0; padding-bottom: 0; }
        .feature-list svg { color: ${accent}; margin-top: 3px; }
        .feature-list h3 { font-size: 19px; font-weight: 720; margin-bottom: 8px; }
        .feature-list p, .pricing-copy p, .final p { color: #a0a0a0; line-height: 1.7; font-size: 16px; }
        .proof {
          padding-top: 118px;
          display: grid;
          grid-template-columns: 0.82fr 1.18fr;
          gap: 72px;
        }
        .quotes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
        figure {
          margin: 0;
          padding: 26px;
          border-radius: 20px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
        }
        blockquote { margin: 0; color: #e8e8e8; font-size: 16px; line-height: 1.65; }
        figcaption { margin-top: 22px; color: #fff; font-size: 14px; font-weight: 740; }
        figcaption span { display: block; margin-top: 5px; color: #777; font-weight: 600; }
        .pricing {
          padding-top: 118px;
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 72px;
          align-items: center;
        }
        .pricing-copy p { max-width: 570px; margin-top: 18px; }
        .pricing-copy ul {
          list-style: none;
          display: grid;
          gap: 12px;
          margin: 28px 0 0;
          padding: 0;
          color: #d8d8d8;
        }
        .pricing-copy li { display: flex; align-items: center; gap: 10px; }
        .pricing-copy li svg { color: ${green}; }
        .download-card {
          padding: 24px;
          border-radius: 24px;
          background: #0a0a0a;
          border: 1px solid rgba(255,255,255,0.09);
          text-align: center;
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
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .store-button:hover { transform: translateY(-1px); border-color: rgba(255,255,255,0.2); }
        .store-button small { display: block; color: #9a9a9a; font-size: 11px; line-height: 1.1; }
        .store-button strong { display: block; color: #fff; font-size: 15px; line-height: 1.2; }
        .final {
          padding-top: 128px;
          padding-bottom: 118px;
          text-align: center;
        }
        .final p { max-width: 620px; margin: 18px auto 30px; }
        .footer {
          min-height: 92px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
          color: #666;
          font-size: 13px;
          text-align: center;
        }
        .footer-brand, .footer-links {
          flex: 1 1 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          text-align: center;
        }
        .footer-copy {
          flex: 2 1 320px;
          display: block;
          text-align: center;
          margin-left: auto;
          margin-right: auto;
        }
        .footer a { color: #777; text-decoration: none; }
        .footer a:hover { color: #fff; }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes fade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 980px) {
          .hero, .product-shell, .features, .proof, .pricing {
            grid-template-columns: 1fr;
            gap: 44px;
          }
          .hero {
            padding-top: 84px;
            text-align: center;
          }
          .hero-copy, .hero-text, .hero h1 { margin-left: auto; margin-right: auto; }
          .hero-actions, .segmented { justify-content: center; margin-left: auto; margin-right: auto; }
          .hero-showcase { min-height: auto; }
          .product-shell { padding: 32px; text-align: center; }
          .tab-copy h3, .tab-copy p { margin-left: auto; margin-right: auto; }
          .features, .proof, .pricing { padding-top: 88px; }
          .quotes { grid-template-columns: 1fr; }
          .download-card { max-width: 380px; margin: 0 auto; width: 100%; }
        }
        @media (max-width: 720px) {
          .nav-inner { height: 66px; padding: 0 18px; }
          .nav-actions { display: none; }
          .menu-button { display: grid; }
          .mobile-menu {
            display: grid;
            gap: 8px;
            padding: 0 18px 16px;
            animation: fade 0.2s ease both;
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
            font-weight: 740;
          }
          .mobile-menu a:last-child { background: #fff; color: #000; }
          .hero, .product, .features, .proof, .pricing, .final, .footer {
            padding-left: 18px;
            padding-right: 18px;
          }
          .hero { padding-top: 62px; padding-bottom: 66px; }
          .hero h1 { font-size: clamp(42px, 13vw, 58px); }
          .hero-text { font-size: 16px; }
          .hero-actions { flex-direction: column; align-items: stretch; }
          .button { width: 100%; }
          .product-shell { padding: 22px; border-radius: 22px; }
          .segmented { width: 100%; }
          .segmented button { flex: 1; padding: 0 10px; }
          .product h2, .features h2, .proof h2, .pricing h2, .final h2 { font-size: 34px; }
          .feature-list article { grid-template-columns: 1fr; gap: 12px; }
          .footer { flex-direction: column; align-items: center; justify-content: center; padding-top: 28px; padding-bottom: 28px; text-align: center; }
          .footer-brand, .footer-links, .footer-copy { flex: initial; width: 100%; justify-content: center; text-align: center; }
        }
      `}</style>
    </main>
  );
}

