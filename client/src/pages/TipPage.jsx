import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import api from '../api';
import { getTranslation, getLanguageCode, isRTL } from '../i18n/translations';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const hasUsableStripePublishableKey = /^pk_(test|live)_/.test(stripePublishableKey) && !stripePublishableKey.includes('...');
const stripePromise = hasUsableStripePublishableKey ? loadStripe(stripePublishableKey) : null;

function logPaymentDebug(message, details = {}) {
  console.log(`[TipPage payment] ${message}`, details);
}

/* ─── Suggested tip presets per currency ─────────────────────────────────── */
const SUGGESTED_TIPS = {
  USD: [2,    5,     10,    20    ],
  EUR: [2,    5,     10,    20    ],
  GBP: [1,    2,     5,     10    ],
  CAD: [2,    5,     10,    20    ],
  AUD: [2,    5,     10,    20    ],
  NZD: [2,    5,     10,    20    ],
  SGD: [2,    5,     10,    20    ],
  CHF: [2,    5,     10,    20    ],
  DKK: [20,   50,    100,   200   ],
  NOK: [20,   50,    100,   200   ],
  SEK: [20,   50,    100,   200   ],
  PLN: [10,   20,    50,    100   ],
  MYR: [10,   20,    50,    100   ],
  MXN: [20,   50,    100,   200   ],
  MAD: [20,   50,    100,   200   ],
  AED: [10,   20,    50,    100   ],
  JPY: [200,  500,   1000,  2000  ],
  HKD: [20,   50,    100,   200   ],
  PHP: [50,   100,   200,   500   ],
  THB: [50,   100,   200,   500   ],
  IDR: [20000, 50000, 100000, 200000],
};

/* ─── Quick chips for custom amount input ───────────────────────────────── */
const QUICK_CHIPS = {
  USD: [3,   7,    15,   25,   50   ],
  EUR: [3,   7,    15,   25,   50   ],
  GBP: [3,   7,    15,   20,   50   ],
  CAD: [5,   10,   15,   25,   50   ],
  AUD: [5,   10,   15,   25,   50   ],
  NZD: [5,   10,   15,   25,   50   ],
  SGD: [5,   10,   15,   25,   50   ],
  CHF: [3,   7,    15,   25,   50   ],
  DKK: [20,  50,   100,  150,  200  ],
  NOK: [20,  50,   100,  150,  200  ],
  SEK: [20,  50,   100,  150,  200  ],
  PLN: [10,  20,   50,   100,  200  ],
  MYR: [10,  20,   50,   100,  200  ],
  MXN: [20,  50,   100,  200,  500  ],
  MAD: [30,  50,   100,  200,  500  ],
  AED: [10,  20,   50,   100,  200  ],
  JPY: [500, 1000, 2000, 5000, 10000],
  HKD: [20,  50,   100,  200,  500  ],
  PHP: [50,  100,  200,  500,  1000 ],
  THB: [50,  100,  200,  500,  1000 ],
  IDR: [20000, 50000, 100000, 200000, 500000],
};

function getQuickChips(currency) {
  return QUICK_CHIPS[currency] ?? QUICK_CHIPS.USD;
}

/* ─── Tier icons (stroke-based, 38px viewBox to match prototype) ────────── */
const TierIconCoffee = ({ color = '#6b7280' }) => (
  <svg width="36" height="36" viewBox="0 0 38 38" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 8 C13 6 14 5 13 3"/>
    <path d="M19 8 C19 6 20 5 19 3"/>
    <path d="M8 11 L9 26 C9 27.1 9.9 28 11 28 L27 28 C28.1 28 29 27.1 29 26 L30 11 Z"/>
    <path d="M30 15 L33 15 C34.7 15 36 16.3 36 18 C36 19.7 34.7 21 33 21 L30 21"/>
    <line x1="6" y1="31" x2="32" y2="31"/>
    <path d="M16 19.5 C16 18 17 17 18.5 18 C19 18.3 19 18.5 19 18.5 C19 18.5 19 18.3 19.5 18 C21 17 22 18 22 19.5 C22 21 19 23 19 23 C19 23 16 21 16 19.5 Z"/>
  </svg>
);

const TierIconStar = ({ color = '#6b7280' }) => (
  <svg width="36" height="36" viewBox="0 0 38 38" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5 L22.5 13.5 L32 14.3 L25.5 20.2 L27.5 30 L19 25.2 L10.5 30 L12.5 20.2 L6 14.3 L15.5 13.5 Z"/>
  </svg>
);

const TierIconGift = ({ color = '#6b7280' }) => (
  <svg width="36" height="36" viewBox="0 0 38 38" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="7" y="19" width="24" height="14" rx="1.5"/>
    <rect x="6" y="13" width="26" height="6" rx="1.5"/>
    <line x1="19" y1="13" x2="19" y2="33"/>
    <line x1="6" y1="16" x2="32" y2="16"/>
    <path d="M19 13 C17 10 13 9 12 11 C11 13 15 13 19 13 Z"/>
    <path d="M19 13 C21 10 25 9 26 11 C27 13 23 13 19 13 Z"/>
  </svg>
);

const TierIconDiamond = ({ color = '#6b7280' }) => (
  <svg width="36" height="36" viewBox="0 0 38 38" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5 L33 16 L19 34 L5 16 Z"/>
    <path d="M5 16 L12 9 L19 5"/>
    <path d="M19 5 L26 9 L33 16"/>
    <line x1="5" y1="16" x2="33" y2="16"/>
    <path d="M12 9 L19 16 L26 9"/>
  </svg>
);

const TIER_META = [
  { Icon: TierIconCoffee,  label: 'Quick Thanks',  popular: false },
  { Icon: TierIconStar,    label: 'Great Service', popular: true  },
  { Icon: TierIconGift,    label: 'Excellent',     popular: false },
  { Icon: TierIconDiamond, label: 'Outstanding',   popular: false },
];

function getTipPresets(currency) {
  return SUGGESTED_TIPS[currency] ?? SUGGESTED_TIPS.USD;
}

function formatCurrency(amount, currency) {
  if (amount == null) return '';
  return `${amount} ${currency || 'MAD'}`;
}

/* ─── SVG components ─────────────────────────────────────────────────────── */
const SnapTipBolt = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" style={{ display: 'block', filter: 'drop-shadow(0 0 8px rgba(0,255,204,0.6))' }}>
    <path d="M14 2L4 14h7l-1 8 10-12h-7l1-8z" fill="#00ffcc" stroke="#00ffcc" strokeWidth="0.5" strokeLinejoin="round"/>
  </svg>
);

const VerifiedBadge = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="11" fill="#00ffcc"/>
    <path d="M7 12.5l3.5 3.5 6.5-7" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RestaurantIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </svg>
);

const StarIcon = ({ filled, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? '#00ffcc' : 'none'}
    stroke={filled ? '#00ffcc' : '#374151'}
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    style={filled ? { filter: 'drop-shadow(0 0 5px rgba(0,255,204,0.5))' } : {}}
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function getPhotoSrc(employee) {
  if (!employee) return '';
  if (employee.photo_base64) return employee.photo_base64;
  const BASE = 'https://snaptip.me';
  if (employee.profile_image_url?.startsWith('/')) return `${BASE}${employee.profile_image_url}`;
  if (employee.profile_image_url) return employee.profile_image_url;
  if (employee.photo_url?.startsWith('/')) return `${BASE}${employee.photo_url}`;
  if (employee.photo_url) return employee.photo_url;
  return '';
}

function AvatarFallback({ name }) {
  const letter = (name || 'U').charAt(0).toUpperCase();
  return (
    <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,200,150,0.15)' }}>
      <span style={{ fontSize: '42px', fontWeight: 700, color: '#00C896' }}>{letter}</span>
    </div>
  );
}

/* ─── Coin SVG for rain effect ────────────────────────────────────────────── */
function CoinIcon({ size = 28, symbol = '$', color = '#00C896' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill={color} opacity="0.9"/>
      <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2"/>
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700" fontFamily="Inter, Arial, sans-serif">{symbol}</text>
    </svg>
  );
}

const COINS = [
  { left: '8%',  size: 24, delay: 0.1, duration: 2.2, symbol: '$', color: '#00C896' },
  { left: '18%', size: 20, delay: 0.4, duration: 2.6, symbol: '€', color: '#818cf8' },
  { left: '30%', size: 28, delay: 0.0, duration: 2.0, symbol: '$', color: '#f59e0b' },
  { left: '42%', size: 22, delay: 0.6, duration: 2.8, symbol: '€', color: '#00C896' },
  { left: '55%', size: 26, delay: 0.2, duration: 2.3, symbol: '$', color: '#818cf8' },
  { left: '65%', size: 18, delay: 0.8, duration: 3.0, symbol: '€', color: '#f59e0b' },
  { left: '75%', size: 30, delay: 0.3, duration: 2.1, symbol: '$', color: '#00C896' },
  { left: '85%', size: 22, delay: 0.5, duration: 2.5, symbol: '€', color: '#818cf8' },
  { left: '12%', size: 18, delay: 0.9, duration: 2.7, symbol: '$', color: '#f59e0b' },
  { left: '92%', size: 20, delay: 0.7, duration: 2.4, symbol: '€', color: '#00C896' },
];

function AnimatedCheckmark() {
  return (
    <div style={{
      width: 96, height: 96, borderRadius: '50%',
      background: 'linear-gradient(135deg, #00C896 0%, #00B4D8 100%)',
      boxShadow: '0 0 40px rgba(0,200,150,0.35), 0 0 80px rgba(0,200,150,0.12)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'checkScaleIn 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{
        position: 'absolute', inset: -8, borderRadius: '50%',
        border: '2px solid rgba(0,200,150,0.3)',
        animation: 'ringExpand 0.8s ease-out 0.3s forwards',
        opacity: 0,
      }}/>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.5s ease 0.4s forwards' }}/>
      </svg>
    </div>
  );
}

function SuccessStars({ rating }) {
  if (!rating || rating <= 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16, animation: 'fadeInUp 0.5s ease-out 1s both' }}>
      {[1,2,3,4,5].map(n => (
        <svg key={n} width="22" height="22" viewBox="0 0 24 24"
          fill={n <= rating ? '#00ffcc' : 'none'}
          stroke={n <= rating ? '#00ffcc' : 'rgba(255,255,255,0.2)'}
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ animation: n <= rating ? `starPop 0.3s ease ${0.9 + n * 0.08}s both` : 'none' }}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
    </div>
  );
}

function SuccessOverlay({ amount, currency, employeeName, thankYouMessage, rating, onClose, t }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 45%, rgba(0,255,204,0.10) 0%, transparent 50%), #000000`,
      padding: 20, animation: 'fadeIn 0.3s ease-out', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
        {COINS.map((coin, i) => (
          <div key={i} style={{ position: 'absolute', left: coin.left, top: -40, animation: `coinFall ${coin.duration}s ease-in ${coin.delay}s both`, opacity: 0 }}>
            <div style={{ animation: `coinSpin ${coin.duration * 0.8}s linear ${coin.delay}s infinite` }}>
              <CoinIcon size={coin.size} symbol={coin.symbol} color={coin.color}/>
            </div>
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 360, width: '100%' }}>
        <AnimatedCheckmark/>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginTop: 24, marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em', animation: 'fadeInUp 0.5s ease-out 0.5s both' }}>
          Tip Sent! 🎉
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 4, lineHeight: 1.6, animation: 'fadeInUp 0.5s ease-out 0.7s both' }}>
          Your tip of <span style={{ color: '#00C896', fontWeight: 700 }}>{formatCurrency(amount, currency)}</span> has been sent to{' '}
          <span style={{ color: '#fff', fontWeight: 600 }}>{employeeName}</span>
        </p>
        <SuccessStars rating={rating}/>
        {thankYouMessage && (
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 20px', border: '1px solid rgba(255,255,255,0.06)', marginTop: 14, width: '100%', animation: 'fadeInUp 0.5s ease-out 1.1s both' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>"{thankYouMessage}"</p>
          </div>
        )}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 16, fontWeight: 500, animation: 'fadeInUp 0.4s ease-out 1.2s both' }}>
          Thank you for your generosity!
        </p>
        <button onClick={onClose} style={{
          width: '100%', height: 56, borderRadius: 50,
          background: 'linear-gradient(135deg, #00C896 0%, #00B4D8 100%)',
          boxShadow: '0 6px 24px rgba(0,180,216,0.2)',
          border: 'none', color: '#1a1a1a', fontSize: 18, fontWeight: 700,
          cursor: 'pointer', marginTop: 28,
          animation: 'slideUpBtn 0.6s cubic-bezier(0.16,1,0.3,1) 1.2s both',
        }}>{t.successButton || 'Done'}</button>
      </div>
    </div>
  );
}

/* ─── Stripe checkout form (logic fully preserved) ───────────────────────── */
function StripeCheckoutForm({ amount, currency, clientSecret, onSuccess, onError, onProcessing, sending, t }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  const handleConfirmPayment = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      onError('Payment form is still loading. Please try again.');
      return;
    }
    onProcessing(true);
    onError('');
    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        onError(submitResult.error.message || 'Please check your payment details and try again.');
        return;
      }
      const result = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (result.error) {
        onError(result.error.message || 'Payment failed. Please try again.');
        return;
      }
      onSuccess();
    } catch (err) {
      onError(err?.message || 'Payment failed. Please try again.');
    } finally {
      onProcessing(false);
    }
  };

  return (
    <form onSubmit={handleConfirmPayment} style={{
      background: '#111', borderRadius: 16, padding: 16,
      border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14, animation: 'fadeIn 0.3s ease-out',
    }}>
      {!paymentElementReady && (
        <div style={{ minHeight: 92, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14, color: 'rgba(255,255,255,0.58)', fontSize: 13, fontWeight: 600 }}>
          <div style={{ width: 16, height: 16, border: '2px solid #00C896', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>
          Loading secure payment form...
        </div>
      )}
      <PaymentElement
        options={{ layout: { type: 'tabs', defaultCollapsed: false }, paymentMethodOrder: ['apple_pay', 'google_pay', 'card'] }}
        onLoaderStart={() => console.log('[TipPage payment] PaymentElement loader started')}
        onReady={() => { console.log('[TipPage payment] PaymentElement ready'); setPaymentElementReady(true); }}
        onLoadError={(event) => { setPaymentElementReady(false); onError(event?.error?.message || 'Stripe payment form failed to load. Please refresh and try again.'); }}
      />
      <button
        type="submit"
        disabled={sending || !stripe || !elements || !paymentElementReady}
        style={{
          width: '100%', height: 56, borderRadius: 50, border: 'none',
          background: (sending || !paymentElementReady) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00ffcc 0%, #00C896 100%)',
          boxShadow: (sending || !paymentElementReady) ? 'none' : '0 4px 24px rgba(0,255,204,0.28)',
          color: (sending || !paymentElementReady) ? 'rgba(255,255,255,0.35)' : '#000',
          fontSize: 17, fontWeight: 700,
          opacity: (sending || !paymentElementReady) ? 0.7 : 1,
          cursor: (sending || !paymentElementReady) ? 'not-allowed' : 'pointer',
          transition: 'all 250ms ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          marginTop: 16, letterSpacing: '-0.2px',
        }}
      >
        {sending ? (
          <><div style={{ width: 18, height: 18, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>Processing...</>
        ) : (
          `${t.confirmPayment || 'Confirm payment'} ${formatCurrency(amount, currency)}`
        )}
      </button>
    </form>
  );
}

/* ─── Inline keyframes ───────────────────────────────────────────────────── */
const inlineStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', system-ui, sans-serif; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes checkScaleIn {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes ringExpand {
    0%   { transform: scale(0.8); opacity: 0.6; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes drawCheck { to { stroke-dashoffset: 0; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeInUp {
    from { transform: translateY(14px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideUpBtn {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0); opacity: 1; }
  }
  @keyframes coinFall {
    0%   { transform: translateY(0); opacity: 0; }
    8%   { opacity: 0.85; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(105vh); opacity: 0; }
  }
  @keyframes coinSpin {
    0%   { transform: rotateY(0deg) rotateZ(0deg); }
    100% { transform: rotateY(360deg) rotateZ(25deg); }
  }
  @keyframes starPop {
    0%   { transform: scale(0); opacity: 0; }
    60%  { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 4px 24px rgba(0,255,204,0.28); }
    50%      { box-shadow: 0 6px 40px rgba(0,255,204,0.48); }
  }

  .tip-card-v2 { -webkit-tap-highlight-color: transparent; user-select: none; }
  .tip-card-v2:active { transform: scale(0.97); }
  .pay-btn-main:hover { opacity: 0.92; }
  .pay-btn-main:active { transform: scale(0.98); opacity: 0.88; }
  .quick-chip:hover { border-color: #00ffcc !important; color: #00ffcc !important; background: rgba(0,255,204,0.06) !important; }
  .s-btn-v2 { -webkit-tap-highlight-color: transparent; }
  .s-btn-v2:active { transform: scale(0.82); }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   TipPage — Tourist-facing payment page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function TipPage() {
  const { username } = useParams();
  const [employee,   setEmployee]   = useState(null);
  const [business,   setBusiness]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [error,      setError]      = useState('');

  const [amount,       setAmount]       = useState(0);
  const [customInput,  setCustomInput]  = useState('');   // text value for input field
  const [rating,       setRating]       = useState(0);
  const [hoverRating,  setHoverRating]  = useState(0);
  const [sending,      setSending]      = useState(false);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [tipAmount,    setTipAmount]    = useState(0);
  const [paymentError, setPaymentError] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const t   = useMemo(() => getTranslation(), []);
  const rtl = useMemo(() => isRTL(), []);

  useEffect(() => {
    const lang = getLanguageCode();
    document.documentElement.lang = lang;
    if (rtl) document.documentElement.dir = 'rtl';
    return () => { document.documentElement.dir = 'ltr'; document.documentElement.lang = 'en'; };
  }, [rtl]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [empRes, bizRes] = await Promise.allSettled([
          api.get(`/employee/${username}`, { signal: controller.signal }),
          api.get(`/business/public/${username}`, { signal: controller.signal }),
        ]);
        if (empRes.status === 'fulfilled') {
          const emp = empRes.value.data;
          try {
            const ratingRes = await api.get(`/employee/${emp.id}/rating-stats`, { signal: controller.signal });
            emp.rating_avg   = ratingRes.data.average_rating;
            emp.rating_count = ratingRes.data.total_ratings;
            emp.rating_breakdown = ratingRes.data.rating_breakdown;
          } catch { /* keep whatever the employee endpoint returned */ }
          setEmployee(emp);
        } else {
          const status = empRes.reason?.response?.status;
          if (status === 404) setNotFound(true);
          else setError(empRes.reason?.response?.data?.error || 'Something went wrong.');
        }
        if (bizRes.status === 'fulfilled') setBusiness(bizRes.value.data?.business || null);
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [username]);

  const currency    = employee?.currency || 'MAD';
  const tipPresets  = useMemo(() => getTipPresets(currency), [currency]);
  const quickChips  = useMemo(() => getQuickChips(currency), [currency]);

  // Default to "Great Service" once presets are known
  useEffect(() => {
    if (employee && amount === 0) {
      const def = tipPresets[1];
      setAmount(def);
      setCustomInput(String(def));
    }
  }, [employee, tipPresets, amount]);

  useEffect(() => {
    setClientSecret('');
    setPaymentError('');
  }, [amount, currency, rating]);

  /* Custom input change: update amount + sync with preset cards */
  const handleCustomInput = (val) => {
    setCustomInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) setAmount(parsed);
    else if (val === '' || val === '0') setAmount(0);
  };

  /* Preset card click: update both amount and input field */
  const handlePresetSelect = (amt) => {
    setAmount(amt);
    setCustomInput(String(amt));
  };

  /* Quick chip click */
  const handleChipSelect = (chip) => {
    setAmount(chip);
    setCustomInput(String(chip));
  };

  /* ─── Payment logic (fully preserved) ──────────────────────────────── */
  const handlePay = async () => {
    logPaymentDebug('Pay clicked', { amount, currency, employeeId: employee?.id, hasUsableStripePublishableKey });
    if (amount <= 0 || !employee?.id) {
      setPaymentError('Choose a valid tip amount before paying.');
      return;
    }
    if (!hasUsableStripePublishableKey || !stripePromise) {
      setPaymentError('Stripe is not configured. Add a real VITE_STRIPE_PUBLISHABLE_KEY on the client.');
      return;
    }
    setSending(true);
    setPaymentError('');
    setClientSecret('');
    try {
      logPaymentDebug('Creating PaymentIntent', { employeeId: employee.id, amount, currency, rating: rating > 0 ? rating : null });
      const response = await api.post('/payment/create-intent', {
        employeeId: employee.id, amount, currency, rating: rating > 0 ? rating : null,
      });
      logPaymentDebug('PaymentIntent response received', { status: response.status, success: response.data?.success, hasClientSecret: Boolean(response.data?.clientSecret) });
      if (response.data?.success && response.data?.clientSecret) {
        setTipAmount(Number(response.data.amount || amount));
        setClientSecret(response.data.clientSecret);
      } else {
        setPaymentError(response.data?.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentError(err?.response?.data?.error || err?.message || 'Payment failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    const def = tipPresets[1];
    setAmount(def);
    setCustomInput(String(def));
    setRating(0);
    setClientSecret('');
  };

  const handleStripeSuccess = useCallback(() => {
    setPaymentError('');
    setClientSecret('');
    setShowSuccess(true);
  }, []);

  /* ─── Loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #00C896', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>
        </div>
      </>
    );
  }

  /* ─── Not Found ───────────────────────────────────────────────────────── */
  if (notFound) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 24px', textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{t.notFoundTitle || 'User Not Found'}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>This profile does not exist or may have been removed.</p>
            <Link to="/login" style={{ fontSize: 13, color: '#00C896', fontWeight: 600, textDecoration: 'underline' }}>{t.employeeLogin}</Link>
          </div>
        </div>
      </>
    );
  }

  /* ─── Error ───────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 24px', textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{t.notFoundTitle}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>{error}</p>
            <Link to="/login" style={{ fontSize: 13, color: '#00C896', fontWeight: 600, textDecoration: 'underline' }}>{t.employeeLogin}</Link>
          </div>
        </div>
      </>
    );
  }

  /* ─── Main render ─────────────────────────────────────────────────────── */
  const photoSrc     = getPhotoSrc(employee);
  const payDisabled  = sending || amount <= 0;
  const tipCount     = employee.tip_count || 0;
  const ratingAvg    = employee.rating_avg;
  const ratingCount  = employee.rating_count || 0;
  const hasRatings   = ratingAvg != null && ratingCount > 0;
  const ratingDisplay = hasRatings ? Number(ratingAvg).toFixed(1) : null;

  return (
    <>
      <style>{inlineStyles}</style>

      <div style={{ minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center' }} dir={rtl ? 'rtl' : 'ltr'}>

        {showSuccess && (
          <SuccessOverlay
            amount={tipAmount} currency={currency} employeeName={employee.full_name}
            thankYouMessage={business?.thank_you_message} rating={rating}
            onClose={handleCloseSuccess} t={t}
          />
        )}

        <div style={{ width: '100%', maxWidth: 430, minHeight: '100dvh', background: '#000', display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>

          {/* ── ① Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: 7,
          }}>
            <SnapTipBolt/>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>SnapTip</span>
          </div>

          {/* ── ② Profile (centered, no card bg) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px 20px', textAlign: 'center' }}>
            {/* Avatar with conic-gradient teal ring */}
            <div style={{
              width: 100, height: 100, borderRadius: '50%', padding: 3,
              background: 'conic-gradient(#00ffcc, #00C896, #00ffcc)',
              boxShadow: '0 0 24px rgba(0,255,204,0.3)',
              marginBottom: 16, flexShrink: 0,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#1c2333' }}>
                {photoSrc
                  ? <img src={photoSrc} alt={employee.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                  : <AvatarFallback name={employee.full_name}/>}
              </div>
            </div>

            {/* Name + verified */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 5 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>{employee.full_name}</h1>
              <VerifiedBadge/>
            </div>

            {/* Role */}
            {employee.job_title && (
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 5, marginTop: 0 }}>{employee.job_title}</p>
            )}

            {/* Business pill */}
            {business && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 50, padding: '4px 12px', marginBottom: 9, border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                <RestaurantIcon/>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{business.business_name}</span>
              </div>
            )}

            {/* Rating + tips row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {hasRatings ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#00ffcc"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{ratingDisplay}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>({ratingCount})</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }}/>
                  <span>{tipCount} tips</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#00ffcc"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span>No ratings yet</span>
                  {tipCount > 0 && (
                    <><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', display: 'inline-block' }}/><span>{tipCount} tips</span></>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── ③ Tip card grid ── */}
          <div style={{ padding: '6px 20px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 12, margin: '0 0 12px' }}>
              Choose your tip
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {tipPresets.map((amt, i) => {
                const { Icon, label, popular } = TIER_META[i];
                const isSelected = amount === amt;
                return (
                  <button
                    key={amt}
                    className="tip-card-v2"
                    onClick={() => handlePresetSelect(amt)}
                    style={{
                      background: isSelected ? 'rgba(0,255,204,0.06)' : '#111',
                      border: isSelected ? '1.5px solid #00ffcc' : '1.5px solid rgba(255,255,255,0.08)',
                      boxShadow: isSelected ? '0 0 0 1px rgba(0,255,204,0.1)' : 'none',
                      borderRadius: 16,
                      padding: '16px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color .18s, background .18s, box-shadow .18s',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    {popular && (
                      <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#00ffcc', color: '#000',
                        fontSize: 9, fontWeight: 700, letterSpacing: '.7px',
                        textTransform: 'uppercase', padding: '4px 9px',
                        borderRadius: '0 16px 0 9px',
                      }}>Popular</span>
                    )}
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon color={isSelected ? '#00ffcc' : '#6b7280'}/>
                    </div>
                    {/* Info */}
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                        {amt} <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>{currency}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ④ Custom amount input + chips ── */}
          <div style={{ padding: '22px 20px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
              Custom Amount
            </p>
            {/* Currency tag + input */}
            <div style={{
              display: 'flex', alignItems: 'stretch', background: '#111',
              border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden',
            }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00ffcc'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,255,204,0.1)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{
                background: 'rgba(0,255,204,0.1)', borderRight: '1px solid rgba(255,255,255,0.08)',
                padding: '0 16px', display: 'flex', alignItems: 'center',
                fontSize: 13, fontWeight: 700, color: '#00ffcc', letterSpacing: '.5px',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>
                {currency}
              </div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={customInput}
                onChange={e => handleCustomInput(e.target.value)}
                placeholder="0.00"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  padding: '0 16px', height: 54, fontSize: 24, fontWeight: 600,
                  color: '#fff', fontFamily: 'inherit', minWidth: 0,
                }}
              />
            </div>
            {/* Quick chips */}
            <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
              {quickChips.map(chip => {
                const isOn = amount === chip;
                return (
                  <button
                    key={chip}
                    className="quick-chip"
                    onClick={() => handleChipSelect(chip)}
                    style={{
                      background: isOn ? 'rgba(0,255,204,0.06)' : '#161616',
                      border: `1px solid ${isOn ? '#00ffcc' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                      color: isOn ? '#00ffcc' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'border-color .15s, color .15s, background .15s',
                    }}
                  >
                    {chip} {currency}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ⑤ Rating ── */}
          <div style={{ padding: '22px 20px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
              Rating
            </p>
            <div style={{ background: '#161616', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 16px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 14, margin: '0 0 14px' }}>How was your experience?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                {[0,1,2,3,4].map(i => (
                  <button
                    key={i}
                    className="s-btn-v2"
                    onClick={() => setRating(i + 1 === rating ? 0 : i + 1)}
                    onMouseEnter={() => setHoverRating(i + 1)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3, borderRadius: 6, transition: 'transform .12s' }}
                  >
                    <StarIcon filled={i < (hoverRating || rating)} size={30}/>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                {rating > 0 ? `${rating} / 5` : 'Optional'}
              </p>
            </div>
          </div>

          {/* ── ⑥ Payment section ── */}
          <div style={{ padding: '22px 20px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' }}>
              Payment
            </p>

            {/* Stripe PaymentElement (handles Apple Pay / Google Pay / Card automatically) */}
            {clientSecret && stripePromise && (
              <Elements
                key={clientSecret}
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#00C896',
                      colorBackground: '#111111',
                      colorText: '#ffffff',
                      colorDanger: '#ef4444',
                      borderRadius: '12px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, DM Sans, Inter, sans-serif',
                    },
                  },
                }}
              >
                <StripeCheckoutForm
                  amount={tipAmount || amount} currency={currency} clientSecret={clientSecret}
                  sending={sending} t={t}
                  onProcessing={setSending} onError={setPaymentError} onSuccess={handleStripeSuccess}
                />
              </Elements>
            )}

            {/* Payment error */}
            {paymentError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>{paymentError}</p>
              </div>
            )}

            {/* ── ⑦ Pay button ── */}
            {!clientSecret && (
              <button
                className="pay-btn-main"
                onClick={handlePay}
                disabled={payDisabled}
                style={{
                  width: '100%',
                  background: payDisabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00ffcc 0%, #00C896 100%)',
                  border: 'none', borderRadius: 50, padding: '17px 20px',
                  fontSize: 17, fontWeight: 700,
                  color: payDisabled ? 'rgba(255,255,255,0.3)' : '#000',
                  fontFamily: 'inherit', cursor: payDisabled ? 'not-allowed' : 'pointer',
                  letterSpacing: '-0.2px',
                  boxShadow: payDisabled ? 'none' : '0 4px 24px rgba(0,255,204,0.28)',
                  opacity: payDisabled ? 0.5 : 1,
                  transition: 'opacity .15s, transform .12s, box-shadow .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  animation: payDisabled ? 'none' : 'pulseGlow 2.4s ease-in-out 1.5s infinite',
                }}
              >
                {sending ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}/>Processing...</>
                ) : (
                  `Pay ${amount} ${currency}`
                )}
              </button>
            )}

            {/* ── ⑧ Secure footer ── */}
            <div style={{ textAlign: 'center', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, color: 'rgba(255,255,255,0.3)' }}>
              <LockIcon/>
              <span style={{ fontSize: 12 }}>Secure payment · Powered by Stripe</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
