import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import OtpInput from '../components/OtpInput';
import api from '../api';

/* ── SVG Icons ── */
const PersonStepIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C896' : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
);
const MailStepIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C896' : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const KeyStepIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C896' : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);
const CameraStepIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#00C896' : 'rgba(255,255,255,0.4)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
  </svg>
);
const CheckDoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#00C896"><circle cx="12" cy="12" r="12" /><path d="m7 12 3.5 3.5L17 9" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const PersonInputIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
);
const MailInputIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4z" /><path d="m22 2-11 11" />
  </svg>
);
const LockInputIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const BackArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

const STEPS = [
  { label: 'Personal Info', Icon: PersonStepIcon },
  { label: 'Mail', Icon: MailStepIcon },
  { label: 'Key', Icon: KeyStepIcon },
  { label: 'Photo', Icon: CameraStepIcon },
];

const pageBg = {
  minHeight: '100dvh',
  background: `radial-gradient(ellipse at bottom right, rgba(100,0,200,0.5) 0%, transparent 60%), #0d0d2b`,
};

const outerCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '24px',
  padding: '28px',
  boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
};

const innerCard = {
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '18px',
  padding: '24px',
  marginTop: '20px',
};

const inputBase = {
  width: '100%',
  height: '52px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  padding: '0 14px 0 40px',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.2s ease',
};

const iconLeft = {
  position: 'absolute',
  left: '14px',
  top: '50%',
  transform: 'translateY(-50%)',
  pointerEvents: 'none',
};

const gradientBtn = {
  width: '100%',
  height: '54px',
  borderRadius: '50px',
  background: 'linear-gradient(135deg, #5b6ef5 0%, #7c3aed 100%)',
  boxShadow: '0 6px 24px rgba(124,58,237,0.5)',
  border: 'none',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

function handleFocus(e) {
  e.target.style.border = '1px solid rgba(91,110,245,0.6)';
  e.target.style.boxShadow = '0 0 0 3px rgba(91,110,245,0.15)';
}
function handleBlur(e) {
  e.target.style.border = '1px solid rgba(255,255,255,0.06)';
  e.target.style.boxShadow = 'none';
}

function StepIndicator({ current }) {
  const progress = (current / 4) * 100;
  return (
    <div>
      {/* Step X of 4 */}
      <p style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '12px' }}>
        Step {current} of 4
      </p>

      {/* Progress bar */}
      <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '16px' }}>
        <div style={{ width: `${progress}%`, height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #00C896, #00a878)', transition: 'width 0.5s ease' }} />
      </div>

      {/* Icons row with connecting lines */}
      <div className="flex items-center justify-between" style={{ position: 'relative' }}>
        {/* Connecting line behind icons */}
        <div style={{ position: 'absolute', top: '22px', left: '36px', right: '36px', height: '1px', background: 'rgba(255,255,255,0.1)', zIndex: 0 }} />

        {STEPS.map(({ label, Icon }, i) => {
          const done = i + 1 < current;
          const active = i + 1 === current;
          return (
            <div key={i} className="flex flex-col items-center" style={{ zIndex: 1 }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: active ? 'rgba(0,200,150,0.2)' : done ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.08)',
                  border: active ? '2px solid #00C896' : done ? '2px solid #00C896' : '2px solid transparent',
                  boxShadow: active ? '0 0 12px rgba(0,200,150,0.5)' : 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                {done ? <CheckDoneIcon /> : <Icon active={active} />}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: active ? 700 : 500,
                color: active ? '#00C896' : done ? '#00C896' : 'rgba(255,255,255,0.4)',
                marginTop: '6px',
                transition: 'all 0.3s ease',
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RegisterMultiStep() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  const clearErr = () => { setError(''); setSuccessMsg(''); };
  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

  const handleStep1 = async () => {
    clearErr();
    if (!firstName.trim()) return setError('First name is required.');
    if (!lastName.trim()) return setError('Last name is required.');
    if (!isValidEmail(email.trim())) return setError('Enter a valid email address.');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: email.trim().toLowerCase() });
      setSuccessMsg(`Code sent to ${email.trim().toLowerCase()}`);
      setStep(2);
    } catch (e) { setError(e.response?.data?.error || 'Failed to send code.'); }
    finally { setLoading(false); }
  };

  const handleStep2 = async () => {
    clearErr();
    if (otp.replace(/\D/g, '').length < 6) return setError('Enter the full 6-digit code.');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), code: otp });
      setStep(3);
    } catch (e) { setError(e.response?.data?.error || 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    clearErr(); setOtp(''); setLoading(true);
    try { await api.post('/auth/send-otp', { email: email.trim().toLowerCase() }); setSuccessMsg('New code sent!'); }
    catch (e) { setError(e.response?.data?.error || 'Failed to resend.'); }
    finally { setLoading(false); }
  };

  const handleStep3 = () => {
    clearErr();
    if (!isValidUsername(username)) return setError('Username: 3-20 chars, letters/numbers/underscores.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');
    setStep(4);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0]; if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    clearErr(); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('firstName', firstName.trim());
      fd.append('lastName', lastName.trim());
      fd.append('email', email.trim().toLowerCase());
      fd.append('username', username);
      fd.append('password', password);
      if (imageFile) fd.append('profileImage', imageFile);
      const { data } = await api.post('/auth/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      localStorage.setItem('snaptip_token', data.token);
      localStorage.setItem('snaptip_user', JSON.stringify(data.employee));
      navigate('/dashboard');
    } catch (e) { setError(e.response?.data?.error || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center" style={{ ...pageBg, padding: '20px' }}>
      <div style={{ width: '90%', maxWidth: '420px' }}>

        {/* Outer card */}
        <div style={outerCard}>
          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Error / success messages */}
          {error && (
            <div style={{ borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
              {error}
            </div>
          )}
          {successMsg && !error && (
            <div style={{ borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: 500, background: 'rgba(0,200,150,0.08)', color: '#00C896', border: '1px solid rgba(0,200,150,0.15)', marginTop: '16px', animation: 'fadeIn 0.3s ease-out' }}>
              {successMsg}
            </div>
          )}

          {/* Inner form card */}
          <div style={innerCard}>

            {/* ── STEP 1: Personal Info ── */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '20px' }}>Create your account</h2>

                {/* First + Last name row */}
                <div className="flex" style={{ gap: '12px', marginBottom: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>First Name</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconLeft}><PersonInputIcon /></div>
                      <input style={inputBase} placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus onFocus={handleFocus} onBlur={handleBlur} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Last Name</label>
                    <div style={{ position: 'relative' }}>
                      <div style={iconLeft}><PersonInputIcon /></div>
                      <input style={inputBase} placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <div style={iconLeft}><MailInputIcon /></div>
                    <input style={inputBase} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStep1()} onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                </div>

                {/* Send button */}
                <button onClick={handleStep1} disabled={loading} style={{ ...gradientBtn, opacity: loading ? 0.7 : 1 }} className="active:scale-95">
                  {loading ? (
                    <><div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Sending...</>
                  ) : (
                    <>Send Verification Code <SendIcon /></>
                  )}
                </button>

                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '12px' }}>Secure & encrypted</p>
              </div>
            )}

            {/* ── STEP 2: OTP Verification ── */}
            {step === 2 && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '8px' }}>Check your email</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: '4px' }}>We sent a 6-digit code to</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#00C896', textAlign: 'center', marginBottom: '4px', wordBreak: 'break-all' }}>{email.trim().toLowerCase()}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginBottom: '20px' }}>Check your inbox and spam folder.</p>

                <OtpInput value={otp} onChange={setOtp} />

                <button onClick={handleStep2} disabled={loading || otp.replace(/\D/g, '').length < 6} style={{ ...gradientBtn, marginTop: '16px', opacity: (loading || otp.replace(/\D/g, '').length < 6) ? 0.5 : 1 }} className="active:scale-95">
                  {loading ? (
                    <><div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Verifying...</>
                  ) : 'Verify Code'}
                </button>

                <div className="flex items-center justify-between" style={{ marginTop: '16px' }}>
                  <button onClick={() => { clearErr(); setStep(1); setOtp(''); }} className="flex items-center" style={{ gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <BackArrow /> Change email
                  </button>
                  <button onClick={handleResend} disabled={loading} style={{ fontSize: '13px', color: '#00C896', background: 'none', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1, transition: 'all 0.2s ease' }}>
                    Resend code
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Credentials ── */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '20px' }}>Create credentials</h2>

                {/* Username */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <div style={iconLeft}><PersonInputIcon /></div>
                    <input style={inputBase} placeholder="john_doe" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))} maxLength={20} autoFocus onFocus={handleFocus} onBlur={handleBlur} />
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px', marginLeft: '2px' }}>3-20 chars: letters, numbers, underscores</p>
                </div>

                {/* Password */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={iconLeft}><LockInputIcon /></div>
                    <input type={showPassword ? 'text' : 'password'} style={{ ...inputBase, paddingRight: '44px' }} placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={handleFocus} onBlur={handleBlur} />
                    <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex' }}>
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <div style={iconLeft}><LockInputIcon /></div>
                    <input type={showConfirm ? 'text' : 'password'} style={{ ...inputBase, paddingRight: '44px' }} placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStep3()} onFocus={handleFocus} onBlur={handleBlur} />
                    <div onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex' }}>
                      {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                    </div>
                  </div>
                </div>

                <button onClick={handleStep3} style={gradientBtn} className="active:scale-95">
                  Create Credentials <ArrowRight />
                </button>

                <button onClick={() => { clearErr(); setStep(2); }} className="flex items-center justify-center" style={{ width: '100%', gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '12px', height: '40px', transition: 'all 0.2s ease' }}>
                  <BackArrow /> Back
                </button>
              </div>
            )}

            {/* ── STEP 4: Photo Upload ── */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '6px' }}>Profile photo</h2>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '20px' }}>Optional — helps customers recognize you.</p>

                {/* Drop zone */}
                <div
                  className="flex flex-col items-center justify-center cursor-pointer active:scale-[0.99]"
                  style={{
                    border: '2px dashed rgba(0,200,150,0.25)',
                    borderRadius: '16px',
                    padding: '28px',
                    background: 'rgba(0,200,150,0.03)',
                    marginBottom: '20px',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #00C896', boxShadow: '0 0 15px rgba(0,200,150,0.2)', marginBottom: '10px' }} />
                  ) : (
                    <div className="flex items-center justify-center" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(0,200,150,0.08)', marginBottom: '10px' }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                    </div>
                  )}
                  <p style={{ fontSize: '14px', color: '#00C896', fontWeight: 600 }}>{imagePreview ? 'Change photo' : 'Upload photo'}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>Drag & drop or click — JPG, PNG, WebP</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />

                <button onClick={handleSubmit} disabled={loading} style={{ ...gradientBtn, opacity: loading ? 0.7 : 1 }} className="active:scale-95">
                  {loading ? (
                    <><div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> Creating Account...</>
                  ) : (
                    <>Complete Registration <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg></>
                  )}
                </button>

                {!imagePreview && (
                  <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '10px', height: '40px', transition: 'all 0.2s ease' }}>
                    Skip for now
                  </button>
                )}

                <button onClick={() => { clearErr(); setStep(3); }} className="flex items-center justify-center" style={{ width: '100%', gap: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px', height: '40px', transition: 'all 0.2s ease' }}>
                  <BackArrow /> Back
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', textDecoration: 'none', transition: 'all 0.2s ease' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}
