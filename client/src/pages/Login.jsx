import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PersonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="3" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const BoltIcon = () => (
  <div className="flex items-center justify-center" style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)' }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h7v8l9-12h-7V2z" fill="#00C896" /></svg>
  </div>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const pageBg = {
  minHeight: '100dvh',
  background: `
    radial-gradient(ellipse at bottom right, rgba(100,0,200,0.5) 0%, transparent 60%),
    #0d0d2b
  `,
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
};

const inputWrap = {
  position: 'relative',
  width: '100%',
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

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex items-center justify-center" style={{ ...pageBg, padding: '20px' }}>
      <div style={{ width: '90%', maxWidth: '420px' }}>

        {/* Logo */}
        <div className="flex items-center justify-center" style={{ gap: '10px', marginBottom: '28px' }}>
          <BoltIcon />
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff' }}>SnapTip</span>
        </div>

        {/* Outer card */}
        <div style={outerCard}>
          {/* Inner form card */}
          <div style={innerCard}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>Welcome back</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>Log in to your account.</p>

            {error && (
              <div style={{ borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', marginBottom: '16px', animation: 'fadeIn 0.3s ease-out' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Email or Username</label>
                <div style={inputWrap}>
                  <div style={iconLeft}><PersonIcon /></div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputBase}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(91,110,245,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,110,245,0.15)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>Password</label>
                <div style={inputWrap}>
                  <div style={iconLeft}><LockIcon /></div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ ...inputBase, paddingRight: '44px' }}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(91,110,245,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(91,110,245,0.15)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <div
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </div>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all 0.2s ease' }}>Forgot password?</span>
              </div>

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center cursor-pointer active:scale-95"
                style={{
                  width: '100%',
                  height: '54px',
                  borderRadius: '50px',
                  background: 'linear-gradient(135deg, #5b6ef5 0%, #7c3aed 100%)',
                  boxShadow: '0 6px 24px rgba(124,58,237,0.5)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  gap: '6px',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '18px', height: '18px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    Logging in...
                  </>
                ) : (
                  <>Log In <ArrowRightIcon /></>
                )}
              </button>
            </form>
          </div>

          {/* Don't have an account */}
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Don't have an account? </span>
            <Link to="/register" style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', textDecoration: 'none', transition: 'all 0.2s ease' }}>Sign up</Link>
          </div>
        </div>

        {/* Secure footer */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Secure & encrypted</span>
        </div>
      </div>
    </div>
  );
}
