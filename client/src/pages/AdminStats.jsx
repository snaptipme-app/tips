import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Inline SVG Icons ── */
const ClickIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c6cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 15l-2 5L9 9l11 4-5 2z" /><path d="M22 22l-5-10" />
  </svg>
);
const EyeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const PulseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const EmptyIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
);

const pageBg = {
  minHeight: '100dvh',
  background: '#0a0a1a',
};

const card = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  padding: '16px',
  boxSizing: 'border-box',
  width: '100%',
};

export default function AdminStats() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      const [summaryRes, eventsRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/all'),
      ]);
      setSummary(summaryRes.data);
      setEvents(eventsRes.data.events || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to load analytics.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to delete all analytics data? This cannot be undone.')) return;
    setResetting(true);
    try {
      const token = localStorage.getItem('snaptip_token');
      const response = await fetch('/api/analytics/reset', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Server error');
      setSummary({ total_events: 0, total_clicks: 0, total_views: 0 });
      setEvents([]);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={pageBg}>
        <div style={{ width: '36px', height: '36px', border: '3px solid #6c6cff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ ...pageBg, padding: '16px' }}>
        <div style={{ ...card, maxWidth: '360px', textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>Access Denied</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const clicks = summary?.total_clicks ?? 0;
  const views = summary?.total_views ?? 0;
  const viewRate = clicks > 0 ? ((views / clicks) * 100).toFixed(1) : '0.0';
  const viewRateNum = parseFloat(viewRate);

  /* Conversion insight */
  let insight = '';
  if (clicks === 0) {
    insight = '📊 No data yet. Share your QR code to start tracking.';
  } else if (viewRateNum < 30) {
    insight = '⚠️ Low engagement. Consider improving the tip page.';
  } else if (viewRateNum >= 70) {
    insight = '🔥 High intent! Consider integrating real payments.';
  } else {
    insight = '📈 Moderate engagement. Keep optimizing your tip page.';
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ ...pageBg, animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 16px 40px', boxSizing: 'border-box' }}>

        {/* ── ① Header ── */}
        <div className="flex items-start justify-between" style={{ marginBottom: '20px', gap: '12px' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.01em' }}>Admin Analytics</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', fontWeight: 500 }}>Fake door payment tracking</p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center active:scale-95"
            style={{
              flexShrink: 0,
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '50px',
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: resetting ? 0.5 : 1,
            }}
          >
            <TrashIcon />
            {resetting ? 'Clearing...' : 'Reset'}
          </button>
        </div>

        {/* ── ② Stats Cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>

          {/* Payment Clicks */}
          <div style={card}>
            <div className="flex items-start justify-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Payment Clicks</span>
              <ClickIcon />
            </div>
            <p style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: '4px' }}>{clicks}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>tourists clicked pay</p>
          </div>

          {/* Message Views */}
          <div style={card}>
            <div className="flex items-start justify-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Message Views</span>
              <EyeIcon />
            </div>
            <p style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: '4px' }}>{views}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>saw maintenance message</p>
          </div>

          {/* View Rate */}
          <div style={card}>
            <div className="flex items-start justify-between" style={{ marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>View Rate</span>
              <PulseIcon />
            </div>
            <p style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, marginBottom: '4px' }}>{viewRate}%</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginBottom: '10px' }}>views / clicks ratio</p>
            {/* Progress bar */}
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(viewRateNum, 100)}%`,
                height: '100%',
                borderRadius: '2px',
                background: viewRateNum >= 70 ? '#00C896' : viewRateNum >= 30 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.6s ease-out',
              }} />
            </div>
          </div>

          {/* Conversion Insight */}
          <div style={{ ...card, background: 'rgba(108,108,255,0.06)', border: '1px solid rgba(108,108,255,0.12)' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: 500, lineHeight: 1.5 }}>{insight}</p>
          </div>
        </div>

        {/* ── ③ Event Log ── */}
        <div style={{ marginBottom: '16px' }}>
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: 0 }}>Event Log</h2>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '50px',
              padding: '2px 10px',
            }}>
              {events.length}
            </span>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center" style={{ ...card, padding: '40px 16px' }}>
              <EmptyIcon />
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginTop: '12px' }}>No events recorded yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.map((ev) => {
                const isClick = ev.event === 'click_payment';
                const dotColor = isClick ? '#6c6cff' : '#00C896';
                const label = isClick ? 'Payment Click' : 'View Message';
                return (
                  <div key={ev.id} style={card}>
                    <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                      {/* Left: dot + label */}
                      <div className="flex items-center" style={{ gap: '8px', minWidth: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      {/* Right: amount + time */}
                      <div className="flex items-center" style={{ gap: '10px', flexShrink: 0 }}>
                        {ev.amount != null && (
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#00C896' }}>${Number(ev.amount).toFixed(2)}</span>
                        )}
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{formatTime(ev.created_at)}</span>
                      </div>
                    </div>
                    {/* Username */}
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500, marginLeft: '16px' }}>
                      @{ev.employee_username || '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
