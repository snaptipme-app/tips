import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

const HomeNavIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'currentColor' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const TipsNavIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'currentColor' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ProfileNavIcon = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'currentColor' : '#64748b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="7" r="4" />
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
  </svg>
);

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchDashboard = async () => {
    setLoadError('');
    setLoading(true);
    try {
      const { data: d } = await api.get('/dashboard');
      setData(d);
    } catch (err) {
      console.error('Dashboard error:', err);
      setLoadError(err.response?.data?.error || err.message || 'Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100dvh', background: '#0a0a1a' }}>
        <div className="w-10 h-10 rounded-full animate-spin border-4 border-[#5577ff] border-t-transparent mb-4" />
        <p className="text-white/50 font-medium text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  const employee = data?.employee ? { ...user, ...data.employee } : user;
  const outletContext = { user: employee, data, fetchDashboard, logout, loadError };

  const navItems = [
    { id: 'home', label: 'Home', path: '/dashboard/home', Icon: HomeNavIcon },
    { id: 'tips', label: 'Tips', path: '/dashboard/tips', Icon: TipsNavIcon },
    { id: 'profile', label: 'Profile', path: '/dashboard/profile', Icon: ProfileNavIcon },
  ];

  return (
    <div className="font-sans selection:bg-blue-600/20" style={{ minHeight: '100dvh', background: '#0a0a1a' }}>
      <main className="w-full max-w-[390px] mx-auto relative flex flex-col" style={{ minHeight: '100dvh', paddingBottom: '80px' }}>
        <Outlet context={outletContext} />
      </main>

      {/* Fixed bottom nav — 72px tall */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center" style={{ height: '72px' }}>
        <div
          className="w-full max-w-[390px] flex items-center justify-around px-4"
          style={{
            height: '72px',
            background: 'rgba(10, 10, 26, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {navItems.map(({ id, label, path, Icon }) => {
            const active = location.pathname.includes(path);
            return (
              <button
                key={id}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-5 py-2 cursor-pointer active:scale-95 touch-manipulation"
                style={{ color: active ? '#5577ff' : '#64748b', transition: 'all 0.2s ease' }}
              >
                <Icon active={active} />
                <span style={{ fontSize: '11px', fontWeight: active ? 700 : 500, opacity: active ? 1 : 0.7, letterSpacing: '0.02em', transition: 'all 0.2s ease' }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
