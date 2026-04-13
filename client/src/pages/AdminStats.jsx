import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const BarChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
);
const ClickIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 15l-2 5L9 9l11 4-5 2z" /><path d="M22 22l-5-10" />
  </svg>
);
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const TrendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

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
    if (!window.confirm('Are you sure you want to delete all analytics data?')) return;
    setResetting(true);
    try {
      const token = localStorage.getItem('snaptip_token');
      const response = await fetch('/api/analytics/reset', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error resetting analytics');
      }

      setSummary({ total_events: 0, total_clicks: 0, total_views: 0 });
      setEvents([]);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md w-full">
          <p className="text-red-400 font-bold text-lg mb-2">Access Denied</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const conversionRate = summary && summary.total_clicks > 0
    ? ((summary.total_views / summary.total_clicks) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-1">Admin Analytics</h1>
            <p className="text-sm text-slate-500 font-medium">Fake Door payment tracking overview</p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="shrink-0 px-4 py-2 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 hover:text-red-300 transition-all active:scale-95 disabled:opacity-50"
          >
            {resetting ? 'Clearing...' : 'Reset Analytics'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Clicks */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Payment Clicks</span>
              <div className="text-blue-400"><ClickIcon /></div>
            </div>
            <p className="text-3xl font-black text-white">{summary?.total_clicks ?? 0}</p>
          </div>

          {/* Views */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Message Views</span>
              <div className="text-emerald-400"><EyeIcon /></div>
            </div>
            <p className="text-3xl font-black text-white">{summary?.total_views ?? 0}</p>
          </div>

          {/* Conversion */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">View Rate</span>
              <div className="text-amber-400"><TrendIcon /></div>
            </div>
            <p className="text-3xl font-black text-white">{conversionRate}%</p>
            <p className="text-xs text-slate-500 mt-1 truncate">views / clicks</p>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
            <div className="text-indigo-400"><BarChartIcon /></div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Event Log</h2>
            <span className="text-xs text-slate-500 ml-auto font-bold">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 font-semibold text-sm">No analytics events recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Username</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-medium whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="text-slate-600 ml-1.5">
                          {new Date(ev.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-slate-200 truncate max-w-[150px]">
                        {ev.employee_name || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-blue-400 font-medium hidden sm:table-cell truncate max-w-[120px]">
                        @{ev.employee_username || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md inline-block truncate max-w-[120px] ${
                          ev.event === 'click_payment' 
                            ? 'bg-blue-900/40 text-blue-300' 
                            : 'bg-emerald-900/40 text-emerald-300'
                        }`}>
                          {ev.event}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-200 text-right whitespace-nowrap">
                        {ev.amount != null ? `$${Number(ev.amount).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
