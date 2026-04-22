import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getAdminToken, clearAdminToken } from './AdminLogin';

/* ── Tokens ── */
const BG = '#080818';
const CARD = '#0f0f2e';
const CARD2 = '#12122e';
const BORDER = 'rgba(255,255,255,0.06)';
const ACCENT = '#6c6cff';
const GREEN = '#00C896';
const YELLOW = '#f59e0b';
const RED = '#ef4444';
const PURPLE = '#a855f7';

const FLAGS = { Morocco:'🇲🇦', 'United States':'🇺🇸', France:'🇫🇷', Spain:'🇪🇸', UAE:'🇦🇪' };

function api() {
  return axios.create({ baseURL:'/api/admin', headers:{ Authorization:`Bearer ${getAdminToken()}` }});
}

/* ── Formatters ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '—';
const fmtMoney = (n,c='MAD') => `${Number(n||0).toFixed(2)} ${c}`;
const flag = c => FLAGS[c]||'🌍';

/* ── Small components ── */
const Badge = ({text,bg,color,border}) => (
  <span style={{display:'inline-block',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,background:bg,color,border:`1px solid ${border||bg}`,textTransform:'uppercase',letterSpacing:.4}}>{text}</span>
);
const StatusBadge = ({status}) => {
  const map = {paid:{t:'✓ Paid',bg:'rgba(0,200,150,0.12)',c:GREEN},pending:{t:'⏳ Pending',bg:'rgba(245,158,11,0.12)',c:YELLOW},rejected:{t:'✕ Rejected',bg:'rgba(239,68,68,0.12)',c:RED}};
  const s = map[status]||map.pending;
  return <Badge text={s.t} bg={s.bg} color={s.c}/>;
};
const Btn = ({children,onClick,bg=ACCENT,color='#fff',small,disabled,...rest}) => (
  <button onClick={onClick} disabled={disabled} style={{background:bg,color,border:'none',borderRadius:50,padding:small?'6px 14px':'10px 20px',fontSize:small?12:14,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,transition:'all .2s',...rest.style}} {...rest}>{children}</button>
);
const Input = ({value,onChange,placeholder,...rest}) => (
  <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:'rgba(255,255,255,0.06)',border:`1px solid ${BORDER}`,borderRadius:12,height:42,padding:'0 14px',color:'#fff',fontSize:14,outline:'none',flex:1,minWidth:0,...rest.style}}/>
);

const NAV = [
  {key:'overview',icon:'📊',label:'Overview'},
  {key:'users',icon:'👥',label:'Users'},
  {key:'withdrawals',icon:'💸',label:'Withdrawals'},
  {key:'businesses',icon:'🏢',label:'Businesses'},
  {key:'transactions',icon:'💳',label:'Transactions'},
  {key:'analytics',icon:'📈',label:'Analytics'},
];

/* ── Toast ── */
function Toast({toast}) {
  if (!toast) return null;
  return <div style={{position:'fixed',top:20,right:20,zIndex:9999,background:toast.type==='error'?RED:GREEN,color:'#fff',padding:'12px 24px',borderRadius:14,fontWeight:600,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,.4)',animation:'slideIn .3s ease-out'}}>{toast.msg}</div>;
}

/* ── Confirm Dialog ── */
function Confirm({msg,onConfirm,onCancel}) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:20,padding:32,maxWidth:400,width:'100%'}}>
        <p style={{color:'#fff',fontSize:16,fontWeight:600,marginBottom:24,lineHeight:1.5}}>{msg}</p>
        <div style={{display:'flex',gap:12,justifyContent:'flex-end'}}>
          <Btn onClick={onCancel} bg='rgba(255,255,255,0.08)' color='rgba(255,255,255,0.5)'>Cancel</Btn>
          <Btn onClick={onConfirm} bg={RED}>Confirm</Btn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
   ══════════════════════════════════════════════════════ */
export default function AdminDashboard({ onLogout }) {
  const [section, setSection] = useState('overview');
  const [sideOpen, setSideOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg,type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  const handleLogout = () => { clearAdminToken(); onLogout(); };

  const switchSection = s => { setSection(s); setSideOpen(false); };

  // Pending count for badge
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    api().get('/stats').then(r => setPendingCount(r.data.pendingWithdrawals || 0)).catch(()=>{});
  }, [section]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Inter',sans-serif; background:${BG}; }
        @keyframes slideIn { from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1} }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
        @media(max-width:900px) { .admin-sidebar { display:none !important; } .admin-main { margin-left:0 !important; } }
        @media(min-width:901px) { .admin-mobile-bar { display:none !important; } }
        table { width:100%; border-collapse:collapse; }
        th { text-align:left; padding:10px 12px; color:rgba(255,255,255,.35); font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; border-bottom:1px solid ${BORDER}; }
        td { padding:10px 12px; color:rgba(255,255,255,.7); font-size:13px; border-bottom:1px solid ${BORDER}; }
        tr:hover td { background:rgba(255,255,255,.02); }
      `}</style>
      <Toast toast={toast}/>

      {/* ── Mobile top bar ── */}
      <div className="admin-mobile-bar" style={{position:'fixed',top:0,left:0,right:0,height:56,background:CARD,borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',zIndex:100}}>
        <button onClick={()=>setSideOpen(!sideOpen)} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer'}}>☰</button>
        <span style={{fontWeight:800,color:'#fff',fontSize:16}}>⚡ SnapTip Admin</span>
        <button onClick={handleLogout} style={{background:'none',border:'none',color:RED,fontSize:13,fontWeight:600,cursor:'pointer'}}>Logout</button>
      </div>

      {/* ── Mobile nav overlay ── */}
      {sideOpen && (
        <div onClick={()=>setSideOpen(false)} style={{position:'fixed',inset:0,zIndex:199,background:'rgba(0,0,0,.6)'}}>
          <div onClick={e=>e.stopPropagation()} style={{width:260,height:'100%',background:CARD,padding:20,borderRight:`1px solid ${BORDER}`}}>
            <div style={{marginBottom:24,paddingTop:8}}>
              <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>⚡ SnapTip</div>
              <p style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4}}>Admin Panel</p>
            </div>
            {NAV.map(n=>(
              <button key={n.key} onClick={()=>switchSection(n.key)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 14px',border:'none',borderRadius:12,background:section===n.key?'rgba(108,108,255,.12)':'transparent',color:section===n.key?ACCENT:'rgba(255,255,255,.5)',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:4,textAlign:'left'}}>
                <span style={{fontSize:18}}>{n.icon}</span>{n.label}
                {n.key==='withdrawals'&&pendingCount>0&&<span style={{marginLeft:'auto',background:YELLOW,color:'#000',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:50}}>{pendingCount}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ── */}
      <div className="admin-sidebar" style={{position:'fixed',left:0,top:0,bottom:0,width:220,background:CARD,borderRight:`1px solid ${BORDER}`,padding:'24px 16px',display:'flex',flexDirection:'column',zIndex:50}}>
        <div style={{marginBottom:32}}>
          <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>⚡ SnapTip</div>
          <p style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4}}>Admin Panel</p>
        </div>
        <div style={{flex:1}}>
          {NAV.map(n=>(
            <button key={n.key} onClick={()=>setSection(n.key)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',border:'none',borderRadius:12,background:section===n.key?'rgba(108,108,255,.12)':'transparent',color:section===n.key?ACCENT:'rgba(255,255,255,.5)',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:4,textAlign:'left',transition:'all .15s'}}>
              <span style={{fontSize:17}}>{n.icon}</span>{n.label}
              {n.key==='withdrawals'&&pendingCount>0&&<span style={{marginLeft:'auto',background:YELLOW,color:'#000',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:50}}>{pendingCount}</span>}
            </button>
          ))}
        </div>
        <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,.25)',marginBottom:8}}>Logged in as <strong style={{color:'#fff'}}>Admin</strong></p>
          <Btn onClick={handleLogout} bg='rgba(239,68,68,.1)' color={RED} small style={{width:'100%'}}>Logout</Btn>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="admin-main" style={{marginLeft:220,minHeight:'100dvh',padding:'24px 28px',paddingTop:24}}>
        <div style={{paddingTop:0}} className="admin-mobile-pad">
          {section==='overview' && <OverviewSection showToast={showToast} onLogout={onLogout}/>}
          {section==='users' && <UsersSection showToast={showToast} onLogout={onLogout}/>}
          {section==='withdrawals' && <WithdrawalsSection showToast={showToast} onLogout={onLogout} onUpdate={()=>api().get('/stats').then(r=>setPendingCount(r.data.pendingWithdrawals||0))}/>}
          {section==='businesses' && <BusinessesSection showToast={showToast} onLogout={onLogout}/>}
          {section==='transactions' && <TransactionsSection showToast={showToast} onLogout={onLogout}/>}
          {section==='analytics' && <AnalyticsSection showToast={showToast}/>}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 1 — OVERVIEW
   ══════════════════════════════════════════════════════ */
function OverviewSection({showToast,onLogout}) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    api().get('/stats').then(r=>setData(r.data)).catch(e=>{
      if(e.response?.status===401){clearAdminToken();onLogout();}
      else showToast('Failed to load stats','error');
    }).finally(()=>setLoading(false));
  },[]);

  if (loading) return <div style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</div>;
  if (!data) return null;

  const statCards = [
    {label:'Total Users',value:data.totalEmployees,color:ACCENT,icon:'👥'},
    {label:'Total Tips',value:fmtMoney(data.totalTips),color:GREEN,icon:'💚'},
    {label:'My Commission (10%)',value:fmtMoney(data.commission),color:PURPLE,icon:'💎'},
    {label:'Pending Withdrawals',value:data.pendingWithdrawals,color:YELLOW,sub:fmtMoney(data.pendingAmount),icon:'⏳'},
  ];

  const maxReg = Math.max(...(data.growth||[]).map(g=>g.count),1);
  const maxTip = Math.max(...(data.tipsGrowth||[]).map(g=>g.count),1);

  return (
    <>
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:24}}>Dashboard Overview</h1>

      {/* Stats cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:28}}>
        {statCards.map((s,i)=>(
          <div key={i} style={{background:CARD,borderRadius:16,padding:'20px 22px',border:`1px solid ${BORDER}`}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <p style={{fontSize:11,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.5,fontWeight:600}}>{s.label}</p>
            </div>
            <p style={{fontSize:24,fontWeight:800,color:s.color}}>{s.value}</p>
            {s.sub&&<p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:4}}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Growth charts */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14,marginBottom:28}}>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>📅 New Users (Last 7 Days)</p>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100}}>
            {(data.growth||[]).map((g,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,fontWeight:700,color:ACCENT}}>{g.count}</span>
                <div style={{width:'100%',background:ACCENT,borderRadius:6,height:`${Math.max((g.count/maxReg)*80,4)}px`,transition:'height .3s'}}/>
                <span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>{g.day?.slice(5)}</span>
              </div>
            ))}
            {(!data.growth||data.growth.length===0)&&<p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No data yet</p>}
          </div>
        </div>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>💰 Tips (Last 7 Days)</p>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100}}>
            {(data.tipsGrowth||[]).map((g,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,fontWeight:700,color:GREEN}}>{g.count}</span>
                <div style={{width:'100%',background:GREEN,borderRadius:6,height:`${Math.max((g.count/maxTip)*80,4)}px`,transition:'height .3s'}}/>
                <span style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>{g.day?.slice(5)}</span>
              </div>
            ))}
            {(!data.tipsGrowth||data.tipsGrowth.length===0)&&<p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No data yet</p>}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:14}}>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:12}}>Recent Payments</p>
          {data.recentPayments?.length ? (
            <table><thead><tr><th>Employee</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>{data.recentPayments.map((p,i)=>(
                <tr key={i}><td style={{fontWeight:600,color:'#fff'}}>{p.full_name||p.username}</td><td>{fmtMoney(p.amount,p.currency)}</td><td>{fmtDate(p.created_at)}</td></tr>
              ))}</tbody>
            </table>
          ) : <p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No payments yet</p>}
        </div>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:12}}>Recent Withdrawals</p>
          {data.recentWithdrawals?.length ? (
            <table><thead><tr><th>Employee</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{data.recentWithdrawals.map((w,i)=>(
                <tr key={i}><td style={{fontWeight:600,color:'#fff'}}>{w.full_name||w.username}</td><td>{fmtMoney(w.amount,w.currency)}</td><td><StatusBadge status={w.status}/></td></tr>
              ))}</tbody>
            </table>
          ) : <p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No withdrawals yet</p>}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 2 — USERS
   ══════════════════════════════════════════════════════ */
function UsersSection({showToast,onLogout}) {
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [filterType,setFilterType] = useState('all');
  const [confirm,setConfirm] = useState(null);
  const [actionLoading,setActionLoading] = useState(null);

  const fetchUsers = useCallback(()=>{
    setLoading(true);
    api().get('/users').then(r=>setUsers(r.data.users||[])).catch(e=>{
      if(e.response?.status===401){clearAdminToken();onLogout();}
    }).finally(()=>setLoading(false));
  },[onLogout]);
  useEffect(()=>{fetchUsers();},[fetchUsers]);

  const filtered = useMemo(()=>{
    let list = users;
    if(filterType==='members') list=list.filter(u=>u.account_type==='member'||u.account_type==='individual');
    if(filterType==='business') list=list.filter(u=>u.account_type==='business');
    if(filterType==='suspended') list=list.filter(u=>u.is_suspended);
    if(search) {
      const q=search.toLowerCase();
      list=list.filter(u=>(u.full_name||'').toLowerCase().includes(q)||(u.username||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)||(u.country||'').toLowerCase().includes(q));
    }
    return list;
  },[users,filterType,search]);

  const doAction = async (action,userId,msg) => {
    setActionLoading(userId);
    try {
      if(action==='suspend') await api().patch(`/users/${userId}/suspend`);
      else if(action==='reactivate') await api().patch(`/users/${userId}/reactivate`);
      else if(action==='delete') await api().delete(`/users/${userId}`);
      else if(action==='reset') { const r = await api().post(`/users/${userId}/reset-password`); showToast(r.data.message); setActionLoading(null); fetchUsers(); return; }
      showToast(msg);
      fetchUsers();
    } catch(e){ showToast(e.response?.data?.error||'Action failed','error'); }
    setActionLoading(null);
    setConfirm(null);
  };

  const typeBadge = t => {
    if(t==='business') return <Badge text="Business" bg="rgba(0,200,150,.12)" color={GREEN}/>;
    if(t==='member') return <Badge text="Member" bg="rgba(108,108,255,.12)" color={ACCENT}/>;
    return <Badge text={t||'Individual'} bg="rgba(255,255,255,.06)" color="rgba(255,255,255,.4)"/>;
  };

  const filters = ['all','members','business','suspended'];

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Users Management</h1>

      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <Input value={search} onChange={setSearch} placeholder="Search by name, email, country..." style={{maxWidth:320}}/>
        <div style={{display:'flex',gap:6}}>
          {filters.map(f=>(
            <button key={f} onClick={()=>setFilterType(f)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:filterType===f?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:filterType===f?ACCENT:'rgba(255,255,255,.4)',transition:'all .15s',textTransform:'capitalize'}}>{f}</button>
          ))}
        </div>
        <span style={{fontSize:12,color:'rgba(255,255,255,.3)',marginLeft:'auto'}}>{filtered.length} user{filtered.length!==1?'s':''}</span>
      </div>

      {loading ? <p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p> : (
        <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <table>
            <thead><tr><th>User</th><th>Email</th><th>Type</th><th>Country</th><th>Balance</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(108,108,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>
                        {u.photo_base64||u.profile_image_url
                          ? <img src={u.photo_base64||u.profile_image_url} style={{width:34,height:34,objectFit:'cover'}} alt=""/>
                          : <span style={{fontWeight:700,color:ACCENT,fontSize:13}}>{(u.full_name||'?')[0].toUpperCase()}</span>}
                      </div>
                      <div>
                        <div style={{fontWeight:700,color:'#fff',fontSize:13}}>{u.full_name}</div>
                        <div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{fontSize:12}}>{u.email}</td>
                  <td>{typeBadge(u.account_type)}</td>
                  <td><span style={{marginRight:4}}>{flag(u.country)}</span>{u.country}</td>
                  <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(u.balance,u.currency)}</td>
                  <td style={{fontSize:12}}>{fmtDate(u.created_at)}</td>
                  <td>{u.is_suspended ? <Badge text="Suspended" bg="rgba(239,68,68,.12)" color={RED}/> : <Badge text="Active" bg="rgba(0,200,150,.12)" color={GREEN}/>}</td>
                  <td>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {u.is_suspended
                        ? <Btn small bg='rgba(0,200,150,.1)' color={GREEN} disabled={actionLoading===u.id} onClick={()=>doAction('reactivate',u.id,'User reactivated')}>Activate</Btn>
                        : <Btn small bg='rgba(245,158,11,.1)' color={YELLOW} disabled={actionLoading===u.id} onClick={()=>setConfirm({msg:`Suspend ${u.full_name}?`,onConfirm:()=>doAction('suspend',u.id,'User suspended')})}>Suspend</Btn>
                      }
                      <Btn small bg='rgba(108,108,255,.1)' color={ACCENT} disabled={actionLoading===u.id} onClick={()=>setConfirm({msg:`Reset password for ${u.full_name}? A temporary password will be emailed.`,onConfirm:()=>doAction('reset',u.id,'')})}>Reset PW</Btn>
                      <Btn small bg='rgba(239,68,68,.1)' color={RED} disabled={actionLoading===u.id} onClick={()=>setConfirm({msg:`DELETE ${u.full_name} and ALL their data? This cannot be undone.`,onConfirm:()=>doAction('delete',u.id,'User deleted')})}>Delete</Btn>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No users found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 3 — WITHDRAWALS
   ══════════════════════════════════════════════════════ */
function WithdrawalsSection({showToast,onLogout,onUpdate}) {
  const [withdrawals,setWithdrawals] = useState([]);
  const [loading,setLoading] = useState(true);
  const [filter,setFilter] = useState('all');
  const [search,setSearch] = useState('');
  const [actionId,setActionId] = useState(null);
  const [confirm,setConfirm] = useState(null);

  const fetchW = useCallback(()=>{
    setLoading(true);
    api().get('/withdrawals').then(r=>setWithdrawals(r.data.withdrawals||[])).catch(e=>{
      if(e.response?.status===401){clearAdminToken();onLogout();}
    }).finally(()=>setLoading(false));
  },[onLogout]);
  useEffect(()=>{fetchW();},[fetchW]);

  const handlePaid = async id => {
    setActionId(id);
    try {
      await api().patch(`/withdrawals/${id}/status`);
      showToast('✅ Marked as paid! Email sent.');
      fetchW(); onUpdate();
    } catch(e){ showToast(e.response?.data?.error||'Failed','error'); }
    setActionId(null);
  };
  const handleReject = async id => {
    setActionId(id);
    try {
      await api().patch(`/withdrawals/${id}/reject`);
      showToast('Withdrawal rejected. Balance refunded.');
      fetchW(); onUpdate();
    } catch(e){ showToast(e.response?.data?.error||'Failed','error'); }
    setActionId(null);
    setConfirm(null);
  };

  const parseDetails = d => {
    if(!d) return '';
    try { const p=JSON.parse(d); return Object.entries(p).map(([k,v])=>`${k}: ${v}`).join(' · '); } catch(_){ return d; }
  };

  const filtered = useMemo(()=>{
    let list = withdrawals;
    if(filter!=='all') list=list.filter(w=>w.status===filter);
    if(search){ const q=search.toLowerCase(); list=list.filter(w=>(w.full_name||'').toLowerCase().includes(q)); }
    return list;
  },[withdrawals,filter,search]);

  const filters = ['all','pending','paid','rejected'];

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Withdrawals</h1>
      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <Input value={search} onChange={setSearch} placeholder="Search by employee name..." style={{maxWidth:280}}/>
        <div style={{display:'flex',gap:6}}>
          {filters.map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:filter===f?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:filter===f?ACCENT:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{f}</button>)}
        </div>
      </div>

      {loading ? <p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p> : (
        <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <table>
            <thead><tr><th>Employee</th><th>Amount</th><th>Fee</th><th>Net</th><th>Method</th><th>Account Details</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(w=>(
                <tr key={w.id}>
                  <td><span style={{marginRight:4}}>{flag(w.country)}</span><span style={{fontWeight:600,color:'#fff'}}>{w.full_name}</span></td>
                  <td style={{fontWeight:700,color:'#fff'}}>{fmtMoney(w.amount,w.currency)}</td>
                  <td style={{color:YELLOW}}>{fmtMoney(w.fee,w.currency)}</td>
                  <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(w.net_amount,w.currency)}</td>
                  <td>{w.method}</td>
                  <td>
                    <div style={{maxWidth:220,fontSize:12,color:'rgba(255,255,255,.5)',wordBreak:'break-all'}}>
                      {parseDetails(w.account_details)}
                      {w.account_details && <button onClick={()=>{navigator.clipboard.writeText(parseDetails(w.account_details));showToast('Copied!');}} style={{marginLeft:6,background:'none',border:'none',color:ACCENT,fontSize:11,cursor:'pointer',fontWeight:600}}>Copy</button>}
                    </div>
                  </td>
                  <td><StatusBadge status={w.status}/></td>
                  <td style={{fontSize:12}}>{fmtDate(w.created_at)}</td>
                  <td>
                    {w.status==='pending' && (
                      <div style={{display:'flex',gap:6}}>
                        <Btn small disabled={actionId===w.id} onClick={()=>handlePaid(w.id)}>✓ Paid</Btn>
                        <Btn small bg='rgba(239,68,68,.1)' color={RED} disabled={actionId===w.id} onClick={()=>setConfirm({msg:`Reject withdrawal #${w.id} for ${w.full_name}? Their balance will be refunded.`,onConfirm:()=>handleReject(w.id)})}>Reject</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No withdrawals found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 4 — BUSINESSES
   ══════════════════════════════════════════════════════ */
function BusinessesSection({showToast,onLogout}) {
  const [businesses,setBusinesses] = useState([]);
  const [loading,setLoading] = useState(true);
  const [confirm,setConfirm] = useState(null);

  const fetchB = useCallback(()=>{
    setLoading(true);
    api().get('/businesses').then(r=>setBusinesses(r.data.businesses||[])).catch(e=>{
      if(e.response?.status===401){clearAdminToken();onLogout();}
    }).finally(()=>setLoading(false));
  },[onLogout]);
  useEffect(()=>{fetchB();},[fetchB]);

  const handleDelete = async id => {
    try {
      await api().delete(`/businesses/${id}`);
      showToast('Business deleted.');
      fetchB();
    } catch(e){ showToast(e.response?.data?.error||'Failed','error'); }
    setConfirm(null);
  };

  return (
    <>
      {confirm && <Confirm msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={()=>setConfirm(null)}/>}
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Businesses</h1>
      {loading ? <p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p> : (
        <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <table>
            <thead><tr><th>Business</th><th>Owner</th><th>Type</th><th>Country</th><th>Team</th><th>Total Tips</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {businesses.map(b=>(
                <tr key={b.id}>
                  <td style={{fontWeight:700,color:'#fff'}}>{b.business_name}</td>
                  <td><div style={{fontSize:13}}>{b.owner_name}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>{b.owner_email}</div></td>
                  <td><Badge text={b.business_type} bg='rgba(108,108,255,.12)' color={ACCENT}/></td>
                  <td>{flag(b.country)} {b.country}</td>
                  <td style={{fontWeight:700,color:'#fff'}}>{b.team_count}</td>
                  <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(b.total_tips)}</td>
                  <td style={{fontSize:12}}>{fmtDate(b.created_at)}</td>
                  <td><Btn small bg='rgba(239,68,68,.1)' color={RED} onClick={()=>setConfirm({msg:`Delete "${b.business_name}" and remove all team member links? (Employee accounts are NOT deleted)`,onConfirm:()=>handleDelete(b.id)})}>Delete</Btn></td>
                </tr>
              ))}
              {businesses.length===0 && <tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No businesses yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 5 — TRANSACTIONS
   ══════════════════════════════════════════════════════ */
function TransactionsSection({showToast,onLogout}) {
  const [data,setData] = useState({transactions:[],totalVolume:0,totalCommission:0,totalCount:0});
  const [loading,setLoading] = useState(true);
  const [range,setRange] = useState('all');

  const fetchT = useCallback(()=>{
    setLoading(true);
    api().get('/transactions',{params:{range}}).then(r=>setData(r.data)).catch(e=>{
      if(e.response?.status===401){clearAdminToken();onLogout();}
    }).finally(()=>setLoading(false));
  },[range,onLogout]);
  useEffect(()=>{fetchT();},[fetchT]);

  const exportCSV = () => {
    const header = 'Date,Employee,Username,Amount,Currency,Commission,Method\n';
    const rows = data.transactions.map(t=>
      `"${fmtDate(t.created_at)}","${t.full_name}","${t.username}",${Number(t.amount).toFixed(2)},${t.currency||'MAD'},${(Number(t.amount)*0.1).toFixed(2)},${t.payment_method}`
    ).join('\n');
    const blob = new Blob([header+rows],{type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`snaptip_transactions_${range}.csv`; a.click();
    showToast('CSV exported!');
  };

  const ranges = ['today','week','month','all'];

  return (
    <>
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Transactions</h1>

      {/* Summary bar */}
      <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
        <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>TOTAL VOLUME</p>
          <p style={{fontSize:20,fontWeight:800,color:GREEN}}>{fmtMoney(data.totalVolume)}</p>
        </div>
        <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>MY COMMISSION (10%)</p>
          <p style={{fontSize:20,fontWeight:800,color:PURPLE}}>{fmtMoney(data.totalCommission)}</p>
        </div>
        <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>TRANSACTIONS</p>
          <p style={{fontSize:20,fontWeight:800,color:'#fff'}}>{data.totalCount}</p>
        </div>
      </div>

      <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',gap:6}}>
          {ranges.map(r=><button key={r} onClick={()=>setRange(r)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:range===r?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:range===r?ACCENT:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{r==='all'?'All Time':r==='week'?'This Week':r==='month'?'This Month':'Today'}</button>)}
        </div>
        <Btn small onClick={exportCSV} bg='rgba(0,200,150,.12)' color={GREEN} style={{marginLeft:'auto'}}>📥 Export CSV</Btn>
      </div>

      {loading ? <p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p> : (
        <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
          <table>
            <thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Commission</th><th>Method</th></tr></thead>
            <tbody>
              {data.transactions.map((t,i)=>(
                <tr key={i}>
                  <td style={{fontSize:12}}>{fmtDate(t.created_at)}</td>
                  <td><span style={{fontWeight:600,color:'#fff'}}>{t.full_name}</span> <span style={{color:'rgba(255,255,255,.3)'}}>@{t.username}</span></td>
                  <td style={{fontWeight:700,color:'#fff'}}>{fmtMoney(t.amount,t.currency)}</td>
                  <td style={{color:PURPLE,fontWeight:600}}>{fmtMoney(Number(t.amount)*0.1,t.currency)}</td>
                  <td><Badge text={t.payment_method||'mock'} bg='rgba(255,255,255,.06)' color='rgba(255,255,255,.5)'/></td>
                </tr>
              ))}
              {data.transactions.length===0 && <tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No transactions for this period</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION 6 — ANALYTICS
   ══════════════════════════════════════════════════════ */
function AnalyticsSection({showToast}) {
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  useEffect(()=>{
    api().get('/analytics').then(r=>setData(r.data)).catch(()=>showToast('Failed to load analytics','error')).finally(()=>setLoading(false));
  },[]);

  if(loading) return <p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>;
  if(!data) return null;

  const maxTip = Math.max(...(data.topEmployees||[]).map(e=>e.total_tips),1);
  const maxHour = Math.max(...(data.peakHours||[]).map(h=>h.count),1);

  return (
    <>
      <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:24}}>Analytics</h1>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:28}}>
        <div style={{background:CARD,borderRadius:16,padding:'18px 22px',border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:6}}>AVG TIP AMOUNT</p>
          <p style={{fontSize:22,fontWeight:800,color:GREEN}}>{fmtMoney(data.avgTip)}</p>
        </div>
        {(data.methodBreakdown||[]).map((m,i)=>(
          <div key={i} style={{background:CARD,borderRadius:16,padding:'18px 22px',border:`1px solid ${BORDER}`}}>
            <p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:6}}>{(m.payment_method||'mock').toUpperCase()}</p>
            <p style={{fontSize:22,fontWeight:800,color:ACCENT}}>{m.count}</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:4}}>{fmtMoney(m.total)}</p>
          </div>
        ))}
      </div>

      {/* Top Employees Leaderboard */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:14,marginBottom:28}}>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>🏆 Top 10 Employees by Tips</p>
          {(data.topEmployees||[]).map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
              <span style={{width:24,fontSize:13,fontWeight:700,color:i<3?[YELLOW,'#C0C0C0','#CD7F32'][i]:'rgba(255,255,255,.3)'}}>{i+1}</span>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,color:'#fff',fontSize:13}}>{e.full_name}</span>
                  <span style={{fontWeight:700,color:GREEN,fontSize:13}}>{fmtMoney(e.total_tips,e.currency)}</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,.04)',borderRadius:3}}>
                  <div style={{height:6,borderRadius:3,background:`linear-gradient(90deg,${ACCENT},${GREEN})`,width:`${(e.total_tips/maxTip)*100}%`,transition:'width .4s'}}/>
                </div>
              </div>
            </div>
          ))}
          {(!data.topEmployees||data.topEmployees.length===0)&&<p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No data</p>}
        </div>

        {/* Peak Hours */}
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>⏰ Peak Hours</p>
          <div style={{display:'flex',alignItems:'flex-end',gap:3,height:120}}>
            {Array.from({length:24},(_,h)=>{
              const found = (data.peakHours||[]).find(p=>p.hour===h);
              const count = found?.count||0;
              return (
                <div key={h} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                  <div style={{width:'100%',background:count>0?ACCENT:'rgba(255,255,255,.04)',borderRadius:3,height:`${Math.max((count/maxHour)*90,2)}px`,transition:'height .3s'}}/>
                  {h%4===0&&<span style={{fontSize:8,color:'rgba(255,255,255,.25)'}}>{h}h</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Countries */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:14}}>🌍 Top Countries by Users</p>
          {(data.topCountriesByUsers||[]).map((c,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${BORDER}`}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:14}}>{flag(c.country)} {c.country}</span>
              <span style={{color:ACCENT,fontWeight:700,fontSize:14}}>{c.count}</span>
            </div>
          ))}
        </div>
        <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
          <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:14}}>💰 Top Countries by Tips</p>
          {(data.topCountriesByTips||[]).map((c,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${BORDER}`}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:14}}>{flag(c.country)} {c.country}</span>
              <span style={{color:GREEN,fontWeight:700,fontSize:14}}>{fmtMoney(c.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
