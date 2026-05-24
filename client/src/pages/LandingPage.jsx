import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import img3Screens from '../assets/images/screenshot_3images.png';
import imgTourist from '../assets/images/screenshot_tourist_page.png';
import imgEmployee from '../assets/images/screenshot_employee_page.png';
import imgBusiness from '../assets/images/screenshot_business_dashboard.png';
import imgSettings from '../assets/images/screenshot_employee_settings.png';

const green = '#00C896';
const accent = '#00ffcc';
const transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
const appDownloadUrl = 'https://snaptip.me/#get-app';
const playStoreUrl = 'https://github.com/snaptipme-app/tips/releases/latest/download/snaptip.apk';
const appStoreUrl = '#get-app';

const Icon = ({ name, size = 22 }) => {
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
    bolt: <path d="M13 2 4 14h7l-1 8 10-13h-7l2-7Z" />,
    menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
    close: <><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    play: <path d="m5 3 14 9-14 9V3Z" />,
    apple: <><path d="M16.7 13.3c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.7 0-.1-2.5-1-2.5-3.5Z" /><path d="M14.7 6.8c.6-.7 1-1.7.9-2.8-.9 0-1.9.6-2.5 1.3-.6.7-1 1.7-.9 2.7.9.1 1.9-.5 2.5-1.2Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    user: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h2v2h-2z" /><path d="M18 14h3" /><path d="M14 18h1" /><path d="M18 18h3" /><path d="M18 20v-2" /></>,
    dashboard: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 17V9" /><path d="M12 17v-5" /><path d="M16 17V7" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20" /><path d="M12 2a15 15 0 0 0 0 20" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    building: <><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" /><path d="M9 21v-4h3v4" /><path d="M8 7h1" /><path d="M12 7h1" /><path d="M8 11h1" /><path d="M12 11h1" /><path d="M20 21H2" /></>,
    utensils: <><path d="M4 3v8" /><path d="M8 3v8" /><path d="M4 7h4" /><path d="M6 11v10" /><path d="M18 3c-2.2 1.9-3 4-3 7h4v11" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
    quote: <><path d="M10 11H6a4 4 0 0 1 4-4V5a6 6 0 0 0-6 6v7h6v-7Z" /><path d="M20 11h-4a4 4 0 0 1 4-4V5a6 6 0 0 0-6 6v7h6v-7Z" /></>,
    wallet: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h2" /><path d="M2 9h20" /></>,
  };
  return <svg {...props}>{paths[name]}</svg>;
};

const Logo = () => (
  <a href="/" className="logo" aria-label="SnapTip home">
    <span className="logo-mark"><Icon name="bolt" size={19} /></span>
    <span>SnapTip</span>
  </a>
);

const Check = ({ children }) => (
  <li>
    <span><Icon name="check" size={15} /></span>
    {children}
  </li>
);

const Button = ({ href, variant = 'primary', children, large = false }) => (
  <a className={`btn btn-${variant} ${large ? 'btn-large' : ''}`} href={href}>
    {children}
  </a>
);

const StoreButton = ({ href, icon, eyebrow, label, muted = false }) => (
  <a className={`store-btn ${muted ? 'store-btn-muted' : ''}`} href={href} aria-label={`${label} ${eyebrow}`}>
    <Icon name={icon} size={25} />
    <span>
      <small>{eyebrow}</small>
      <strong>{label}</strong>
    </span>
  </a>
);

const AppDownloadCard = ({ compact = false }) => (
  <div className={`app-download-card ${compact ? 'app-download-card-compact' : ''}`} id={compact ? undefined : 'get-app'}>
    <div className="qr-box">
      <QRCodeSVG value={appDownloadUrl} size={compact ? 112 : 148} bgColor="#ffffff" fgColor="#000000" level="M" includeMargin />
    </div>
    <div>
      <span>SCAN TO GET SNAPTIP</span>
      <p>Open this page on your phone and choose your store.</p>
      <div className="store-row">
        <StoreButton href={playStoreUrl} icon="play" eyebrow="Get it on" label="Google Play" />
        <StoreButton href={appStoreUrl} icon="apple" eyebrow="Download on the" label="App Store" muted />
      </div>
    </div>
  </div>
);

const stats = [
  ['10%', 'Commission only'],
  ['$0', 'Monthly fee'],
  ['< 3s', 'Time to tip'],
  ['100%', 'Digital, no cash'],
];

const steps = [
  ['01', 'user', 'Download the App', 'Install SnapTip on your phone, create your profile, and get your unique QR code instantly.'],
  ['02', 'qr', 'Guest Scans', 'Tourists scan your QR code with any smartphone camera. No app download required.'],
  ['03', 'bolt', 'Tip Sent Instantly', 'The tip goes directly to your account in real time. Cash out whenever you want.'],
];

const showcases = [
  {
    tag: 'FOR EMPLOYEES',
    title: 'Track Every Tip in Real Time',
    desc: 'See your balance, tip history, and ratings at a glance. Cash out anytime directly to your bank account.',
    image: imgEmployee,
    alt: 'SnapTip employee tip dashboard showing balance, tips, and ratings',
    points: ['Live balance updates', 'Full transaction history', 'Rating & feedback system', 'Instant cash out'],
  },
  {
    tag: 'FOR GUESTS',
    title: 'Tip in Seconds, No App Needed',
    desc: 'Scan a QR code, choose your amount, and pay with Apple Pay, Google Pay, or card. Done.',
    image: imgTourist,
    alt: 'SnapTip tourist tipping page with amount options',
    points: ['No app download required', 'Apple Pay & Google Pay', 'Leave a rating with your tip', 'Instant confirmation'],
    reverse: true,
  },
  {
    tag: 'FOR BUSINESSES',
    title: "Manage Your Entire Team's Performance",
    desc: 'Invite your staff, track team tips, view ratings, and see who your top performers are all in one dashboard.',
    image: imgBusiness,
    alt: 'SnapTip business dashboard with team analytics and performance charts',
    points: ['Team management', 'Performance analytics', 'Top performers leaderboard', '7-day trend charts'],
  },
];

const featureCards = [
  ['qr', 'QR Code Tips', 'Instant cashless tipping, no hardware needed'],
  ['dashboard', 'Business Dashboard', 'Full team overview and analytics'],
  ['star', 'Rating System', 'Collect guest feedback with every tip'],
  ['globe', 'Multi-Currency', 'MAD, USD, EUR, AED supported'],
  ['bell', 'Push Notifications', 'Real-time alerts for every tip received'],
  ['lock', 'Bank-Level Security', 'SSL encrypted, secure payment processing'],
];

const audiences = [
  ['building', 'Hotels', 'From doormen to concierge, give every staff member their own QR code.'],
  ['utensils', 'Restaurants', 'Waiters, bartenders, and baristas earn more with effortless digital tipping.'],
  ['pin', 'Tour Operators', 'Guides and drivers receive instant tips from international tourists.'],
];

const testimonials = [
  ['Since using SnapTip, my monthly tips have increased significantly. International tourists always have their phones but never local cash.', 'James M., Waiter', 'Marrakech, Morocco'],
  ["Managing my team's earnings has never been this easy. The real-time dashboard gives me full visibility.", 'Sarah K., Hotel Manager', 'Agadir, Morocco'],
  ['Setup took less than 3 minutes. I received my first tip within the hour. Absolutely incredible.', 'Ahmed R., Tour Guide', 'Fes, Morocco'],
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing-page">
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`} aria-label="Main navigation">
        <div className="nav-inner">
          <Logo />
          <div className={`nav-actions ${menuOpen ? 'nav-actions-open' : ''}`}>
            <Button href="#get-app" variant="ghost">Scan QR Code</Button>
            <Button href="#get-app">Get the App</Button>
          </div>
          <button className="menu-btn" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
        {menuOpen && (
          <div className="mobile-menu">
            <a href="#get-app" onClick={closeMenu}>Scan QR Code</a>
            <a href="#get-app" onClick={closeMenu}>Get the App</a>
          </div>
        )}
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <div className="badge"><Icon name="star" size={14} />Trusted by hospitality professionals worldwide</div>
          <h1>Your Guests Want to Tip.<span>Make It Effortless.</span></h1>
          <p>No cash needed. Tourists scan a QR code and tip your staff in seconds. Free to join - SnapTip only takes 10% when you earn.</p>
          <div className="cta-row">
            <Button href="#get-app" large>Get the Mobile App <Icon name="arrow" size={19} /></Button>
            <Button href="#get-app" variant="ghost" large>Scan QR Code</Button>
          </div>
          <AppDownloadCard compact />
          <ul className="trust-row" aria-label="SnapTip trust points">
            <Check>Free to join</Check>
            <Check>No monthly fees</Check>
            <Check>Instant payouts</Check>
          </ul>
        </div>
        <div className="hero-visual" aria-label="SnapTip product screenshots">
          <div className="hero-glow" />
          <img src={img3Screens} alt="Three SnapTip mobile app screenshots for guests, employees, and businesses" />
        </div>
      </section>

      <section className="stats-bar" aria-label="SnapTip pricing and product statistics">
        {stats.map(([value, label]) => (
          <div className="stat" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="section how" id="how-it-works">
        <div className="section-heading">
          <h2>Three Steps to More Tips</h2>
          <p>Setup takes 2 minutes. Start earning more tips today.</p>
        </div>
        <div className="steps">
          <div className="dash-line" />
          {steps.map(([num, icon, title, desc]) => (
            <article className="step-card" key={title}>
              <span className="step-num">{num}</span>
              <div className="icon-box"><Icon name={icon} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section showcase">
        <div className="section-heading">
          <h2>Built for Every Role in Hospitality</h2>
          <p>Whether you're a waiter, a hotel manager, or a tourist - SnapTip works seamlessly for everyone.</p>
        </div>
        <div className="showcase-stack">
          {showcases.map((item) => (
            <article className={`showcase-row ${item.reverse ? 'reverse' : ''}`} key={item.title}>
              <div className="phone-frame">
                <img src={item.image} alt={item.alt} loading="lazy" />
              </div>
              <div className="showcase-copy">
                <span>{item.tag}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <ul>
                  {item.points.map((point) => <Check key={point}>{point}</Check>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section features" id="features">
        <div className="section-heading">
          <h2>Everything You Need to Succeed</h2>
        </div>
        <div className="features-grid">
          {featureCards.map(([icon, title, desc]) => (
            <article className="feature-card" key={title}>
              <Icon name={icon} size={20} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section audiences">
        <div className="section-heading">
          <h2>Perfect For Every Hospitality Business</h2>
        </div>
        <div className="audience-grid">
          {audiences.map(([icon, title, desc]) => (
            <article className="audience-card" key={title}>
              <Icon name={icon} size={34} />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section testimonials">
        <div className="section-heading">
          <h2>Loved by Service Professionals</h2>
        </div>
        <div className="testimonial-grid">
          {testimonials.map(([quote, name, place]) => (
            <article className="testimonial-card" key={name}>
              <Icon name="quote" size={26} />
              <div className="stars" aria-label="Five star rating">★★★★★</div>
              <p>"{quote}"</p>
              <strong>{name}</strong>
              <span>{place}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section pricing" id="pricing">
        <div className="section-heading">
          <h2>Simple, Transparent Pricing</h2>
          <p>No surprises. No monthly fees. We only succeed when you do.</p>
        </div>
        <article className="pricing-card">
          <h3>Free Forever</h3>
          <p className="price-line">Only 10% commission per tip received</p>
          <p className="price-sub">That means if you earn $0, you pay $0. Always.</p>
          <ul>
            {[
              'Free registration - no credit card required',
              'Unlimited QR code tips',
              'Business dashboard included',
              'Rating & feedback system',
              'Multi-currency support (MAD, USD, EUR, AED)',
              'Real-time push notifications',
              'Priority support',
            ].map((item) => <Check key={item}>{item}</Check>)}
          </ul>
          <AppDownloadCard />
          <small>Join today. Start earning in minutes.</small>
        </article>
      </section>

      <section className="final-cta">
        <img src={imgSettings} alt="" loading="lazy" aria-hidden="true" />
        <div>
          <h2>Ready to Earn More Tips?</h2>
          <p>Join hospitality professionals already using SnapTip. Free forever - we only earn when you do.</p>
          <Button href="#get-app" variant="light" large>Get the App <Icon name="arrow" size={19} /></Button>
          <span>No credit card required · Setup in 2 minutes · Cancel anytime</span>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-top">
          <div>
            <Logo />
            <p>The future of tipping is here.</p>
          </div>
          <div className="footer-links">
            <div><h3>Product</h3><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#how-it-works">How it works</a></div>
            <div><h3>Company</h3><a href="/about">About</a><a href="mailto:support@snaptip.me">Contact</a><a href="/blog">Blog</a></div>
            <div><h3>Legal</h3><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a></div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 SnapTip by Hitte Technologies LLC. All rights reserved.</span>
          <div className="socials" aria-label="Social links">
            <a href="https://x.com" aria-label="SnapTip on X"><Icon name="bolt" size={17} /></a>
            <a href="https://linkedin.com" aria-label="SnapTip on LinkedIn"><Icon name="building" size={17} /></a>
            <a href="https://instagram.com" aria-label="SnapTip on Instagram"><Icon name="star" size={17} /></a>
          </div>
        </div>
      </footer>

      <style>{`
        html { scroll-behavior: smooth; }
        body { background: #000; }
        .landing-page {
          min-height: 100vh;
          background: #000;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          overflow-x: hidden;
        }
        .landing-page * { box-sizing: border-box; letter-spacing: 0; }
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid transparent;
          transition: ${transition};
        }
        .navbar-scrolled { border-bottom-color: rgba(255,255,255,0.08); }
        .nav-inner {
          max-width: 1180px;
          margin: 0 auto;
          height: 76px;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          color: ${accent};
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 900;
          font-size: 22px;
          text-decoration: none;
        }
        .logo-mark {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          color: #000;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, ${accent}, ${green});
          box-shadow: 0 0 28px rgba(0,255,204,0.28);
        }
        .nav-actions, .cta-row { display: flex; align-items: center; gap: 12px; }
        .btn {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 0 19px;
          border-radius: 999px;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
          color: #00140f;
          background: linear-gradient(135deg, ${green}, ${accent});
          box-shadow: 0 18px 45px rgba(0,200,150,0.22);
          transition: ${transition};
          white-space: nowrap;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 24px 58px rgba(0,200,150,0.34); }
        .btn-ghost {
          color: #fff;
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          box-shadow: none;
        }
        .btn-ghost:hover { border-color: rgba(0,255,204,0.45); box-shadow: 0 18px 45px rgba(0,255,204,0.08); }
        .btn-light { background: #fff; color: #000; box-shadow: 0 22px 60px rgba(255,255,255,0.2); }
        .btn-large { min-height: 56px; padding: 0 26px; font-size: 16px; }
        .menu-btn { display: none; color: #fff; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; width: 44px; height: 44px; }
        .mobile-menu { display: none; }
        .hero {
          position: relative;
          max-width: 1180px;
          margin: 0 auto;
          padding: 106px 24px 94px;
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
          gap: 56px;
          align-items: center;
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: -200px -20vw auto;
          height: 900px;
          background: radial-gradient(circle at 50% 42%, rgba(0,255,204,0.06), rgba(0,0,0,0) 62%);
          pointer-events: none;
        }
        .hero-copy, .hero-visual { position: relative; z-index: 1; }
        .badge {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: ${accent};
          background: rgba(0,255,204,0.06);
          border: 1px solid rgba(0,255,204,0.16);
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 800;
          margin-bottom: 26px;
        }
        h1, h2, h3, p { margin: 0; }
        .hero h1 {
          max-width: 650px;
          font-size: clamp(46px, 7vw, 72px);
          line-height: 0.98;
          font-weight: 900;
          margin-bottom: 24px;
        }
        .hero h1 span {
          display: block;
          color: ${accent};
          background: linear-gradient(135deg, ${accent}, #7fffe7 45%, ${green});
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero p {
          max-width: 575px;
          color: #a0a0a0;
          font-size: 18px;
          line-height: 1.7;
          margin-bottom: 34px;
        }
        .trust-row, .showcase-copy ul, .pricing-card ul {
          list-style: none;
          padding: 0;
          margin: 24px 0 0;
          display: flex;
          flex-wrap: wrap;
          gap: 14px 18px;
        }
        .trust-row li, .showcase-copy li, .pricing-card li {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #cfcfcf;
          font-size: 14px;
          line-height: 1.35;
        }
        .trust-row li span, .showcase-copy li span, .pricing-card li span {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          flex: 0 0 20px;
          display: grid;
          place-items: center;
          color: #000;
          background: ${accent};
        }
        .app-download-card {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 22px;
          align-items: center;
          text-align: left;
          margin: 34px auto 0;
          padding: 18px;
          max-width: 560px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 22px 70px rgba(0,255,204,0.08);
        }
        .hero-copy .app-download-card { margin-left: 0; margin-right: 0; }
        .app-download-card-compact {
          grid-template-columns: auto 1fr;
          max-width: 530px;
          padding: 14px;
        }
        .qr-box {
          padding: 10px;
          border-radius: 14px;
          background: #fff;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08);
        }
        .qr-box svg { display: block; border-radius: 8px; }
        .app-download-card span {
          display: block;
          color: ${accent};
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .app-download-card p {
          color: #a0a0a0;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .store-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .store-btn {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          color: #fff;
          text-decoration: none;
          background: #111;
          border: 1px solid rgba(255,255,255,0.12);
          transition: ${transition};
        }
        .store-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(0,255,204,0.36);
          box-shadow: 0 16px 40px rgba(0,255,204,0.10);
        }
        .store-btn-muted { opacity: 0.72; }
        .store-btn span { color: inherit; margin: 0; }
        .store-btn small {
          display: block;
          color: #a0a0a0;
          font-size: 10px;
          line-height: 1.1;
          margin-bottom: 3px;
        }
        .store-btn strong {
          display: block;
          color: #fff;
          font-size: 14px;
          line-height: 1.1;
        }
        .hero-visual { min-height: 540px; display: grid; place-items: center; }
        .hero-glow {
          position: absolute;
          width: 82%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,255,204,0.18), rgba(0,200,150,0.06) 42%, transparent 70%);
          filter: blur(24px);
        }
        .hero-visual img {
          position: relative;
          width: min(100%, 560px);
          border-radius: 24px;
          box-shadow: 0 40px 80px rgba(0,196,150,0.15);
          animation: float 4s ease-in-out infinite;
        }
        .stats-bar {
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: #0a0a0a;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          max-width: 100%;
        }
        .stat {
          min-height: 126px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 8px;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .stat:last-child { border-right: 0; }
        .stat strong { color: #fff; font-size: clamp(28px, 4vw, 42px); font-weight: 900; }
        .stat span { color: #777; font-size: 13px; font-weight: 700; }
        .section { max-width: 1180px; margin: 0 auto; padding: 112px 24px 0; }
        .section-heading { text-align: center; max-width: 720px; margin: 0 auto 54px; }
        .section-heading h2 { font-size: clamp(34px, 5vw, 52px); line-height: 1.05; font-weight: 900; margin-bottom: 16px; }
        .section-heading p { color: #a0a0a0; font-size: 17px; line-height: 1.65; }
        .steps { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
        .dash-line {
          position: absolute;
          left: 16%;
          right: 16%;
          top: 52px;
          border-top: 1px dashed rgba(0,255,204,0.34);
          animation: dash 16s linear infinite;
        }
        .step-card, .feature-card, .audience-card, .testimonial-card, .pricing-card {
          position: relative;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          transition: ${transition};
        }
        .step-card { padding: 30px; min-height: 258px; }
        .step-card:hover, .feature-card:hover, .audience-card:hover { transform: translateY(-4px); border-color: rgba(0,255,204,0.34); box-shadow: 0 22px 70px rgba(0,255,204,0.10); }
        .step-num { color: ${accent}; font-weight: 900; font-size: 13px; }
        .icon-box { margin: 20px 0 22px; width: 54px; height: 54px; border-radius: 15px; display: grid; place-items: center; color: ${accent}; background: rgba(0,255,204,0.08); border: 1px solid rgba(0,255,204,0.16); }
        .step-card h3, .feature-card h3, .audience-card h3 { font-size: 20px; margin-bottom: 10px; }
        .step-card p, .feature-card p, .audience-card p { color: #a0a0a0; line-height: 1.65; font-size: 15px; }
        .showcase-stack { display: grid; gap: 84px; }
        .showcase-row { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 70px; align-items: center; }
        .showcase-row.reverse { grid-template-columns: 1.1fr 0.9fr; }
        .showcase-row.reverse .phone-frame { order: 2; }
        .showcase-row.reverse .showcase-copy { order: 1; }
        .phone-frame {
          width: min(100%, 360px);
          margin: 0 auto;
          padding: 13px;
          border-radius: 36px;
          background: linear-gradient(145deg, #1a1a1a, #050505);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 36px 90px rgba(0,0,0,0.48), 0 18px 60px rgba(0,255,204,0.08);
          transform: perspective(900px) rotateY(-6deg) rotateX(2deg);
        }
        .showcase-row.reverse .phone-frame { transform: perspective(900px) rotateY(6deg) rotateX(2deg); }
        .phone-frame img { width: 100%; display: block; border-radius: 26px; background: #111; }
        .showcase-copy span { color: ${accent}; font-weight: 900; font-size: 12px; }
        .showcase-copy h3 { font-size: clamp(30px, 4vw, 44px); line-height: 1.08; margin: 12px 0 18px; }
        .showcase-copy p { color: #a0a0a0; font-size: 17px; line-height: 1.7; max-width: 560px; }
        .showcase-copy ul, .pricing-card ul { display: grid; gap: 13px; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .feature-card { padding: 26px; min-height: 190px; color: ${accent}; }
        .feature-card h3 { color: #fff; margin-top: 24px; }
        .audience-grid, .testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .audience-card { padding: 34px; min-height: 250px; color: ${accent}; background: #0a0a0a; }
        .audience-card:hover { background: linear-gradient(#0a0a0a,#0a0a0a) padding-box, linear-gradient(135deg, ${accent}, transparent, ${green}) border-box; }
        .audience-card h3 { color: #fff; margin-top: 30px; }
        .testimonial-card { padding: 28px; min-height: 306px; backdrop-filter: blur(16px); }
        .testimonial-card svg { color: ${accent}; margin-bottom: 18px; }
        .stars { color: ${accent}; font-size: 18px; margin-bottom: 18px; }
        .testimonial-card p { color: #d7d7d7; line-height: 1.7; margin-bottom: 22px; }
        .testimonial-card strong { display: block; margin-bottom: 5px; }
        .testimonial-card span { color: #777; font-size: 14px; }
        .pricing { padding-bottom: 42px; }
        .pricing-card {
          max-width: 640px;
          margin: 0 auto;
          padding: 42px;
          text-align: center;
          border-color: rgba(0,255,204,0.34);
          box-shadow: 0 0 90px rgba(0,255,204,0.11);
        }
        .pricing-card h3 { font-size: clamp(36px, 5vw, 54px); margin-bottom: 12px; }
        .price-line { color: #fff; font-size: 20px; font-weight: 800; }
        .price-sub { color: #a0a0a0; margin: 10px 0 28px; }
        .pricing-card ul { text-align: left; margin: 0 auto 30px; max-width: 450px; }
        .pricing-card small { display: block; color: #777; margin-top: 18px; }
        .final-cta {
          position: relative;
          overflow: hidden;
          margin-top: 70px;
          padding: 104px 24px;
          text-align: center;
          background: radial-gradient(circle at 50% 50%, rgba(0,255,204,0.18), rgba(0,200,150,0.08) 36%, #000 72%);
          border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .final-cta img {
          position: absolute;
          right: max(20px, calc((100vw - 1180px) / 2));
          top: 50%;
          width: 170px;
          opacity: 0.18;
          transform: translateY(-50%) rotate(8deg);
          border-radius: 24px;
        }
        .final-cta div { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; }
        .final-cta h2 { font-size: clamp(38px, 6vw, 64px); line-height: 1; margin-bottom: 18px; }
        .final-cta p { color: #d2d2d2; font-size: 18px; line-height: 1.7; margin: 0 auto 30px; max-width: 650px; }
        .final-cta span { display: block; margin-top: 18px; color: #a0a0a0; font-size: 14px; }
        .footer { max-width: 1180px; margin: 0 auto; padding: 56px 24px 32px; }
        .footer-top { display: grid; grid-template-columns: 1fr 1.6fr; gap: 60px; padding-bottom: 42px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .footer-top p { color: #777; margin-top: 14px; }
        .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .footer-links h3 { font-size: 14px; margin-bottom: 15px; }
        .footer a { color: #888; text-decoration: none; transition: ${transition}; }
        .footer a:hover { color: ${accent}; }
        .footer-links a { display: block; font-size: 14px; margin: 11px 0; }
        .footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-top: 24px; color: #666; font-size: 13px; }
        .socials { display: flex; gap: 10px; }
        .socials a { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; border: 1px solid rgba(255,255,255,0.08); }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes dash { to { stroke-dashoffset: -100; background-position: 180px 0; } }
        @media (max-width: 1024px) {
          .hero { grid-template-columns: 1fr; text-align: center; padding-top: 76px; }
          .hero-copy, .hero p, .hero h1 { margin-left: auto; margin-right: auto; }
          .badge, .cta-row, .trust-row { justify-content: center; }
          .hero-copy .app-download-card { margin-left: auto; margin-right: auto; }
          .hero-visual { min-height: auto; }
          .hero-visual img { max-width: 640px; }
          .showcase-row, .showcase-row.reverse { grid-template-columns: 1fr; gap: 34px; text-align: center; }
          .showcase-row.reverse .phone-frame, .showcase-row.reverse .showcase-copy { order: initial; }
          .showcase-copy p { margin-left: auto; margin-right: auto; }
          .showcase-copy ul { justify-items: center; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 767px) {
          .nav-inner { height: 68px; padding: 0 18px; }
          .nav-actions { display: none; }
          .menu-btn { display: grid; place-items: center; }
          .mobile-menu {
            display: grid;
            gap: 10px;
            padding: 0 18px 18px;
            animation: menuDrop 0.24s ease-out both;
          }
          .mobile-menu a {
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 14px;
            color: #fff;
            text-decoration: none;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            font-weight: 800;
          }
          .mobile-menu a:last-child { color: #00140f; background: linear-gradient(135deg, ${green}, ${accent}); }
          .hero { padding: 58px 18px 72px; gap: 42px; }
          .hero h1 { font-size: clamp(42px, 13vw, 58px); }
          .hero p { font-size: 16px; }
          .cta-row { flex-direction: column; align-items: stretch; }
          .btn-large { width: 100%; }
          .app-download-card, .app-download-card-compact { grid-template-columns: 1fr; text-align: center; }
          .qr-box { width: fit-content; margin: 0 auto; }
          .store-row { grid-template-columns: 1fr; }
          .stats-bar { grid-template-columns: repeat(2, 1fr); }
          .stat { min-height: 112px; border-bottom: 1px solid rgba(255,255,255,0.06); }
          .stat:nth-child(2n) { border-right: 0; }
          .section { padding: 82px 18px 0; }
          .steps, .features-grid, .audience-grid, .testimonial-grid { grid-template-columns: 1fr; }
          .dash-line { display: none; }
          .step-card, .feature-card, .audience-card, .testimonial-card { min-height: auto; }
          .phone-frame { max-width: 310px; }
          .pricing-card { padding: 30px 22px; }
          .final-cta { padding: 82px 18px; }
          .final-cta img { display: none; }
          .footer-top, .footer-links { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; align-items: flex-start; }
        }
        @keyframes menuDrop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
