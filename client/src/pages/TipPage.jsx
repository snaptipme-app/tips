import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { getTranslation, getLanguageCode, isRTL } from '../i18n/translations';

/* ─── Currency helpers ────────────────────────────────────────────────── */
function getTipPresets(currency) {
  switch (currency) {
    case 'MAD': return [10, 20, 50, 100];
    case 'EUR': return [2, 5, 10, 20];
    case 'GBP': return [1, 2, 5, 10];
    case 'AED': return [5, 10, 20, 50];
    default:    return [1, 2, 5, 10]; // USD + others
  }
}

function formatCurrency(amount, currency) {
  if (!amount && amount !== 0) return '';
  switch (currency) {
    case 'USD': return `$${amount}`;
    case 'EUR': return `€${amount}`;
    case 'GBP': return `£${amount}`;
    default:    return `${amount} ${currency || 'MAD'}`;
  }
}

function getCurrencyPrefix(currency) {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default:    return '';
  }
}

function getCurrencySuffix(currency) {
  switch (currency) {
    case 'USD': case 'EUR': case 'GBP': return '';
    default: return ` ${currency || 'MAD'}`;
  }
}

/* ─── SVG Components ─────────────────────────────────────────────────── */
const SnapTipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="32" height="32" style={{ borderRadius: '10px', display: 'block' }}>
    <rect width="1024" height="1024" rx="225" fill="#080818" />
    <path d="M620 200 L340 580 H540 L440 840 L720 460 H520 L620 200 Z" fill="#00FF66" stroke="#00FF66" strokeWidth="15" strokeLinejoin="round" />
  </svg>
);

const ApplePayLogo = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#000', borderRadius: '6px', padding: '4px 10px', height: '28px' }}>
    <svg width="12" height="14" viewBox="0 0 14 17" fill="white"><path d="M13.1 5.7c-.1.1-1.9 1.1-1.9 3.3 0 2.6 2.3 3.5 2.3 3.5 0 .1-.4 1.2-1.2 2.4-.7 1-1.5 2.1-2.6 2.1s-1.5-.6-2.8-.6c-1.4 0-1.8.7-2.9.7s-1.7-.9-2.5-2.1C.4 13.3 0 11.1 0 9 0 5.8 2 4.1 3.9 4.1c1 0 1.9.7 2.5.7.6 0 1.6-.7 2.8-.7.5 0 2.2.1 3.3 1.3l.6.3zm-3.8-1.3c.5-.6.9-1.5.9-2.3 0-.1 0-.3 0-.4-.8 0-1.8.6-2.4 1.2-.4.5-.9 1.4-.9 2.3 0 .1 0 .3 0 .4.1 0 .2 0 .3 0 .8 0 1.6-.5 2.1-1.2z" /></svg>
    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600, marginLeft: '2px' }}>Pay</span>
  </div>
);

const GooglePayLogo = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: '#fff', borderRadius: '6px', padding: '4px 10px', height: '28px' }}>
    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '-0.02em' }}>
      <span style={{ color: '#4285f4' }}>G</span>
      <span style={{ color: '#ea4335' }}>P</span>
      <span style={{ color: '#fbbc05' }}>a</span>
      <span style={{ color: '#4285f4' }}>y</span>
    </span>
  </div>
);

const CreditCardIcon = () => (
  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <rect width="32" height="22" rx="4" fill="#1a3c7d" />
      <rect x="0" y="6" width="32" height="3" fill="#d4380d" />
      <rect x="0" y="9" width="32" height="3" fill="#ffd666" />
    </svg>
  </div>
);

const VisaLogo = () => (
  <div style={{ background: '#fff', borderRadius: '4px', padding: '2px 6px', height: '22px', display: 'flex', alignItems: 'center' }}>
    <span style={{ fontSize: '11px', fontWeight: 800, color: '#1a1f71', fontStyle: 'italic', letterSpacing: '-0.02em' }}>VISA</span>
  </div>
);

const MastercardLogo = () => (
  <svg width="28" height="18" viewBox="0 0 28 18" fill="none">
    <circle cx="10" cy="9" r="8" fill="#eb001b" />
    <circle cx="18" cy="9" r="8" fill="#f79e1b" />
    <path d="M14 1.46a8 8 0 0 1 0 15.08A8 8 0 0 1 14 1.46z" fill="#ff5f00" />
  </svg>
);

const AmexLogo = () => (
  <div style={{ background: '#016fd0', borderRadius: '4px', padding: '2px 5px', height: '22px', display: 'flex', alignItems: 'center' }}>
    <span style={{ fontSize: '8px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>AMEX</span>
  </div>
);

const CheckCircleGreen = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="11" fill="#00C896" />
    <path d="M6 11l3.5 3.5L16 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,200,150,0.12)' }}>
      <span style={{ fontSize: '32px', fontWeight: 700, color: '#00C896' }}>{letter}</span>
    </div>
  );
}

const PAYMENT_METHODS = [
  { id: 'apple', label: 'Apple Pay', Logo: ApplePayLogo },
  { id: 'google', label: 'Google Pay', Logo: GooglePayLogo },
  { id: 'card', label: 'Pay with Card', Logo: CreditCardIcon },
];

/* ─── Animated SVG Checkmark ──────────────────────────────────────────── */
function AnimatedCheckmark() {
  return (
    <div style={{
      width: '88px', height: '88px', borderRadius: '50%',
      background: 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
      boxShadow: '0 0 48px rgba(0,200,150,0.5), 0 0 96px rgba(0,200,150,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'scaleIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
    }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4L19 7"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: 30,
            animation: 'drawCheck 0.6s ease 0.3s forwards',
          }}
        />
      </svg>
    </div>
  );
}

/* ─── Success Screen ──────────────────────────────────────────────────── */
function SuccessOverlay({ amount, currency, employeeName, thankYouMessage, onClose, t }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: `
        radial-gradient(ellipse at bottom left, rgba(0,200,150,0.18) 0%, transparent 60%),
        radial-gradient(ellipse at top right, rgba(0,255,102,0.06) 0%, transparent 60%),
        #080818
      `,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <AnimatedCheckmark />

      <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginTop: '28px', marginBottom: '12px', textAlign: 'center' }}>
        {t.successTitle}
      </h2>

      <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '8px', lineHeight: '1.6' }}>
        Your tip of <span style={{ color: '#00C896', fontWeight: 700 }}>{formatCurrency(amount, currency)}</span> has been sent to{' '}
        <span style={{ color: '#fff', fontWeight: 600 }}>{employeeName}</span>
      </p>

      {thankYouMessage && (
        <div style={{
          background: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px 20px',
          border: '1px solid rgba(255,255,255,0.06)', marginTop: '12px', marginBottom: '8px',
          maxWidth: '340px', width: '100%',
        }}>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic', lineHeight: '1.5', margin: 0 }}>
            "{thankYouMessage}"
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        style={{
          width: '100%', maxWidth: '340px', height: '56px', borderRadius: '50px',
          background: 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
          boxShadow: '0 8px 32px rgba(0,200,150,0.4)',
          border: 'none', color: '#080818', fontSize: '18px', fontWeight: 700,
          cursor: 'pointer', marginTop: '32px',
          transition: 'all 0.2s ease',
        }}
      >
        {t.successButton}
      </button>
    </div>
  );
}

/* ─── Inline keyframes ────────────────────────────────────────────────── */
const inlineStyles = `
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes drawCheck { to { stroke-dashoffset: 0; } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

/* ═══════════════════════════════════════════════════════════════════════
   TipPage — Tourist-facing payment page
   ═══════════════════════════════════════════════════════════════════════ */
export default function TipPage() {
  const { username } = useParams();
  const [employee, setEmployee] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('card');
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
    (async () => {
      try {
        const [empRes, bizRes] = await Promise.allSettled([
          api.get(`/employee/${username}?t=${Date.now()}`),
          api.get(`/business/public/${username}`),
        ]);
        if (empRes.status === 'fulfilled') {
          setEmployee(empRes.value.data);
        } else {
          setError(empRes.reason?.response?.data?.error || 'Employee not found.');
        }
        if (bizRes.status === 'fulfilled') {
          setBusiness(bizRes.value.data?.business || null);
        }
      } catch {
        setError('Something went wrong.');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const currency = employee?.currency || 'MAD';
  const tipPresets = useMemo(() => getTipPresets(currency), [currency]);
  const currencyPrefix = getCurrencyPrefix(currency);
  const currencySuffix = getCurrencySuffix(currency);

  const handleSelectAmount = (amount) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustom = () => {
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const getFinalAmount = () => {
    if (isCustom) return parseFloat(customAmount) || 0;
    return selectedAmount || 0;
  };

  const handlePay = async () => {
    const amount = getFinalAmount();
    if (amount <= 0) return;
    setSending(true);
    setPaymentError('');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      console.log('[DEBUG TipPage] Sending payment:', { employee_username: username, amount, currency });
      const response = await api.post('/payments/mock', {
        employee_username: username,
        amount,
        currency,
        payment_method: paymentMethod,
      });
      console.log('[DEBUG TipPage] Payment response:', response.data);
      if (response.data?.success) {
        setTipAmount(amount);
        setShowSuccess(true);
      } else {
        setPaymentError(response.data?.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      console.error('[DEBUG TipPage] Payment error:', err?.response?.data || err.message);
      setPaymentError(err?.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSelectedAmount(null);
    setCustomAmount('');
    setIsCustom(false);
  };

  const pageBg = {
    minHeight: '100dvh',
    background: `
      radial-gradient(ellipse at bottom left, rgba(0,200,150,0.12) 0%, transparent 55%),
      radial-gradient(ellipse at top right, rgba(0,200,150,0.04) 0%, transparent 50%),
      #080818
    `,
  };

  /* ─── Loading ─── */
  if (loading) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ ...pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #00C896', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
        </div>
      </>
    );
  }

  /* ─── Error ─── */
  if (error) {
    return (
      <>
        <style>{inlineStyles}</style>
        <div style={{ ...pageBg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{t.notFoundTitle}</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>{error}</p>
            <Link to="/login" style={{ fontSize: '13px', color: '#00C896', fontWeight: 600, textDecoration: 'underline' }}>
              {t.employeeLogin}
            </Link>
          </div>
        </div>
      </>
    );
  }

  const finalAmount = getFinalAmount();
  const photoSrc = getPhotoSrc(employee);
  const payDisabled = sending || finalAmount <= 0;
  const avgTip = tipPresets[Math.floor(tipPresets.length / 2)];

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

        <div style={{ width: '100%', maxWidth: '390px', padding: '0 20px' }}>

          {/* ① Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', paddingTop: '20px', marginBottom: '16px' }}>
            <SnapTipIcon />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>SnapTip</span>
          </div>

          {/* ② Employee card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '28px 24px',
            marginBottom: '20px',
            textAlign: 'center',
            border: '1px solid rgba(0,200,150,0.1)',
            boxShadow: '0 0 40px rgba(0,200,150,0.04)',
            animation: 'slideUp 0.5s ease-out',
          }}>
            <div style={{
              width: '90px', height: '90px', borderRadius: '50%',
              border: '2.5px solid rgba(0,200,150,0.6)',
              boxShadow: '0 0 20px rgba(0,200,150,0.2)',
              overflow: 'hidden', margin: '0 auto 14px',
            }}>
              {photoSrc ? (
                <img src={photoSrc} alt={employee.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <AvatarFallback name={employee.full_name} />
              )}
            </div>

            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{employee.full_name}</h1>

            {employee.job_title && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{employee.job_title}</p>
            )}

            {business && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,200,150,0.08)', borderRadius: '50px', padding: '4px 12px', marginTop: '4px', border: '1px solid rgba(0,200,150,0.15)' }}>
                {(business.logo_base64 || business.logo_url) ? (
                  <img src={business.logo_base64 || business.logo_url} alt="" style={{ width: '16px', height: '16px', borderRadius: '4px', objectFit: 'cover' }} />
                ) : null}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(0,200,150,0.8)' }}>{business.business_name}</span>
              </div>
            )}

            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>{t.tagline}</p>
          </div>

          {/* ③ Tip Amount Selection */}
          <div style={{ marginBottom: '20px', animation: 'slideUp 0.5s ease-out 0.1s both' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose tip amount
            </h3>

            {/* 2×2 preset grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              {tipPresets.map((amt) => {
                const isSelected = selectedAmount === amt && !isCustom;
                return (
                  <button
                    key={amt}
                    onClick={() => handleSelectAmount(amt)}
                    style={{
                      height: '56px', borderRadius: '14px',
                      border: isSelected ? '2px solid #00C896' : '1px solid rgba(255,255,255,0.08)',
                      background: isSelected ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.05)',
                      boxShadow: isSelected ? '0 0 20px rgba(0,200,150,0.2)' : 'none',
                      color: isSelected ? '#00C896' : '#ffffff',
                      fontSize: '18px', fontWeight: 700,
                      cursor: 'pointer', transition: 'all 0.2s ease',
                    }}
                  >
                    {formatCurrency(amt, currency)}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount */}
            <button
              onClick={handleCustom}
              style={{
                width: '100%', height: '52px', borderRadius: '14px',
                border: isCustom ? '2px solid #00C896' : '1px solid rgba(255,255,255,0.08)',
                background: isCustom ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.05)',
                boxShadow: isCustom ? '0 0 20px rgba(0,200,150,0.2)' : 'none',
                color: isCustom ? '#00C896' : '#ffffff',
                fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s ease',
              }}
            >
              {t.customAmount}
            </button>

            {isCustom && (
              <div style={{ marginTop: '10px', position: 'relative', animation: 'fadeIn 0.3s ease-out' }}>
                {currencyPrefix && (
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '18px', fontWeight: 700 }}>
                    {currencyPrefix}
                  </span>
                )}
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  placeholder={t.enterAmount}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%', height: '52px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(0,200,150,0.3)',
                    color: '#ffffff', fontSize: '17px', fontWeight: 700,
                    textAlign: 'center',
                    paddingLeft: currencyPrefix ? '36px' : '14px',
                    paddingRight: currencySuffix ? '60px' : '14px',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {currencySuffix && (
                  <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: 600 }}>
                    {currencySuffix.trim()}
                  </span>
                )}
              </div>
            )}

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '10px' }}>
              Average tip: {formatCurrency(avgTip, currency)}
            </p>
          </div>

          {/* ④ Payment Method */}
          <div style={{ marginBottom: '20px', animation: 'slideUp 0.5s ease-out 0.2s both' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Payment method
            </h3>

            {PAYMENT_METHODS.map((pm) => {
              const isSelected = paymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  style={{
                    width: '100%', height: '58px', borderRadius: '14px',
                    display: 'flex', alignItems: 'center',
                    background: isSelected ? 'rgba(0,200,150,0.07)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1.5px solid rgba(0,200,150,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    padding: '0 16px', gap: '14px', marginBottom: '10px',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  <pm.Logo />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#ffffff', flex: 1, textAlign: 'left' }}>{pm.label}</span>
                  {pm.id === 'card' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <VisaLogo />
                      <MastercardLogo />
                      <AmexLogo />
                    </div>
                  )}
                  {isSelected && <CheckCircleGreen />}
                </button>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
              <LockIcon />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>SSL encrypted · Secure checkout</span>
            </div>
          </div>

          {/* Payment error */}
          {paymentError && (
            <div style={{
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '12px', padding: '12px 16px', marginBottom: '12px',
              textAlign: 'center', animation: 'fadeIn 0.3s ease-out',
            }}>
              <p style={{ color: '#ef4444', fontSize: '14px', fontWeight: 600, margin: 0 }}>{paymentError}</p>
            </div>
          )}

          {/* ⑤ Pay button */}
          <button
            onClick={handlePay}
            disabled={payDisabled}
            style={{
              width: '100%', height: '58px', borderRadius: '50px',
              background: payDisabled
                ? 'rgba(255,255,255,0.08)'
                : 'linear-gradient(135deg, #00C896 0%, #00FF66 100%)',
              boxShadow: payDisabled ? 'none' : '0 8px 32px rgba(0,200,150,0.35)',
              border: 'none',
              color: payDisabled ? 'rgba(255,255,255,0.3)' : '#080818',
              fontSize: '18px', fontWeight: 700,
              opacity: payDisabled ? 0.5 : 1,
              cursor: payDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              animation: 'slideUp 0.5s ease-out 0.3s both',
            }}
          >
            {sending ? (
              <>
                <div style={{ width: '20px', height: '20px', border: '2px solid #080818', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                Processing...
              </>
            ) : (
              finalAmount > 0
                ? `${t.payButton} ${formatCurrency(finalAmount, currency)}`
                : t.payButton
            )}
          </button>

          {/* ⑥ Footer */}
          <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '32px', animation: 'slideUp 0.5s ease-out 0.4s both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
              <LockIcon />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Secure payment · Powered by SnapTip</span>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginBottom: '8px' }}>No account needed</p>
            <Link to="/login" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textDecoration: 'underline' }}>
              {t.employeeLogin}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
