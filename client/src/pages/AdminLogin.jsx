import { useState } from 'react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/admin/login', { password });
      saveAdminToken(data.token);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
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
            <div style={{ fontSize: '28px', fontWeight: '800', background: 'linear-gradient(135deg,#4facfe,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '6px' }}>
              ⚡ SnapTip Admin
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
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '18px' }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: '52px', borderRadius: '50px',
                background: loading ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#4facfe,#a855f7)',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(168,85,247,0.4)',
                border: 'none', color: '#fff', fontSize: '16px', fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Authenticating...' : 'Access Admin Panel →'}
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
