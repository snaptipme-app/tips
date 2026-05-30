import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clearAdminToken } from './AdminLogin';

/* ── Design tokens ── */
const BG     = '#080818';
const PANEL  = '#0d0d1f';
const CARD   = '#0f1021';
const BORDER = 'rgba(255,255,255,.07)';
const ACCENT = '#00ffcc';
const GREEN  = '#00C896';
const YELLOW = '#f59e0b';
const RED    = '#ef4444';
const BLUE   = '#5ab2ff';
const MUTED  = 'rgba(255,255,255,.35)';

/* ── Helpers ── */
const COUNTRY_CODES = {
  Morocco:'MA','United States':'US',France:'FR',Spain:'ES',Germany:'DE',
  Italy:'IT',UAE:'AE','United Arab Emirates':'AE',Philippines:'PH',
  Indonesia:'ID',Thailand:'TH','United Kingdom':'GB',Netherlands:'NL',
  Portugal:'PT',Belgium:'BE',Austria:'AT',Ireland:'IE',Poland:'PL',
  Sweden:'SE',Switzerland:'CH',Denmark:'DK',Norway:'NO',Finland:'FI',
  Singapore:'SG',Japan:'JP','Hong Kong':'HK',Malaysia:'MY',Canada:'CA',
  Mexico:'MX',Australia:'AU','New Zealand':'NZ',
};

const fmtDate = d =>
  d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : 'Never';

const fmtMoney = (n, c = 'USD') =>
  `${Number(n || 0).toFixed(2)} ${c}`;

const flagUrl = country => {
  const code = (COUNTRY_CODES[country] || country || '').toLowerCase();
  return code ? `https://flagcdn.com/${code}.svg` : null;
};

/* ── Small UI pieces ── */
const Avatar = ({ user, size = 40 }) => {
  const src = user?.photo_base64 || user?.profile_image_url;
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', flexShrink:0, overflow:'hidden',
      background:'rgba(0,255,204,.1)', border:'1.5px solid rgba(0,255,204,.2)',
      display:'flex', alignItems:'center', justifyContent:'center',
    }}>
      {src
        ? <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : <span style={{fontSize:size*0.38,fontWeight:800,color:ACCENT}}>
            {(user?.full_name||'?')[0].toUpperCase()}
          </span>}
    </div>
  );
};

const TypeBadge = ({ type }) => {
  const map = {
    business: { label:'Business', bg:'rgba(91,178,255,.12)', color:BLUE },
    member:   { label:'Member',   bg:'rgba(0,255,204,.1)',   color:ACCENT },
    individual:{ label:'Individual',bg:'rgba(255,255,255,.07)',color:MUTED },
  };
  const s = map[type] || map.individual;
  return (
    <span style={{
      display:'inline-block', padding:'3px 10px', borderRadius:50,
      fontSize:11, fontWeight:700, background:s.bg, color:s.color, letterSpacing:.3,
    }}>{s.label}</span>
  );
};

const StatusBadge = ({ suspended }) => suspended
  ? <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,background:'rgba(239,68,68,.12)',color:RED}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:RED,flexShrink:0}}/>Suspended
    </span>
  : <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,background:'rgba(0,200,150,.12)',color:GREEN}}>
      <span style={{width:6,height:6,borderRadius:'50%',background:GREEN,flexShrink:0}}/>Active
    </span>;

const CountryCell = ({ country }) => {
  const url = flagUrl(country);
  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:7}}>
      {url && <img src={url} alt={country} width={18} height={13}
        style={{borderRadius:2,objectFit:'cover',boxShadow:'0 0 0 1px rgba(255,255,255,.12)',flexShrink:0}}/>}
      <span style={{fontSize:12,color:'rgba(255,255,255,.7)',fontWeight:500}}>{country||'—'}</span>
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, color }) => (
  <div style={{
    background:CARD, border:`1px solid ${BORDER}`, borderRadius:16,
    padding:'20px 22px', display:'flex', flexDirection:'column', gap:12,
  }}>
    <div style={{
      width:42, height:42, borderRadius:12,
      background:`${color}18`, border:`1px solid ${color}30`,
      display:'flex', alignItems:'center', justifyContent:'center', color,
    }}>{icon}</div>
    <div>
      <p style={{fontSize:11,fontWeight:700,color:MUTED,textTransform:'uppercase',letterSpacing:.5,marginBottom:6}}>{label}</p>
      <p style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:-0.5,lineHeight:1}}>{value}</p>
      {sub && <p style={{fontSize:12,color,marginTop:5,fontWeight:500}}>{sub}</p>}
    </div>
  </div>
);

const ModalOverlay = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.75)',
    display:'flex',alignItems:'center',justifyContent:'center',padding:20,
    backdropFilter:'blur(4px)',
  }}>
    <div onClick={e=>e.stopPropagation()}>{children}</div>
  </div>
);

/* ── Confirmation modals ── */
function ConfirmModal({ modal, onConfirm, onCancel, loading }) {
  const styles = {
    suspend:  { color:YELLOW, icon:'⚠️', action:'Suspend',     bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.25)' },
    reactivate:{ color:GREEN, icon:'✓',  action:'Reactivate',  bg:'rgba(0,200,150,.1)',   border:'rgba(0,200,150,.25)' },
    reset:    { color:BLUE,  icon:'🔑', action:'Reset Password',bg:'rgba(91,178,255,.1)', border:'rgba(91,178,255,.25)'},
    delete:   { color:RED,   icon:'⚠',  action:'Delete',       bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.25)' },
  };
  const s = styles[modal.type] || styles.suspend;
  return (
    <ModalOverlay onClose={onCancel}>
      <div style={{
        background:PANEL, border:`1px solid ${BORDER}`, borderRadius:20,
        padding:32, maxWidth:440, width:'100%', maxHeight:'90vh', overflowY:'auto',
      }}>
        <div style={{
          width:56,height:56,borderRadius:16,background:s.bg,border:`1px solid ${s.border}`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:20,
        }}>{s.icon}</div>
        <h3 style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:8}}>{s.action} User</h3>
        <p style={{fontSize:13,color:MUTED,lineHeight:1.6,marginBottom:16}}>
          {modal.type==='suspend' && <>This will prevent <strong style={{color:'#fff'}}>{modal.user?.full_name}</strong> ({modal.user?.email}) from accessing the platform until reactivated.</>}
          {modal.type==='reactivate' && <>This will restore full platform access for <strong style={{color:'#fff'}}>{modal.user?.full_name}</strong> ({modal.user?.email}).</>}
          {modal.type==='reset' && <>A new password will be generated and sent to <strong style={{color:'#fff'}}>{modal.user?.email}</strong>. The user will be prompted to change it on next login.</>}
          {modal.type==='delete' && <><strong style={{color:RED}}>This action cannot be undone.</strong> All data for <strong style={{color:'#fff'}}>{modal.user?.full_name}</strong> ({modal.user?.email}) will be permanently deleted including balance, transactions, and account.</>}
        </p>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:24}}>
          <button onClick={onCancel} disabled={loading} style={{
            background:'rgba(255,255,255,.06)',color:'rgba(255,255,255,.5)',
            border:`1px solid ${BORDER}`,borderRadius:50,padding:'9px 20px',
            fontSize:13,fontWeight:600,cursor:'pointer',
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            background:modal.type==='delete'?RED:s.bg,
            color:modal.type==='delete'?'#fff':s.color,
            border:`1px solid ${s.border}`,borderRadius:50,padding:'9px 20px',
            fontSize:13,fontWeight:700,cursor:loading?'not-allowed':'pointer',
            opacity:loading?0.6:1,
          }}>{loading?'Processing…':s.action}</button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/* ── User detail drawer ── */
function UserDrawer({ user, onClose, onAction, actionLoading }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const Row = ({ label, value, accent }) => (
    <div style={{
      display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'10px 0',borderBottom:`1px solid ${BORDER}`,
    }}>
      <span style={{fontSize:12,color:MUTED,fontWeight:500}}>{label}</span>
      <span style={{fontSize:13,color:accent||'#fff',fontWeight:600,textAlign:'right',maxWidth:'60%',wordBreak:'break-word'}}>{value||'—'}</span>
    </div>
  );

  const Section = ({ title, children }) => (
    <div style={{marginBottom:24}}>
      <p style={{fontSize:10,fontWeight:700,color:MUTED,textTransform:'uppercase',letterSpacing:.7,marginBottom:12}}>{title}</p>
      {children}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9997,background:'rgba(0,0,0,.6)',backdropFilter:'blur(3px)'}}/>
      {/* Drawer */}
      <div style={{
        position:'fixed',right:0,top:0,bottom:0,zIndex:9998,
        width:'min(480px,100vw)',background:PANEL,
        borderLeft:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',
        overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{
          padding:'24px 24px 20px',borderBottom:`1px solid ${BORDER}`,
          background:CARD,flexShrink:0,
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
            <p style={{fontSize:11,fontWeight:700,color:MUTED,textTransform:'uppercase',letterSpacing:.6}}>User Details</p>
            <button onClick={onClose} style={{
              background:'rgba(255,255,255,.06)',border:`1px solid ${BORDER}`,
              borderRadius:8,width:32,height:32,cursor:'pointer',
              color:'rgba(255,255,255,.5)',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',
            }}>×</button>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <Avatar user={user} size={64}/>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontSize:18,fontWeight:800,color:'#fff',marginBottom:3}}>{user.full_name}</h2>
              <p style={{fontSize:13,color:MUTED,marginBottom:8}}>@{user.username} · {user.email}</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <TypeBadge type={user.account_type}/>
                <StatusBadge suspended={user.is_suspended}/>
                {user.country && (
                  <span style={{
                    display:'inline-flex',alignItems:'center',gap:5,
                    background:'rgba(255,255,255,.06)',border:`1px solid ${BORDER}`,
                    borderRadius:50,padding:'3px 10px',
                  }}>
                    {flagUrl(user.country) && <img src={flagUrl(user.country)} alt="" width={14} height={10} style={{borderRadius:2,objectFit:'cover'}}/>}
                    <span style={{fontSize:11,fontWeight:700,color:MUTED}}>{user.country}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:24}}>
          <Section title="Account Overview">
            <Row label="User ID" value={user.id}/>
            <Row label="Joined" value={fmtDate(user.created_at)}/>
            <Row label="Last Login" value={fmtDate(user.last_login)}/>
            <Row label="Account Type" value={user.account_type||'Member'}/>
            <Row label="Status" value={user.is_suspended?'Suspended':'Active'} accent={user.is_suspended?RED:GREEN}/>
          </Section>

          <Section title="Financial Summary">
            <Row label="Balance" value={fmtMoney(user.balance,user.currency)} accent={GREEN}/>
            <Row label="Currency" value={user.currency}/>
            <Row label="Country" value={user.country}/>
            {user.payout_method && <Row label="Payout Method" value={user.payout_method}/>}
          </Section>

          {user.job_title && (
            <Section title="Professional">
              <Row label="Job Title" value={user.job_title}/>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding:'16px 24px',borderTop:`1px solid ${BORDER}`,
          background:CARD,flexShrink:0,display:'flex',flexDirection:'column',gap:10,
        }}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <button onClick={()=>onAction(user.is_suspended?'reactivate':'suspend',user)} style={{
              background:user.is_suspended?'rgba(0,200,150,.1)':'rgba(245,158,11,.1)',
              color:user.is_suspended?GREEN:YELLOW,
              border:`1px solid ${user.is_suspended?'rgba(0,200,150,.3)':'rgba(245,158,11,.3)'}`,
              borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:700,cursor:'pointer',
            }}>
              {user.is_suspended?'Reactivate':'Suspend'}
            </button>
            <button onClick={()=>onAction('reset',user)} style={{
              background:'rgba(91,178,255,.1)',color:BLUE,
              border:'1px solid rgba(91,178,255,.3)',
              borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:700,cursor:'pointer',
            }}>Reset Password</button>
          </div>
          <button onClick={()=>onAction('delete',user)} style={{
            background:'rgba(239,68,68,.08)',color:RED,
            border:'1px solid rgba(239,68,68,.25)',
            borderRadius:10,padding:'10px 16px',fontSize:13,fontWeight:700,cursor:'pointer',width:'100%',
          }}>Delete User</button>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,.04)',color:MUTED,
            border:`1px solid ${BORDER}`,borderRadius:10,padding:'10px 16px',
            fontSize:13,fontWeight:600,cursor:'pointer',width:'100%',
          }}>Close</button>
        </div>
      </div>
    </>
  );
}

/* ── Icons ── */
const Icons = {
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  active: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>,
  suspended: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  business: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  balance: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  eye: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  chevronDown: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  filter: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>,
};

/* ════════════════════════════════════════════
   Main component
════════════════════════════════════════════ */
export default function AdminUsers({ showToast, onLogout }) {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [detail, setDetail]         = useState(null);
  const [modal, setModal]           = useState(null); // {type, user}
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', { credentials:'include' });
      if (res.status === 401) { clearAdminToken(); onLogout(); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (e) {
      showToast('Failed to load users', 'error');
    }
    setLoading(false);
  }, [onLogout, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* Stats calculated from loaded users */
  const stats = useMemo(() => {
    const total     = users.length;
    const active    = users.filter(u => !u.is_suspended).length;
    const suspended = users.filter(u => u.is_suspended).length;
    const business  = users.filter(u => u.account_type === 'business').length;
    return { total, active, suspended, business };
  }, [users]);

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = users;
    if (filterType === 'members')  list = list.filter(u => u.account_type === 'member' || u.account_type === 'individual');
    if (filterType === 'business') list = list.filter(u => u.account_type === 'business');
    if (filterStatus === 'active')    list = list.filter(u => !u.is_suspended);
    if (filterStatus === 'suspended') list = list.filter(u => u.is_suspended);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.full_name||'').toLowerCase().includes(q) ||
        (u.username||'').toLowerCase().includes(q)  ||
        (u.email||'').toLowerCase().includes(q)     ||
        (u.country||'').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filterType, filterStatus, search]);

  /* Action handler (opens modal) */
  const requestAction = (type, user) => {
    setDetail(null); // close drawer first
    setModal({ type, user });
  };

  /* Confirmed action */
  const doAction = async () => {
    const { type, user } = modal;
    setActionLoading(true);
    try {
      let url, method;
      if (type === 'suspend')    { url = `/api/admin/users/${user.id}/suspend`;        method = 'PATCH'; }
      if (type === 'reactivate') { url = `/api/admin/users/${user.id}/reactivate`;     method = 'PATCH'; }
      if (type === 'delete')     { url = `/api/admin/users/${user.id}`;                method = 'DELETE'; }
      if (type === 'reset')      { url = `/api/admin/users/${user.id}/reset-password`; method = 'POST'; }

      const res  = await fetch(url, { method, credentials:'include', headers:{'Content-Type':'application/json'} });
      const data = await res.json();

      if (res.ok && (data.success || data.message)) {
        const msgs = { suspend:'User suspended.', reactivate:'User reactivated.', delete:'User deleted.', reset:'Password reset. Email sent.' };
        showToast(msgs[type] || 'Done');
        setModal(null);
        if (type !== 'reset') await fetchUsers();
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (e) {
      showToast('Network error: ' + e.message, 'error');
    }
    setActionLoading(false);
  };

  const FILTER_CHIPS = [
    { key:'all',      label:'All' },
    { key:'members',  label:'Members' },
    { key:'business', label:'Businesses' },
  ];

  const STATUS_CHIPS = [
    { key:'all',       label:'All Status' },
    { key:'active',    label:'Active' },
    { key:'suspended', label:'Suspended' },
  ];

  const TH = ({ children, style }) => (
    <th style={{
      textAlign:'left', padding:'12px 16px',
      color:MUTED, fontSize:10, fontWeight:700,
      textTransform:'uppercase', letterSpacing:.6,
      borderBottom:`1px solid ${BORDER}`,
      background:CARD,
      ...style,
    }}>{children}</th>
  );
  const TD = ({ children, style }) => (
    <td style={{
      padding:'14px 16px',
      borderBottom:`1px solid ${BORDER}`,
      verticalAlign:'middle',
      ...style,
    }}>{children}</td>
  );

  return (
    <>
      <style>{`
        .users-table tr:hover td { background: rgba(255,255,255,.015); }
        .chip-btn { transition: all .15s; }
        .chip-btn:hover { opacity: .85; }
        .action-btn { transition: all .15s; }
        .action-btn:hover { opacity: .75; }
        .view-btn:hover { background: rgba(0,255,204,.25) !important; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.1); border-radius:3px; }
      `}</style>

      {/* Modals */}
      {modal && (
        <ConfirmModal
          modal={modal}
          onConfirm={doAction}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}

      {/* Drawer */}
      {detail && (
        <UserDrawer
          user={detail}
          onClose={() => setDetail(null)}
          onAction={requestAction}
          actionLoading={actionLoading}
        />
      )}

      {/* ── Page header ── */}
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:-0.5,marginBottom:6}}>Users Management</h1>
        <p style={{fontSize:13,color:MUTED}}>Manage members, businesses, account status, and user operations.</p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:28}}>
        <StatCard icon={Icons.users}     label="Total Users"      value={stats.total}     sub="All registered users"    color={ACCENT}/>
        <StatCard icon={Icons.active}    label="Active Members"   value={stats.active}    sub="Currently active users"  color={GREEN}/>
        <StatCard icon={Icons.business}  label="Businesses"       value={stats.business}  sub="Business accounts"       color={BLUE}/>
        <StatCard icon={Icons.suspended} label="Suspended"        value={stats.suspended} sub="Suspended accounts"      color={RED}/>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        background:CARD, border:`1px solid ${BORDER}`, borderRadius:16,
        padding:'16px 20px', marginBottom:16,
        display:'flex', flexWrap:'wrap', alignItems:'center', gap:12,
      }}>
        {/* Search */}
        <div style={{position:'relative',flex:'1 1 260px',minWidth:0}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:MUTED,pointerEvents:'none'}}>
            {Icons.search}
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, username, or country..."
            style={{
              width:'100%', height:40, background:'rgba(255,255,255,.04)',
              border:`1px solid ${BORDER}`, borderRadius:10,
              paddingLeft:40, paddingRight:14, color:'#fff', fontSize:13, outline:'none',
            }}
          />
        </div>

        {/* Type filter chips */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {FILTER_CHIPS.map(c => (
            <button key={c.key} className="chip-btn" onClick={() => setFilterType(c.key)} style={{
              padding:'7px 16px', borderRadius:50, border:'none', fontSize:12, fontWeight:700,
              cursor:'pointer',
              background: filterType===c.key ? 'rgba(0,255,204,.15)' : 'rgba(255,255,255,.04)',
              color:       filterType===c.key ? ACCENT                : 'rgba(255,255,255,.4)',
              outline:     filterType===c.key ? `1px solid rgba(0,255,204,.3)` : '1px solid transparent',
            }}>{c.label}</button>
          ))}
        </div>

        {/* Status filter chips */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {STATUS_CHIPS.map(c => (
            <button key={c.key} className="chip-btn" onClick={() => setFilterStatus(c.key)} style={{
              padding:'7px 16px', borderRadius:50, border:'none', fontSize:12, fontWeight:700,
              cursor:'pointer',
              background: filterStatus===c.key ? 'rgba(91,178,255,.15)' : 'rgba(255,255,255,.04)',
              color:       filterStatus===c.key ? BLUE                   : 'rgba(255,255,255,.4)',
              outline:     filterStatus===c.key ? `1px solid rgba(91,178,255,.3)` : '1px solid transparent',
            }}>{c.label}</button>
          ))}
        </div>

        <span style={{marginLeft:'auto',fontSize:12,color:MUTED,fontWeight:500,whiteSpace:'nowrap'}}>
          {filtered.length} user{filtered.length!==1?'s':''}
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:MUTED,fontSize:14}}>Loading users…</div>
      ) : (
        <div style={{
          background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, overflow:'auto',
        }}>
          <table className="users-table" style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <TH>User</TH>
                <TH>Email</TH>
                <TH>Type</TH>
                <TH>Country</TH>
                <TH>Balance</TH>
                <TH>Last Login</TH>
                <TH>Status</TH>
                <TH style={{textAlign:'right'}}>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{textAlign:'center',padding:'48px 0',color:MUTED,fontSize:14}}>
                    No users found
                  </td>
                </tr>
              )}
              {filtered.map(u => (
                <tr key={u.id}>
                  <TD>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <Avatar user={u} size={38}/>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:'#fff',lineHeight:1.3}}>{u.full_name}</div>
                        <div style={{fontSize:11,color:MUTED,marginTop:2}}>@{u.username}</div>
                      </div>
                    </div>
                  </TD>
                  <TD><span style={{fontSize:12,color:'rgba(255,255,255,.6)'}}>{u.email}</span></TD>
                  <TD><TypeBadge type={u.account_type}/></TD>
                  <TD><CountryCell country={u.country}/></TD>
                  <TD>
                    <span style={{fontSize:13,fontWeight:700,color:GREEN}}>
                      {fmtMoney(u.balance, u.currency)}
                    </span>
                  </TD>
                  <TD><span style={{fontSize:11,color:MUTED}}>{fmtDate(u.last_login)}</span></TD>
                  <TD><StatusBadge suspended={u.is_suspended}/></TD>
                  <TD style={{textAlign:'right'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                      <button
                        className="view-btn action-btn"
                        onClick={() => setDetail(u)}
                        style={{
                          display:'inline-flex',alignItems:'center',gap:6,
                          background:'rgba(0,255,204,.1)',color:ACCENT,
                          border:'1px solid rgba(0,255,204,.2)',
                          borderRadius:8,padding:'6px 14px',
                          fontSize:12,fontWeight:700,cursor:'pointer',
                        }}
                      >
                        {Icons.eye} View
                      </button>
                      {/* Quick action button */}
                      {u.is_suspended ? (
                        <button className="action-btn" onClick={()=>requestAction('reactivate',u)} style={{
                          background:'rgba(0,200,150,.1)',color:GREEN,
                          border:'1px solid rgba(0,200,150,.2)',
                          borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer',
                        }}>Activate</button>
                      ) : (
                        <button className="action-btn" onClick={()=>requestAction('suspend',u)} style={{
                          background:'rgba(245,158,11,.1)',color:YELLOW,
                          border:'1px solid rgba(245,158,11,.2)',
                          borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:700,cursor:'pointer',
                        }}>Suspend</button>
                      )}
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer count ── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          marginTop:14,padding:'10px 4px',
          display:'flex',justifyContent:'space-between',alignItems:'center',
        }}>
          <span style={{fontSize:12,color:MUTED}}>
            Showing 1 to {filtered.length} of {filtered.length} user{filtered.length!==1?'s':''}
          </span>
        </div>
      )}
    </>
  );
}
