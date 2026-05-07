import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { getTranslation, getLanguageCode, isRTL } from '../i18n/translations';

/* ─── Suggested tip presets per currency ──────────────────────────────── */
const SUGGESTED_TIPS = {
  USD: [2,    5,     10,    20    ],
  EUR: [2,    5,     10,    20    ],
  GBP: [1,    2,     5,     10    ],
  MAD: [20,   50,    100,   200   ],
  AED: [10,   20,    50,    100   ],
  PHP: [50,   100,   200,   500   ],
  THB: [50,   100,   200,   500   ],
  IDR: [20000, 50000, 100000, 200000],
};

const TIER_META = [
  { emoji: '☕', label: 'Quick Thanks',   variant: 'subtle'   },
  { emoji: '🌟', label: 'Great Service',  variant: 'popular'  },
  { emoji: '💎', label: 'Excellent',      variant: 'cyan'     },
  { emoji: '👑', label: 'Outstanding',    variant: 'gold'     },
];

function getTipPresets(currency) {
  return SUGGESTED_TIPS[currency] ?? SUGGESTED_TIPS.USD;
}

function formatCurrency(amount, currency) {
  if (amount == null) return '';
  return `${amount} ${currency || 'MAD'}`;
}

/* ─── Slider range — adapt to currency magnitude ──────────────────────── */
function getSliderConfig(presets) {
  const [first, , , last] = presets;
  const min = Math.max(1, Math.floor(first / 2));
  const max = Math.ceil(last * 2.5);
  const step = first >= 10000 ? 1000 : first >= 100 ? 10 : first >= 10 ? 5 : 1;
  return { min, max, step };
}

/* ─── SVG Components ─────────────────────────────────────────────────── */
const SnapTipIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" style={{ display: 'block' }}>
    <path d="M14 2L4 14h7l-1 8 10-12h-7l1-8z" fill="#00FF66" stroke="#00FF66" strokeWidth="0.5" strokeLinejoin="round" />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M12 1l2.4 2 3.1-.4 1 3 2.9 1.3-.5 3.1L23 12l-2.1 2-.5 3.1-2.9 1.3-1 3-3.1-.4L12 23l-2.4-2-3.1.4-1-3-2.9-1.3.5-3.1L1 12l2.1-2 .5-3.1 2.9-1.3 1-3 3.1.4L12 1z" fill="#00C896"/>
    <path d="M7.5 12.3l3 3 6-6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RestaurantIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
  </svg>
);

const VisaSmall = () => (
  <span style={{ background: '#fff', borderRadius: 3, padding: '2px 5px', fontSize: 9, fontWeight: 800, color: '#1a1f71', fontStyle: 'italic', letterSpacing: '-0.02em', display: 'inline-block', lineHeight: 1 }}>VISA</span>
);
const MastercardSmall = () => (
  <svg width="22" height="14" viewBox="0 0 28 18" fill="none">
    <circle cx="10" cy="9" r="8" fill="#eb001b" />
    <circle cx="18" cy="9" r="8" fill="#f79e1b" />
    <path d="M14 1.46a8 8 0 0 1 0 15.08A8 8 0 0 1 14 1.46z" fill="#ff5f00" />
  </svg>
);
const AmexSmall = () => (
  <span style={{ background: '#016fd0', borderRadius: 3, padding: '2px 4px', fontSize: 7, fontWeight: 800, color: '#fff', display: 'inline-block', lineHeight: 1 }}>AMEX</span>
);

const StarIcon = ({ filled, size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : 'rgba(255,255,255,0.25)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

/* ─── Helpers ─────────────────────────────────────────────────────────── */
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
      <span style={{ fontSize: '64px', fontWeight: 700, color: '#00C896' }}>{letter}</span>
    </div>
  );
}

const PAYMENT_METHODS = [
  { id: 'apple',  label: 'Apple Pay',     bg: '#000', logo: 'apple'  },
  { id: 'google', label: 'Google Pay',    bg: '#fff', logo: 'google' },
  { id: 'card',   label: 'Pay with Card', bg: 'rgba(255,255,255,0.05)', logo: 'card' },
];

/* ─── Animated checkmark for success ──────────────────────────────────── */
function AnimatedCheckmark() {
  return (
    <div style={{
      width: 88, height: 88, borderRadius: '50%',
      background: 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
      boxShadow: '0 0 48px rgba(0,200,150,0.5), 0 0 96px rgba(0,200,150,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
    }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
        <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'drawCheck 0.6s ease 0.3s forwards' }} />
      </svg>
    </div>
  );
}

function SuccessOverlay({ amount, currency, employeeName, thankYouMessage, onClose, t }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(ellipse at bottom left, rgba(0,200,150,0.18) 0%, transparent 60%), radial-gradient(ellipse at top right, rgba(0,255,102,0.06) 0%, transparent 60%), #1a1a1a`,
      padding: 20, animation: 'fadeIn 0.3s ease-out',
    }}>
      <AnimatedCheckmark />
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginTop: 28, marginBottom: 12, textAlign: 'center' }}>{t.successTitle}</h2>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
        Your tip of <span style={{ color: '#00C896', fontWeight: 700 }}>{formatCurrency(amount, currency)}</span> has been sent to{' '}
        <span style={{ color: '#fff', fontWeight: 600 }}>{employeeName}</span>
      </p>
      {thankYouMessage && (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', marginTop: 12, marginBottom: 8, maxWidth: 340, width: '100%' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>"{thankYouMessage}"</p>
        </div>
      )}
      <button onClick={onClose} style={{
        width: '100%', maxWidth: 340, height: 56, borderRadius: 50,
        background: 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
        boxShadow: '0 8px 32px rgba(0,200,150,0.4)',
        border: 'none', color: '#1a1a1a', fontSize: 18, fontWeight: 700,
        cursor: 'pointer', marginTop: 32, transition: 'all 0.2s ease',
      }}>{t.successButton}</button>
    </div>
  );
}

/* ─── Inline keyframes + slider styles ────────────────────────────────── */
const inlineStyles = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes drawCheck { to { stroke-dashoffset: 0; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 32px rgba(0,200,150,0.35), 0 0 0 0 rgba(0,200,150,0.4); }
    50%      { box-shadow: 0 0 56px rgba(0,200,150,0.55), 0 0 0 8px rgba(0,200,150,0.0); }
  }

  .tip-slider {
    -webkit-appearance: none; appearance: none;
    width: 100%; height: 6px; border-radius: 50px;
    outline: none; cursor: pointer;
  }
  .tip-slider::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 22px; height: 22px; border-radius: 50%;
    background: #00C896; border: 3px solid #fff;
    box-shadow: 0 0 16px rgba(0,200,150,0.6);
    cursor: pointer; transition: transform 0.15s ease;
  }
  .tip-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .tip-slider::-moz-range-thumb {
    width: 22px; height: 22px; border-radius: 50%;
    background: #00C896; border: 3px solid #fff;
    box-shadow: 0 0 16px rgba(0,200,150,0.6);
    cursor: pointer; border: none;
  }
`;

/* ═══════════════════════════════════════════════════════════════════════
   TipPage — Tourist-facing payment page (premium fintech redesign)
   ═══════════════════════════════════════════════════════════════════════ */
export default function TipPage() {
  const { username } = useParams();
  const [employee, setEmployee] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [amount, setAmount] = useState(0);          // single source of truth
  const [rating, setRating] = useState(0);          // 0 = not rated; 1-5 = stars
  const [hoverRating, setHoverRating] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('apple');
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentError, setPaymentError] = useState('');

  const t = useMemo(() => getTranslation(), []);
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
          setEmployee(empRes.value.data);
        } else {
          const status = empRes.reason?.response?.status;
          if (status === 404) setNotFound(true);
          else setError(empRes.reason?.response?.data?.error || 'Something went wrong.');
        }
        if (bizRes.status === 'fulfilled') {
          setBusiness(bizRes.value.data?.business || null);
        }
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [username]);

  const currency = employee?.currency || 'MAD';
  const tipPresets = useMemo(() => getTipPresets(currency), [currency]);
  const sliderCfg = useMemo(() => getSliderConfig(tipPresets), [tipPresets]);

  // Default to "Great Service" once presets are known
  useEffect(() => {
    if (employee && amount === 0) setAmount(tipPresets[1]);
  }, [employee, tipPresets, amount]);

  const handlePay = async () => {
    if (amount <= 0) return;
    setSending(true);
    setPaymentError('');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const response = await api.post('/payments/mock', {
        employee_username: username,
        amount,
        currency,
        payment_method: paymentMethod,
        rating: rating > 0 ? rating : null,
      });
      if (response.data?.success) {
        setTipAmount(amount);
        setShowSuccess(true);
      } else {
        setPaymentError(response.data?.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentError(err?.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setAmount(tipPresets[1]);
    setRating(0);
  };

  const pageBg = {
    minHeight: '100dvh',
    background: `radial-gradient(ellipse at bottom left, rgba(0,200,150,0.12) 0%, transparent 55%), radial-gradient(ellipse at top right, rgba(0,200,150,0.04) 0%, transparent 50%), #1a1a1a`,
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid #00C896', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
      </>
    );
  }

  /* ─── Not Found ─── */
  if (notFound) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '40px 24px', textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
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

  /* ─── Error ─── */
  if (error) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '40px 24px', textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{t.notFoundTitle}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>{error}</p>
            <Link to="/login" style={{ fontSize: 13, color: '#00C896', fontWeight: 600, textDecoration: 'underline' }}>{t.employeeLogin}</Link>
          </div>
        </div>
      </>
    );
  }

  const photoSrc = getPhotoSrc(employee);
  const payDisabled = sending || amount <= 0;
  const tipCount = employee.tip_count || 0;
  const ratingAvg = employee.rating_avg;        // null if no ratings yet
  const ratingDisplay = ratingAvg != null ? ratingAvg.toFixed(1) : '5.0';

  // Slider fill % for the green track
  const sliderPct = Math.max(
    0,
    Math.min(100, ((amount - sliderCfg.min) / (sliderCfg.max - sliderCfg.min)) * 100)
  );
  const sliderTrack = `linear-gradient(to right, #00C896 0%, #00C896 ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%, rgba(255,255,255,0.1) 100%)`;

  return (
    <>
      <style>{inlineStyles}</style>

      <div style={{ ...pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center' }} dir={rtl ? 'rtl' : 'ltr'}>

        {showSuccess && (
          <SuccessOverlay
            amount={tipAmount}
            currency={currency}
            employeeName={employee.full_name}
            thankYouMessage={business?.thank_you_message}
            onClose={handleCloseSuccess}
            t={t}
          />
        )}

        <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>

          {/* ── ① Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 24, marginBottom: 20 }}>
            <SnapTipIcon />
            <span style={{ fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>SnapTip</span>
          </div>

          {/* ── ② Hero profile card ── */}
          <div style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 24,
            padding: '32px 24px 26px',
            marginBottom: 24,
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
            animation: 'slideUp 0.5s ease-out',
          }}>
            {/* Photo with green glow */}
            <div style={{
              width: 168, height: 168, borderRadius: '50%',
              border: '3px solid #00ffcc',
              boxShadow: '0 0 48px rgba(0,255,204,0.5), 0 0 80px rgba(0,200,150,0.25)',
              overflow: 'hidden', margin: '0 auto 18px', position: 'relative',
            }}>
              {photoSrc ? (
                <img src={photoSrc} alt={employee.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <AvatarFallback name={employee.full_name} />
              )}
            </div>

            {/* Name + verified */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>{employee.full_name}</h1>
              <VerifiedBadge />
            </div>

            {employee.job_title && (
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 12px' }}>{employee.job_title}</p>
            )}

            {/* Restaurant pill */}
            {business && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)', borderRadius: 50,
                padding: '6px 14px', marginBottom: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
              }}>
                <RestaurantIcon />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{business.business_name}</span>
              </div>
            )}

            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Hope you had a great experience!
            </p>

            {/* Stats row */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ color: '#f59e0b', fontSize: 14 }}>★</span>
              <span style={{ fontWeight: 600 }}>{ratingDisplay}</span>
              <span>·</span>
              <span>{tipCount} {tipCount === 1 ? 'tip received' : 'tips received'}</span>
            </div>
          </div>

          {/* ── ③ Tip amount ── */}
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Choose your tip
          </h3>

          {/* 2x2 preset grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, animation: 'slideUp 0.5s ease-out 0.1s both' }}>
            {tipPresets.map((amt, i) => {
              const meta = TIER_META[i];
              const isSelected = amount === amt;
              const baseStyle = {
                position: 'relative', height: 70, borderRadius: 16,
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                fontFamily: 'inherit', padding: '8px 4px',
              };
              let style;
              if (meta.variant === 'popular') {
                style = isSelected
                  ? { ...baseStyle, background: 'rgba(0,200,150,0.15)', border: '2px solid #00ffcc', boxShadow: '0 0 28px rgba(0,255,204,0.4)' }
                  : { ...baseStyle, background: 'rgba(0,200,150,0.08)', border: '1.5px solid rgba(0,255,204,0.45)', boxShadow: '0 0 18px rgba(0,255,204,0.18)' };
              } else if (meta.variant === 'cyan') {
                style = isSelected
                  ? { ...baseStyle, background: 'rgba(0,200,150,0.12)', border: '2px solid #00C896', boxShadow: '0 0 24px rgba(0,200,150,0.3)' }
                  : { ...baseStyle, background: 'linear-gradient(135deg, rgba(0,255,204,0.05), rgba(255,255,255,0.03))', border: '1px solid rgba(0,255,204,0.18)' };
              } else if (meta.variant === 'gold') {
                style = isSelected
                  ? { ...baseStyle, background: 'rgba(245,158,11,0.12)', border: '2px solid #f59e0b', boxShadow: '0 0 24px rgba(245,158,11,0.3)' }
                  : { ...baseStyle, background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(255,255,255,0.03))', border: '1px solid rgba(245,158,11,0.25)' };
              } else {
                style = isSelected
                  ? { ...baseStyle, background: 'rgba(0,200,150,0.12)', border: '2px solid #00C896', boxShadow: '0 0 24px rgba(0,200,150,0.3)' }
                  : { ...baseStyle, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };
              }
              const labelColor = meta.variant === 'gold' && !isSelected ? '#f59e0b' :
                                  isSelected && meta.variant === 'popular' ? '#00ffcc' :
                                  isSelected ? '#00C896' : '#fff';
              return (
                <button key={amt} onClick={() => setAmount(amt)} style={style}>
                  {meta.variant === 'popular' && (
                    <span style={{
                      position: 'absolute', top: -8, right: 10,
                      background: 'linear-gradient(135deg, #00C896, #00FF66)',
                      color: '#1a1a1a', fontSize: 8, fontWeight: 800,
                      padding: '3px 8px', borderRadius: 50, letterSpacing: 0.5,
                      boxShadow: '0 2px 8px rgba(0,200,150,0.4)',
                    }}>POPULAR</span>
                  )}
                  <span style={{ fontSize: 14, fontWeight: 600, color: labelColor, lineHeight: 1.1 }}>
                    {meta.emoji} {meta.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                    {amt} {currency}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom amount slider */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
            padding: '16px 18px 18px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 22,
            animation: 'slideUp 0.5s ease-out 0.15s both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>Custom Amount</span>
              <span style={{ fontSize: 16, color: '#00C896', fontWeight: 800 }}>{amount} {currency}</span>
            </div>
            <input
              type="range"
              className="tip-slider"
              min={sliderCfg.min}
              max={sliderCfg.max}
              step={sliderCfg.step}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ background: sliderTrack }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              <span>{sliderCfg.min} {currency}</span>
              <span>{sliderCfg.max} {currency}</span>
            </div>
          </div>

          {/* ── ④ Rating section ── */}
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Rating
          </h3>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16, padding: '20px 18px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 22, textAlign: 'center',
            animation: 'slideUp 0.5s ease-out 0.2s both',
          }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px', fontWeight: 600 }}>
              How was your experience?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n === rating ? 0 : n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', transition: 'transform 0.15s ease' }}
                >
                  <StarIcon filled={n <= (hoverRating || rating)} size={32} />
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              {rating > 0 ? `${rating} / 5` : 'Optional'}
            </p>
          </div>

          {/* ── ⑤ Payment method ── */}
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Payment
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18, animation: 'slideUp 0.5s ease-out 0.25s both' }}>
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = paymentMethod === pm.id;
              const cardStyle = {
                height: 64, borderRadius: 14,
                background: pm.bg,
                border: isSelected ? '2px solid #00C896' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected ? '0 0 24px rgba(0,200,150,0.4)' : 'none',
                cursor: 'pointer', transition: 'all 0.2s ease',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: 6,
              };
              return (
                <button key={pm.id} onClick={() => setPaymentMethod(pm.id)} style={cardStyle}>
                  {pm.logo === 'apple' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <svg width="14" height="16" viewBox="0 0 14 17" fill="#fff"><path d="M13.1 5.7c-.1.1-1.9 1.1-1.9 3.3 0 2.6 2.3 3.5 2.3 3.5 0 .1-.4 1.2-1.2 2.4-.7 1-1.5 2.1-2.6 2.1s-1.5-.6-2.8-.6c-1.4 0-1.8.7-2.9.7s-1.7-.9-2.5-2.1C.4 13.3 0 11.1 0 9 0 5.8 2 4.1 3.9 4.1c1 0 1.9.7 2.5.7.6 0 1.6-.7 2.8-.7.5 0 2.2.1 3.3 1.3l.6.3zm-3.8-1.3c.5-.6.9-1.5.9-2.3 0-.1 0-.3 0-.4-.8 0-1.8.6-2.4 1.2-.4.5-.9 1.4-.9 2.3 0 .1 0 .3 0 .4.1 0 .2 0 .3 0 .8 0 1.6-.5 2.1-1.2z" /></svg>
                      <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Pay</span>
                    </div>
                  )}
                  {pm.logo === 'google' && (
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
                      <span style={{ color: '#4285f4' }}>G</span>
                      <span style={{ color: '#000', marginLeft: 4 }}>Pay</span>
                    </span>
                  )}
                  {pm.logo === 'card' && (
                    <>
                      <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, lineHeight: 1 }}>Pay with Card</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                        <VisaSmall />
                        <MastercardSmall />
                        <AmexSmall />
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Payment error */}
          {paymentError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '12px 16px', marginBottom: 12,
              textAlign: 'center', animation: 'fadeIn 0.3s ease-out',
            }}>
              <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 600, margin: 0 }}>{paymentError}</p>
            </div>
          )}

          {/* ── ⑥ Pay button ── */}
          <button
            onClick={handlePay}
            disabled={payDisabled}
            style={{
              width: '100%', height: 60, borderRadius: 50,
              background: payDisabled ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
              boxShadow: payDisabled ? 'none' : '0 8px 32px rgba(0,200,150,0.45)',
              border: 'none',
              color: payDisabled ? 'rgba(255,255,255,0.3)' : '#1a1a1a',
              fontSize: 18, fontWeight: 800,
              opacity: payDisabled ? 0.5 : 1,
              cursor: payDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              animation: payDisabled ? 'slideUp 0.5s ease-out 0.3s both' : 'slideUp 0.5s ease-out 0.3s both, pulseGlow 2.4s ease-in-out 1.5s infinite',
              letterSpacing: '-0.01em',
            }}
          >
            {sending ? (
              <>
                <div style={{ width: 20, height: 20, border: '2px solid #1a1a1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Processing...
              </>
            ) : (
              `Pay ${amount} ${currency}`
            )}
          </button>

          {/* ── ⑦ Footer ── */}
          <div style={{ textAlign: 'center', marginTop: 18, paddingBottom: 32, animation: 'slideUp 0.5s ease-out 0.4s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10, color: 'rgba(255,255,255,0.3)' }}>
              <LockIcon />
              <span style={{ fontSize: 12 }}>Secure payment · Powered by SnapTip</span>
            </div>
            <Link to="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontWeight: 500 }}>
              {t.employeeLogin} →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
