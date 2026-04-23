import { useState, useEffect } from 'react';
import axios from 'axios';

const ADMIN_TOKEN_KEY = 'snaptip_admin_token';

export function saveAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; }
`;

export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Lockout state
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;
  const getLockout = () => {
    try { return JSON.parse(localStorage.getItem('admin_lockout') || '{}'); } catch { return {}; }
  };
  const [lockout, setLockout] = useState(getLockout);
  const [now, setNow] = useState(Date.now());

  // Tick every second for countdown
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const isLocked = lockout.until && now < lockout.until;
  const remaining = isLocked ? Math.ceil((lockout.until - now) / 1000) : 0;
  const attemptsLeft = MAX_ATTEMPTS - (lockout.count || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/admin/login', { password });
      localStorage.removeItem('admin_lockout');
      saveAdminToken(data.token);
      onSuccess();
    } catch (err) {
      const newCount = (lockout.count || 0) + 1;
      const newLockout = newCount >= MAX_ATTEMPTS
        ? { count: newCount, until: Date.now() + LOCKOUT_MS }
        : { count: newCount };
      localStorage.setItem('admin_lockout', JSON.stringify(newLockout));
      setLockout(newLockout);
      setError(
        newCount >= MAX_ATTEMPTS
          ? `Too many attempts. Locked for 15 minutes.`
          : `${err.response?.data?.error || 'Login failed.'} (${MAX_ATTEMPTS - newCount} attempts remaining)`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, rgba(108,108,255,0.12) 0%, transparent 60%), #080818',
        padding: '20px',
      }}>
        <div style={{
          width: '100%', maxWidth: '380px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px', padding: '40px 32px',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="36" height="36" style={{ borderRadius: '10px' }}>
                <rect width="1024" height="1024" rx="225" fill="#080818" />
                <path d="M620 200 L340 580 H540 L440 840 L720 460 H520 L620 200 Z" fill="#00FF66" stroke="#00FF66" strokeWidth="15" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>SnapTip Admin</span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>Secure admin portal</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Admin Password
            </label>

            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter admin password"
                autoFocus
                required
                style={{
                  width: '100%', height: '52px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: error ? '1.5px solid rgba(239,68,68,0.7)' : '1.5px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '15px', padding: '0 48px 0 16px',
                  outline: 'none', transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center' }}
              >
                {showPass ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              style={{
                width: '100%', height: '52px', borderRadius: '50px',
                background: (loading || isLocked) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4facfe,#a855f7)',
                boxShadow: (loading || isLocked) ? 'none' : '0 8px 24px rgba(168,85,247,0.4)',
                border: 'none', color: '#fff', fontSize: '16px', fontWeight: '700',
                cursor: (loading || isLocked) ? 'not-allowed' : 'pointer', opacity: (loading || isLocked) ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {isLocked ? `Locked — Try again in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}` : loading ? 'Authenticating...' : 'Access Admin Panel →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '24px' }}>
            SnapTip · Admin Portal · Restricted Access
          </p>
        </div>
      </div>
    </>
  );
}
