import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../api';

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const BankIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6l7-3 7 3" /><path d="M4 10v11" /><path d="M20 10v11" /><path d="M8 14v3" /><path d="M12 14v3" /><path d="M16 14v3" />
  </svg>
);

const WITHDRAWAL_METHODS = [
  { id: 'cih', name: 'CIH Bank', logo: 'https://i.postimg.cc/G2C3Vsdc/unnamed.png', field: 'rib', placeholder: 'Enter your RIB number', label: 'RIB Number' },
  { id: 'cashplus', name: 'Cash Plus', logo: 'https://i.postimg.cc/6qH98jRw/unnamed-(1).png', field: 'phone', placeholder: 'Enter your phone number', label: 'Phone Number' },
  { id: 'wafacash', name: 'Wafa Cash', logo: 'https://i.postimg.cc/nczFyxbY/unnamed-(2).png', field: 'phone', placeholder: 'Enter your phone number', label: 'Phone Number' },
  { id: 'other', name: 'Other Bank', logo: null, field: 'rib_bank', placeholder: 'Enter your RIB number', label: 'RIB Number' },
];

function getPhotoSrc(employee) {
  if (!employee) return '';
  if (employee.photo_base64) return employee.photo_base64;
  if (employee.profile_image_url && employee.profile_image_url.startsWith('/')) return `http://localhost:5000${employee.profile_image_url}`;
  if (employee.profile_image_url) return employee.profile_image_url;
  if (employee.photo_url && employee.photo_url.startsWith('/')) return `http://localhost:5000${employee.photo_url}`;
  if (employee.photo_url) return employee.photo_url;
  return '';
}

export default function Profile() {
  const { user, data, logout, fetchDashboard } = useOutletContext();

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null);
  const [accountDetails, setAccountDetails] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const balance = Number.isFinite(Number(user?.balance)) ? Number(user?.balance) : 0;
  const recentWithdrawals = data?.recent_withdrawals || [];
  const selectedMethod = WITHDRAWAL_METHODS.find(m => m.id === method);

  const handleStep2Next = () => {
    setError('');
    if (!accountDetails.trim()) return setError(`${selectedMethod.label} is required.`);
    if (method === 'other' && !bankName.trim()) return setError('Bank name is required.');
    setStep(3);
  };

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount.');
    if (amt > balance) return setError('Amount exceeds your balance.');

    setSubmitting(true);
    try {
      const details = method === 'other' ? `${bankName.trim()} — ${accountDetails.trim()}` : accountDetails.trim();
      await api.post('/withdrawals/request', {
        amount: amt,
        method: selectedMethod.name,
        account_details: details,
      });
      setSuccessMsg('Withdrawal requested successfully!');
      setStep(1);
      setMethod(null);
      setAccountDetails('');
      setBankName('');
      setAmount('');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit withdrawal.');
    } finally {
      setSubmitting(false);
    }
  };

  const photoSrc = getPhotoSrc(user);
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  const glassCardStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '18px',
  };

  const inputStyle = {
    width: '100%',
    borderRadius: '12px',
    padding: '13px 14px',
    fontSize: '14px',
    color: '#ffffff',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    outline: 'none',
    transition: 'all 0.2s ease',
  };

  return (
    <div className="animate-fadeIn w-full" style={{ padding: '24px 16px 16px' }}>
      {/* Title */}
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '24px' }}>
        Account Settings
      </h1>

      {/* ── User Info Card — horizontal: avatar left, name right ── */}
      <div className="flex items-center" style={{ ...glassCardStyle, padding: '16px 20px', marginBottom: '24px', gap: '14px' }}>
        <div className="overflow-hidden flex-shrink-0" style={{
          width: '80px', height: '80px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.12)',
          background: 'rgba(255,255,255,0.06)',
        }}>
          {photoSrc ? (
            <img src={photoSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full font-bold" style={{ color: '#5577ff', fontSize: '28px' }}>{initials}</span>
          )}
        </div>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name}</h2>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{user?.username}</p>
        </div>
      </div>

      {/* ── Withdraw Funds ── */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>Withdraw Funds</h3>

        {successMsg && (
          <div className="flex items-center justify-between" style={{ borderRadius: '12px', padding: '12px', background: 'rgba(0,200,150,0.08)', color: '#00C896', border: '1px solid rgba(0,200,150,0.15)', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', color: '#00C896', padding: '2px 4px', fontSize: '14px', transition: 'all 0.2s ease' }}>✕</button>
          </div>
        )}

        {/* Step 1: 2×2 grid of withdrawal methods */}
        {step === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {WITHDRAWAL_METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMethod(m.id); setStep(2); setError(''); }}
                className="flex flex-col items-center justify-center cursor-pointer active:scale-95"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px',
                  padding: '20px',
                  gap: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                {m.logo ? (
                  <div className="flex items-center justify-center overflow-hidden flex-shrink-0" style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: '#ffffff', padding: '4px',
                  }}>
                    <img src={m.logo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '10px' }} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-shrink-0" style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.08)', color: '#ffffff',
                  }}>
                    <BankIcon />
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                  {m.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Account details inline */}
        {step === 2 && selectedMethod && (
          <div className="animate-fadeIn" style={{ width: '100%' }}>
            <button onClick={() => { setStep(1); setError(''); }} className="flex items-center active:scale-95" style={{ gap: '4px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', marginBottom: '16px', background: 'none', border: 'none', transition: 'all 0.2s ease' }}>
              <ArrowLeftIcon /> Back
            </button>
            <div style={{ ...glassCardStyle, padding: '14px 16px', marginBottom: '14px', borderRadius: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selected Method</label>
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '14px' }}>{selectedMethod.name}</span>
            </div>
            {method === 'other' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Bank Name <span style={{ color: '#f87171' }}>*</span></label>
                <input style={inputStyle} placeholder="e.g. Attijariwafa Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
            )}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>{selectedMethod.label} <span style={{ color: '#f87171' }}>*</span></label>
              <input style={inputStyle} placeholder={selectedMethod.placeholder} value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStep2Next()} />
            </div>
            {error && <p style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', marginBottom: '12px' }}>{error}</p>}
            <button onClick={handleStep2Next} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#ffffff', background: '#5577ff', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }} className="active:scale-95">
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Amount confirmation inline */}
        {step === 3 && selectedMethod && (
          <div className="animate-fadeIn" style={{ width: '100%' }}>
            <button onClick={() => { setStep(2); setError(''); }} className="flex items-center active:scale-95" style={{ gap: '4px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', marginBottom: '16px', background: 'none', border: 'none', transition: 'all 0.2s ease' }}>
              <ArrowLeftIcon /> Back
            </button>
            <div className="flex items-center justify-between" style={{ ...glassCardStyle, padding: '12px 16px', marginBottom: '16px', borderRadius: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#5577ff' }}>Available Balance</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>${balance.toFixed(2)}</span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Withdrawal Amount ($)</label>
              <input type="number" style={{ ...inputStyle, fontSize: '16px', fontWeight: 700 }} placeholder="0.00" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            </div>
            {error && <p style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', marginBottom: '12px' }}>{error}</p>}
            <button onClick={handleSubmit} disabled={submitting} className="active:scale-95" style={{ width: '100%', padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#ffffff', background: '#5577ff', border: 'none', cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease' }}>
              {submitting ? (
                <span className="flex items-center justify-center" style={{ gap: '8px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Processing...
                </span>
              ) : 'Confirm Withdrawal'}
            </button>
          </div>
        )}
      </div>

      {/* ── Withdrawal History ── */}
      {recentWithdrawals.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '14px' }}>Withdrawal History</h3>
          <div className="flex flex-col" style={{ gap: '8px' }}>
            {recentWithdrawals.map((w) => {
              const wAmount = Number.isFinite(Number(w.amount)) ? Number(w.amount) : 0;
              const isPending = w.status === 'pending';
              const isCompleted = w.status === 'completed';
              return (
                <div key={w.id} className="flex items-center justify-between" style={{
                  ...glassCardStyle,
                  padding: '14px 16px',
                  borderRadius: '14px',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>${wAmount.toFixed(2)}</p>
                    <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: '2px' }}>{w.method || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      ...(isPending
                        ? { color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }
                        : isCompleted
                          ? { color: '#00C896', background: 'rgba(0, 200, 150, 0.1)' }
                          : { color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)' }
                      ),
                    }}>
                      {w.status}
                    </span>
                    <p style={{ fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
                      {new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Log Out Button — full width, 52px, gradient red, rounded-full ── */}
      <button
        onClick={logout}
        className="active:scale-95 cursor-pointer"
        style={{
          width: '100%',
          height: '52px',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: 700,
          transition: 'all 0.2s ease',
        }}
      >
        Log Out
      </button>
    </div>
  );
}
