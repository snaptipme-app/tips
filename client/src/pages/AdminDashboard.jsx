import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getAdminToken, clearAdminToken } from './AdminLogin';

/* ── Colour tokens ── */
const BG = '#080818';
const CARD = '#0f0f2e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';

const COUNTRY_FLAGS = { 'Morocco': '🇲🇦', 'United States': '🇺🇸', 'France': '🇫🇷', 'Spain': '🇪🇸', 'UAE': '🇦🇪' };

function adminApi() {
  return axios.create({
    baseURL: '/api/admin',
    headers: { Authorization: `Bearer ${getAdminToken()}` },
  });
}

function StatusBadge({ status }) {
  const isPaid = status === 'paid';
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 12px', borderRadius: '50px',
      fontSize: '11px', fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: '0.5px',
      background: isPaid ? 'rgba(0,200,150,0.12)' : 'rgba(245,158,11,0.12)',
      color: isPaid ? GREEN : YELLOW,
      border: `1px solid ${isPaid ? 'rgba(0,200,150,0.2)' : 'rgba(245,158,11,0.2)'}`,
    }}>
      {isPaid ? '✓ Paid' : '⏳ Pending'}
    </span>
  );
}

function StatCard({ label, value, color = '#fff', sub }) {
  return (
    <div style={{
      background: CARD, borderRadius: '16px', padding: '20px 24px',
      border: `1px solid ${BORDER}`, flex: 1, minWidth: '160px',
    }}>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '26px', fontWeight: '800', color }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{sub}</p>}
    </div>
  );
}

export default function AdminDashboard({ onLogout }) {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'paid'
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const api = adminApi();
      const [wRes, sRes] = await Promise.all([api.get('/withdrawals'), api.get('/stats')]);
      setWithdrawals(wRes.data.withdrawals || []);
      setStats(sRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        clearAdminToken();
        onLogout();
      } else {
        setError('Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleMarkPaid = async (id) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await adminApi().patch(`/withdrawals/${id}/status`);
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: 'paid' } : w));
      showToast('✅ Marked as paid! Email sent to employee.');
      // refresh stats
      const sRes = await adminApi().get('/stats');
      setStats(sRes.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update.', 'error');
    } finally {
      setMarkingId(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const formatDetails = (raw) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const getDetailCurrency = (w) => {
    try {
      const d = JSON.parse(w.account_details || '{}');
      return d.Currency || 'MAD';
    } catch { return 'MAD'; }
  };

  const getCountryFlag = (w) => {
    try {
      const d = JSON.parse(w.account_details || '{}');
      return COUNTRY_FLAGS[d.Country] || '🇲🇦';
    } catch { return '🇲🇦'; }
  };

  const isInternational = (w) =>
    (w.method || '').toLowerCase().includes('international');

  const filtered = withdrawals
    .filter(w => filter === 'all' ? true : w.status === filter)
    .filter(w => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (w.full_name || '').toLowerCase().includes(q)
        || (w.username || '').toLowerCase().includes(q)
        || (w.method || '').toLowerCase().includes(q);
    });

  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: 'Inter,sans-serif', color: '#fff' }}>
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(0,200,150,0.12)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(0,200,150,0.3)'}`,
          color: toast.type === 'error' ? RED : GREEN,
          padding: '14px 20px', borderRadius: '14px', fontWeight: '600', fontSize: '14px',
          maxWidth: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(180deg, #0d0d30 0%, #080818 100%)',
        padding: '24px 32px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg,#4facfe,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ SnapTip Admin
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Withdrawal Management Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={fetchAll} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: '#fff', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            🔄 Refresh
          </button>
          <button
            onClick={() => { clearAdminToken(); onLogout(); }}
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: RED, borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
          >
            Log Out
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* ── Stats Row ── */}
        {stats && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <StatCard label="Total Employees" value={stats.totalEmployees} color={ACCENT} />
            <StatCard label="Total Tips" value={`$${Number(stats.totalTips).toFixed(2)}`} color={GREEN} sub={`${stats.totalPayments} payments`} />
            <StatCard label="Pending Withdrawals" value={stats.pendingWithdrawals} color={YELLOW} sub={`$${Number(stats.pendingAmount).toFixed(2)} total`} />
            <StatCard label="Paid Withdrawals" value={withdrawals.filter(w => w.status === 'paid').length} color="#a855f7" />
          </div>
        )}

        {/* ── Controls ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', flex: 1 }}>Withdrawal Requests</h2>

          <input
            type="text"
            placeholder="Search by name, username, method..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${BORDER}`, color: '#fff', fontSize: '13px', padding: '0 14px',
              outline: 'none', width: '260px',
            }}
          />

          {['all', 'pending', 'paid'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                height: '38px', padding: '0 16px', borderRadius: '50px', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', border: 'none',
                background: filter === f ? ACCENT : 'rgba(255,255,255,0.06)',
                color: filter === f ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '20px', color: RED }}>
            {error}
          </div>
        )}

        {/* ── Table ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: 'rgba(255,255,255,0.25)', background: CARD, borderRadius: '20px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>No withdrawals found</p>
          </div>
        ) : (
          <div style={{ background: CARD, borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '130px 1fr 160px 90px 70px 90px 160px 120px 100px',
              gap: '0', padding: '14px 20px',
              borderBottom: `1px solid ${BORDER}`,
              fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <span>Date</span>
              <span>Employee</span>
              <span>Method</span>
              <span>Amount</span>
              <span>Fee</span>
              <span>Net Payout</span>
              <span>Details</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {/* Rows */}
            {filtered.map((w, idx) => (
              <div key={w.id}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1fr 160px 90px 70px 90px 160px 120px 100px',
                    gap: '0', padding: '16px 20px', alignItems: 'center',
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{formatDate(w.created_at)}</span>

                  <div>
                    <p style={{ fontWeight: '600', fontSize: '14px' }}>{getCountryFlag(w)} {w.full_name}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>@{w.username}</p>
                    {w.email && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>{w.email}</p>}
                  </div>

                  <span style={{ fontSize: '13px', color: ACCENT, fontWeight: '500' }}>{w.method}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700' }}>{Number(w.amount).toFixed(2)} {getDetailCurrency(w)}</span>
                  <span style={{ fontSize: '13px', color: YELLOW }}>{Number(w.fee || 0).toFixed(2)} {getDetailCurrency(w)}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: GREEN }}>{Number(w.net_amount || w.amount).toFixed(2)} {getDetailCurrency(w)}</span>

                  <button
                    onClick={() => setExpandedDetails(expandedDetails === w.id ? null : w.id)}
                    style={{
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`,
                      color: 'rgba(255,255,255,0.6)', borderRadius: '8px', padding: '5px 10px',
                      fontSize: '11px', cursor: 'pointer', fontWeight: '600',
                    }}
                  >
                    {expandedDetails === w.id ? 'Hide ▲' : 'View ▼'}
                  </button>

                  <StatusBadge status={w.status} />

                  {w.status === 'pending' ? (
                    <button
                      onClick={() => handleMarkPaid(w.id)}
                      disabled={markingId === w.id}
                      style={{
                        background: 'linear-gradient(135deg,#00C896,#00a878)',
                        border: 'none', color: '#fff', borderRadius: '10px',
                        padding: '8px 14px', fontSize: '12px', fontWeight: '700',
                        cursor: markingId === w.id ? 'wait' : 'pointer',
                        opacity: markingId === w.id ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {markingId === w.id ? '...' : '✓ Mark Paid'}
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>—</span>
                  )}
                </div>

                {/* Expanded Details Panel */}
                {expandedDetails === w.id && (() => {
                  const details = formatDetails(w.account_details);
                  const intl = isInternational(w);
                  return (
                  <div style={{
                    padding: '16px 20px 20px',
                    background: 'rgba(108,108,255,0.04)',
                    borderBottom: idx < filtered.length - 1 ? `1px solid ${BORDER}` : 'none',
                    borderLeft: `3px solid ${ACCENT}`,
                  }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>
                      {intl ? 'International Transfer Details' : 'Account Details'}
                    </p>
                    {details && typeof details === 'object' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
                        {Object.entries(details).filter(([k]) => k !== 'Country' && k !== 'Currency').map(([k, v]) => (
                          <div key={k}>
                            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{k}</p>
                            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontFamily: k === 'IBAN' || k === 'SWIFT / BIC Code' || k.includes('RIB') ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>—</p>
                    )}
                    {w.contact_phone && (
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '12px' }}>📞 Contact: <strong style={{ color: '#fff' }}>{w.contact_phone}</strong></p>
                    )}
                    {intl && (
                      <a href="https://wise.com/send" target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px',
                        background: 'rgba(108,108,255,0.1)', border: `1px solid rgba(108,108,255,0.2)`,
                        borderRadius: '10px', padding: '8px 16px', color: ACCENT, fontWeight: '600', fontSize: '13px',
                        textDecoration: 'none', cursor: 'pointer',
                      }}>
                        🌐 Open Wise →
                      </a>
                    )}
                  </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
