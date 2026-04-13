import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import SuccessScreen from '../components/SuccessScreen';
import { getTranslation, getLanguageCode, isRTL } from '../i18n/translations';

const TIP_AMOUNTS = [1, 2, 5, 10];

const BoltGradientIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#4facfe" />
      </linearGradient>
    </defs>
    <path d="M13 2L4 14h7v8l9-12h-7V2z" fill="url(#bolt-grad)" />
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

const CheckCircle = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="11" fill="#5577ff" />
    <path d="M6 11l3.5 3.5L16 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function getPhotoSrc(employee) {
  if (!employee) return '';
  if (employee.photo_base64) return employee.photo_base64;
  if (employee.profile_image_url && employee.profile_image_url.startsWith('/')) return `http://localhost:5000${employee.profile_image_url}`;
  if (employee.profile_image_url) return employee.profile_image_url;
  if (employee.photo_url && employee.photo_url.startsWith('/')) return `http://localhost:5000${employee.photo_url}`;
  if (employee.photo_url) return employee.photo_url;
  return '';
}

function AvatarFallback({ name }) {
  const letter = (name || 'U').charAt(0).toUpperCase();
  return (
    <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: 'rgba(85,119,255,0.15)', border: '2px solid rgba(255,255,255,0.8)' }}>
      <span style={{ fontSize: '32px', fontWeight: 700, color: '#5577ff' }}>{letter}</span>
    </div>
  );
}

const PAYMENT_METHODS = [
  { id: 'apple', label: 'Apple Pay', Logo: ApplePayLogo },
  { id: 'google', label: 'Google Pay', Logo: GooglePayLogo },
  { id: 'card', label: 'Pay with Card', Logo: CreditCardIcon },
];

export default function TipPage() {
  const { username } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFakeDoor, setShowFakeDoor] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);

  const t = useMemo(() => getTranslation(), []);
  const rtl = useMemo(() => isRTL(), []);

  // Set RTL and lang on <html> for Arabic
  useEffect(() => {
    const lang = getLanguageCode();
    document.documentElement.lang = lang;
    if (rtl) {
      document.documentElement.dir = 'rtl';
    }
    return () => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    };
  }, [rtl]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/employee/${username}?t=${Date.now()}`);
        setEmployee(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Employee not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

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
    if (amount <= 0 || !paymentMethod) return;

    setSending(true);
    try {
      await api.post('/analytics/track', { event: 'click_payment', username, amount });
    } catch (e) { /* silent */ }

    setSending(false);
    setShowFakeDoor(true);

    try {
      await api.post('/analytics/track', { event: 'view_message', username, amount });
    } catch (e) { /* silent */ }
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
      radial-gradient(ellipse at bottom left, rgba(120,0,180,0.4) 0%, transparent 60%),
      radial-gradient(ellipse at bottom right, rgba(80,0,160,0.3) 0%, transparent 60%),
      #080818
    `,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={pageBg}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #5577ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ ...pageBg, padding: '16px' }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '40px 24px', textAlign: 'center', maxWidth: '360px', width: '100%' }}>
          <div className="flex items-center justify-center" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{t.notFoundTitle}</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>{error}</p>
          <Link to="/login" style={{ fontSize: '13px', color: '#5577ff', fontWeight: 600, textDecoration: 'underline' }}>
            Employee? Login here →
          </Link>
        </div>
      </div>
    );
  }

  const finalAmount = getFinalAmount();
  const photoSrc = getPhotoSrc(employee);
  const payDisabled = sending || finalAmount <= 0;

  return (
    <div className="flex flex-col items-center" style={pageBg} dir={rtl ? 'rtl' : 'ltr'}>
      {showSuccess && (
        <SuccessScreen amount={tipAmount} employeeName={employee.full_name} onClose={handleCloseSuccess} />
      )}

      {/* Fake door modal */}
      {showFakeDoor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(8,8,24,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', padding: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px 24px', maxWidth: '360px', width: '100%', position: 'relative', animation: 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>
            <button onClick={() => setShowFakeDoor(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '12px', textAlign: 'center' }}>{t.maintenanceTitle}</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '24px', textAlign: 'center', lineHeight: '1.6' }}>
              {t.maintenanceMessage}
            </p>
            <button onClick={() => setShowFakeDoor(false)} style={{ width: '100%', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }} className="active:scale-95">
              {t.maintenanceBack}
            </button>
          </div>
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '390px', padding: '0 20px' }}>

        {/* ① Top bar — centered bolt + SnapTip */}
        <div className="flex items-center justify-center" style={{ gap: '8px', paddingTop: '20px', marginBottom: '16px' }}>
          <BoltGradientIcon />
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>SnapTip</span>
        </div>

        {/* ② Employee card */}
        <div className="flex flex-col items-center" style={{
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '20px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          {/* Avatar 90px */}
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 0 20px rgba(255,255,255,0.3)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {photoSrc ? (
              <img src={photoSrc} alt={employee.full_name} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback name={employee.full_name} />
            )}
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', marginTop: '14px', textAlign: 'center' }}>{employee.full_name}</h1>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>@{employee.username}</p>
          <p style={{ fontSize: '14px', color: '#9ca3af', marginTop: '6px' }}>{t.tagline}</p>
        </div>

        {/* ③ Tip Amount Selection */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Tip Amount Selection</h3>

          {/* 2×2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            {TIP_AMOUNTS.map((amt) => {
              const isSelected = selectedAmount === amt && !isCustom;
              return (
                <button
                  key={amt}
                  onClick={() => handleSelectAmount(amt)}
                  className="active:scale-95 cursor-pointer"
                  style={{
                    height: '52px',
                    borderRadius: '14px',
                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    background: isSelected
                      ? 'linear-gradient(135deg, #4facfe 0%, #a855f7 100%)'
                      : 'rgba(255,255,255,0.08)',
                    boxShadow: isSelected ? '0 4px 20px rgba(79,172,254,0.4)' : 'none',
                    color: '#ffffff',
                    fontSize: '17px',
                    fontWeight: 700,
                    transition: 'all 0.2s ease',
                  }}
                >
                  ${amt}
                </button>
              );
            })}
          </div>

          {/* Custom Amount button */}
          <button
            onClick={handleCustom}
            className="active:scale-95 cursor-pointer"
            style={{
              width: '100%',
              height: '52px',
              borderRadius: '14px',
              border: isCustom ? 'none' : '1px solid rgba(255,255,255,0.06)',
              background: isCustom
                ? 'linear-gradient(135deg, #4facfe 0%, #a855f7 100%)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: isCustom ? '0 4px 20px rgba(79,172,254,0.4)' : 'none',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 700,
              transition: 'all 0.2s ease',
            }}
          >
            {t.customAmount}
          </button>

          {/* Custom input — inline expand */}
          {isCustom && (
            <div style={{ marginTop: '10px', position: 'relative', animation: 'fadeIn 0.3s ease-out' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: '18px', fontWeight: 700 }}>$</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                placeholder={t.enterAmount}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontSize: '17px',
                  fontWeight: 700,
                  textAlign: 'center',
                  paddingLeft: '36px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
              />
            </div>
          )}
        </div>

        {/* ④ Choose a Payment Method */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Choose a Payment Method</h3>

          {PAYMENT_METHODS.map((pm) => {
            const isSelected = paymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className="flex items-center w-full cursor-pointer active:scale-[0.98]"
                style={{
                  height: '58px',
                  borderRadius: '14px',
                  background: isSelected ? 'rgba(85,119,255,0.1)' : 'rgba(255,255,255,0.06)',
                  border: isSelected ? '1px solid #5577ff' : '1px solid rgba(255,255,255,0.05)',
                  padding: '0 16px',
                  gap: '14px',
                  marginBottom: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <pm.Logo />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', flex: 1, textAlign: 'left' }}>{pm.label}</span>
                {pm.id === 'card' && (
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <VisaLogo />
                    <MastercardLogo />
                    <AmexLogo />
                    {isSelected && <CheckCircle />}
                  </div>
                )}
                {pm.id !== 'card' && isSelected && <CheckCircle />}
              </button>
            );
          })}
        </div>

        {/* ⑤ Pay button */}
        <button
          onClick={handlePay}
          disabled={payDisabled}
          className="cursor-pointer active:scale-95"
          style={{
            width: '100%',
            height: '56px',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #4facfe 0%, #a855f7 100%)',
            boxShadow: payDisabled ? 'none' : '0 8px 32px rgba(168,85,247,0.5)',
            border: 'none',
            color: '#ffffff',
            fontSize: '18px',
            fontWeight: 700,
            opacity: payDisabled ? 0.4 : 1,
            cursor: payDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {sending ? (
            <>
              <div style={{ width: '20px', height: '20px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              {t.payButton}...
            </>
          ) : (
            `${t.payButton} $${finalAmount > 0 ? finalAmount : '0'}`
          )}
        </button>

        {/* ⑥ Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', paddingBottom: '24px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>🔒 {t.securePayment}</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: '#6b7280', textDecoration: 'underline', transition: 'all 0.2s ease' }}>
            {t.employeeLogin}
          </Link>
        </div>
      </div>
    </div>
  );
}
