import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getAdminToken, clearAdminToken } from './AdminLogin';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BG='#080818',CARD='#0d1117',BORDER='rgba(255,255,255,0.06)',ACCENT='#6c6cff',GREEN='#00C896',YELLOW='#f59e0b',RED='#ef4444',PURPLE='#a855f7';
const COUNTRY_CODES={Morocco:'MA','United States':'US',France:'FR',Spain:'ES',UAE:'AE'};
const CURRENCY_COLORS={MAD:'#f59e0b',EUR:'#6c6cff',USD:'#00C896',AED:'#a855f7',GBP:'#06b6d4'};
function getCurrencyColor(c){return CURRENCY_COLORS[c]||'rgba(255,255,255,.5)'}
function api(){return axios.create({baseURL:'/api/admin',headers:{Authorization:`Bearer ${getAdminToken()}`}})}
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'Never';
const fmtMoney=(n,c='USD')=>`${Number(n||0).toFixed(2)} ${c}`;
const fmtAmount=(n,c)=>{if(!c)return Number(n||0).toFixed(2);const sym={USD:'$',EUR:'€',GBP:'£'};return sym[c]?`${sym[c]}${Number(n||0).toFixed(2)}`:`${Number(n||0).toFixed(2)} ${c}`;};
const CURRENCIES=[{code:'USD',flag:'🇺🇸',sym:'$',pre:true},{code:'EUR',flag:'🇪🇺',sym:'€',pre:true},{code:'MAD',flag:'🇲🇦',sym:'MAD',pre:false},{code:'AED',flag:'🇦🇪',sym:'AED',pre:false}];
const fmtCur=(n,code)=>{const c=CURRENCIES.find(x=>x.code===code)||CURRENCIES[0];const v=Number(n||0).toFixed(2);return c.pre?`${c.sym}${v}`:`${v} ${c.sym}`;};
const CountryBadge=({country})=>{const code=COUNTRY_CODES[country]||'??';return<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(255,255,255,.06)',borderRadius:6,padding:'2px 7px',fontSize:11,fontWeight:700,color:'rgba(255,255,255,.5)',letterSpacing:.3}}>{code}</span>;}
const CurrencyPill=({currency,amount})=>{const color=getCurrencyColor(currency);return<span style={{display:'inline-flex',alignItems:'center',gap:4,background:`${color}18`,border:`1px solid ${color}40`,borderRadius:50,padding:'3px 10px',fontSize:12,fontWeight:700,color,whiteSpace:'nowrap'}}>{fmtAmount(amount,currency)}</span>}

const I={
  overview:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  users:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  withdrawals:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  businesses:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  transactions:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  analytics:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  check:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>,
  x:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  ban:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  trash:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>,
  lock:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  arrowDown:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  arrowUp:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
};
const NAV=[
  {key:'overview',icon:I.overview,label:'Overview'},
  {key:'users',icon:I.users,label:'Users'},
  {key:'withdrawals',icon:I.withdrawals,label:'Withdrawals'},
  {key:'businesses',icon:I.businesses,label:'Businesses'},
  {key:'transactions',icon:I.transactions,label:'Transactions'},
  {key:'analytics',icon:I.analytics,label:'Analytics'},
];

const Badge=({text,bg,color})=><span style={{display:'inline-block',padding:'3px 10px',borderRadius:50,fontSize:11,fontWeight:700,background:bg,color,textTransform:'uppercase',letterSpacing:.4}}>{text}</span>;
const StatusBadge=({status})=>{const m={paid:{t:'Paid',bg:'rgba(0,200,150,.12)',c:GREEN},pending:{t:'Pending',bg:'rgba(245,158,11,.12)',c:YELLOW},rejected:{t:'Rejected',bg:'rgba(239,68,68,.12)',c:RED}};const s=m[status]||m.pending;return<Badge text={s.t} bg={s.bg} color={s.c}/>};
const Btn=({children,onClick,bg=ACCENT,color='#fff',small,disabled,...r})=><button onClick={(e)=>{e.stopPropagation();if(onClick)onClick(e)}} disabled={disabled} style={{background:bg,color,border:'none',borderRadius:50,padding:small?'6px 14px':'10px 20px',fontSize:small?12:14,fontWeight:700,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'all .2s',display:'inline-flex',alignItems:'center',gap:6,position:'relative',zIndex:1,...(r.style||{})}}>{children}</button>;
const Input=({value,onChange,placeholder,...r})=><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{background:'rgba(255,255,255,.06)',border:`1px solid ${BORDER}`,borderRadius:12,height:42,padding:'0 14px',color:'#fff',fontSize:14,outline:'none',flex:1,minWidth:0,...r.style}}/>;
function Toast({toast}){if(!toast)return null;return<div style={{position:'fixed',top:20,right:20,zIndex:9999,background:toast.type==='error'?RED:GREEN,color:'#fff',padding:'12px 24px',borderRadius:14,fontWeight:600,fontSize:14,boxShadow:'0 8px 32px rgba(0,0,0,.4)',animation:'slideIn .3s ease-out'}}>{toast.msg}</div>}
function Confirm({msg,onConfirm,onCancel,children}){return<div style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:20,padding:32,maxWidth:420,width:'100%'}}><p style={{color:'#fff',fontSize:16,fontWeight:600,marginBottom:16,lineHeight:1.5}}>{msg}</p>{children}<div style={{display:'flex',gap:12,justifyContent:'flex-end',marginTop:20}}><Btn onClick={onCancel} bg='rgba(255,255,255,.08)' color='rgba(255,255,255,.5)'>Cancel</Btn><Btn onClick={onConfirm} bg={RED}>Confirm</Btn></div></div></div>}

export default function AdminDashboard({onLogout}){
  const[section,setSection]=useState('overview');
  const[sideOpen,setSideOpen]=useState(false);
  const[toast,setToast]=useState(null);
  const showToast=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)};
  const handleLogout=()=>{clearAdminToken();onLogout()};
  const switchSection=s=>{setSection(s);setSideOpen(false)};
  const[pendingCount,setPendingCount]=useState(0);
  useEffect(()=>{api().get('/stats').then(r=>setPendingCount(r.data.pendingWithdrawals||0)).catch(()=>{});},[section]);

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;background:${BG}}
      @keyframes slideIn{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}
      ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px}
      @media(max-width:900px){.admin-sidebar{display:none!important}.admin-topbar{display:none!important}.admin-main{margin-left:0!important;padding-top:70px!important}}
      @media(min-width:901px){.admin-mobile-bar{display:none!important}}
      .overview-grid{grid-template-columns:repeat(4,1fr)}
      .overview-main{grid-template-columns:30% 1fr}
      .overview-bottom{grid-template-columns:1fr 1fr}
      @media(max-width:1200px){.overview-grid{grid-template-columns:repeat(2,1fr)!important}.overview-main{grid-template-columns:1fr!important}}
      @media(max-width:700px){.overview-grid{grid-template-columns:1fr!important}.overview-bottom{grid-template-columns:1fr!important}}
      table{width:100%;border-collapse:collapse}
      th{text-align:left;padding:10px 12px;color:rgba(255,255,255,.35);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid ${BORDER}}
      td{padding:10px 12px;color:rgba(255,255,255,.7);font-size:13px;border-bottom:1px solid ${BORDER}}
      tr:hover td{background:rgba(255,255,255,.02)}
      .admin-sidebar button:hover{background:rgba(108,108,255,0.08)!important}
    `}</style>
    <Toast toast={toast}/>

    {/* Fixed top header (desktop) */}
    <div className="admin-topbar" style={{position:'fixed',top:0,left:240,right:0,height:64,background:'#0a0a1a',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',zIndex:40}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{color:'rgba(255,255,255,.3)',fontSize:13}}>Admin</span>
        <span style={{color:'rgba(255,255,255,.2)',fontSize:13,margin:'0 4px'}}>/</span>
        <span style={{color:'#fff',fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{section}</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{color:'rgba(255,255,255,.5)',fontSize:13}}>Logged in as Admin</span>
        <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(108,108,255,.2)',border:`2px solid ${ACCENT}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:ACCENT,flexShrink:0}}>AD</div>
      </div>
    </div>

    {/* Mobile top bar */}
    <div className="admin-mobile-bar" style={{position:'fixed',top:0,left:0,right:0,height:56,background:CARD,borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',zIndex:100}}>
      <button onClick={()=>setSideOpen(!sideOpen)} style={{background:'none',border:'none',color:'#fff',fontSize:22,cursor:'pointer'}}>&#9776;</button>
      <span style={{fontWeight:800,color:'#fff',fontSize:16}}>SnapTip Admin</span>
      <button onClick={handleLogout} style={{background:'none',border:'none',color:RED,fontSize:13,fontWeight:600,cursor:'pointer'}}>Logout</button>
    </div>

    {/* Mobile nav overlay */}
    {sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:'fixed',inset:0,zIndex:199,background:'rgba(0,0,0,.6)'}}>
      <div onClick={e=>e.stopPropagation()} style={{width:260,height:'100%',background:CARD,padding:20,borderRight:`1px solid ${BORDER}`}}>
        <div style={{marginBottom:24,paddingTop:8}}><div style={{fontSize:20,fontWeight:800,color:'#fff'}}>SnapTip</div><p style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:4}}>Admin Panel</p></div>
        {NAV.map(n=><button key={n.key} onClick={()=>switchSection(n.key)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'12px 14px',border:'none',borderRadius:12,background:section===n.key?'rgba(108,108,255,.12)':'transparent',color:section===n.key?ACCENT:'rgba(255,255,255,.5)',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:4,textAlign:'left'}}>
          <span style={{display:'flex'}}>{n.icon}</span>{n.label}
          {n.key==='withdrawals'&&pendingCount>0&&<span style={{marginLeft:'auto',background:YELLOW,color:'#000',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:50}}>{pendingCount}</span>}
        </button>)}
      </div>
    </div>}

    {/* Desktop sidebar */}
    <div className="admin-sidebar" style={{position:'fixed',left:0,top:0,bottom:0,width:240,background:BG,borderRight:`1px solid ${BORDER}`,padding:'24px 16px',display:'flex',flexDirection:'column',zIndex:50}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:32}}>
        <div style={{width:36,height:36,borderRadius:9,background:GREEN,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#080818"><polygon points="13 2 4.5 13.5 11 13.5 11 22 19.5 10.5 13 10.5 13 2"/></svg>
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:'#fff'}}>SnapTip</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.3)',marginTop:1}}>Admin Panel</div>
        </div>
      </div>
      <div style={{flex:1}}>
        {NAV.map(n=><button key={n.key} onClick={()=>setSection(n.key)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',border:'none',borderLeft:section===n.key?`3px solid ${ACCENT}`:'3px solid transparent',borderRadius:10,background:section===n.key?'rgba(108,108,255,.15)':'transparent',color:section===n.key?'#fff':'rgba(255,255,255,.45)',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:4,textAlign:'left',transition:'all .15s',paddingLeft:section===n.key?11:14}}>
          <span style={{display:'flex'}}>{n.icon}</span>{n.label}
          {n.key==='withdrawals'&&pendingCount>0&&<span style={{marginLeft:'auto',background:YELLOW,color:'#000',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:50}}>{pendingCount}</span>}
        </button>)}
      </div>
      <div style={{borderTop:`1px solid ${BORDER}`,paddingTop:16}}>
        <Btn onClick={handleLogout} bg='rgba(239,68,68,.1)' color={RED} small style={{width:'100%'}}>Logout</Btn>
      </div>
    </div>

    {/* Main content */}
    <div className="admin-main" style={{marginLeft:240,minHeight:'100dvh',padding:'88px 28px 24px'}}>
      {section==='overview'&&<OverviewSection showToast={showToast} onLogout={onLogout} onNavigate={switchSection}/>}
      {section==='users'&&<UsersSection showToast={showToast} onLogout={onLogout}/>}
      {section==='withdrawals'&&<WithdrawalsSection showToast={showToast} onLogout={onLogout} onUpdate={()=>api().get('/stats').then(r=>setPendingCount(r.data.pendingWithdrawals||0))}/>}
      {section==='businesses'&&<BusinessesSection showToast={showToast} onLogout={onLogout}/>}
      {section==='transactions'&&<TransactionsSection showToast={showToast} onLogout={onLogout}/>}
      {section==='analytics'&&<AnalyticsSection showToast={showToast}/>}
    </div>
  </>);
}

/* ═══ OVERVIEW ═══ */
function OverviewSection({showToast,onLogout,onNavigate}){
  const[stats,setStats]=useState(null);
  const[weekData,setWeekData]=useState(null);
  const[monthData,setMonthData]=useState(null);
  const[withdrawalsData,setWithdrawalsData]=useState(null);
  const[loading,setLoading]=useState(true);
  const[selectedCurrency,setSelectedCurrency]=useState('USD');

  useEffect(()=>{
    Promise.all([
      api().get('/stats'),
      api().get('/transactions',{params:{range:'week'}}),
      api().get('/transactions',{params:{range:'month'}}),
      api().get('/withdrawals'),
    ])
      .then(([s,w,m,wd])=>{
        setStats(s.data);setWeekData(w.data);setMonthData(m.data);setWithdrawalsData(wd.data);
        const tbc=s.data?.tipsByCurrency||[];
        if(tbc.length>0){const most=tbc.reduce((a,b)=>Number(b.count)>Number(a.count)?b:a);setSelectedCurrency(most.currency);}
      })
      .catch(e=>{if(e.response?.status===401){clearAdminToken();onLogout();}else showToast('Failed to load dashboard','error');})
      .finally(()=>setLoading(false));
  },[]);

  const weekTxns=useMemo(()=>(weekData?.transactions||[]).filter(t=>t.currency===selectedCurrency),[weekData,selectedCurrency]);
  const monthTxns=useMemo(()=>(monthData?.transactions||[]).filter(t=>t.currency===selectedCurrency),[monthData,selectedCurrency]);

  const chartData=useMemo(()=>{
    const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
    const grouped={};
    weekTxns.forEach(t=>{const day=t.created_at?.slice(0,10);if(day)grouped[day]=(grouped[day]||0)+Number(t.amount);});
    return days.map(day=>({label:new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}),amount:Number((grouped[day]||0).toFixed(2))}));
  },[weekTxns]);

  const sparkPoints=useMemo(()=>{
    const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
    const grouped={};
    weekTxns.forEach(t=>{const day=t.created_at?.slice(0,10);if(day)grouped[day]=(grouped[day]||0)+1;});
    const counts=days.map(day=>grouped[day]||0);
    if(counts.every(c=>c===0))return'';
    const max=Math.max(...counts,1);
    return counts.map((c,i)=>{const x=(i/(counts.length-1))*60;const y=22-(c/max)*18;return`${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');
  },[weekTxns]);

  const Spark=({color})=>(
    <svg width="60" height="24" style={{flexShrink:0}}>
      {sparkPoints&&<polyline points={sparkPoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>}
    </svg>
  );

  if(loading)return<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading dashboard...</p>;

  const weekVol=weekTxns.reduce((a,t)=>a+Number(t.amount),0);
  const monthVol=monthTxns.reduce((a,t)=>a+Number(t.amount),0);
  const weekCount=weekTxns.length;
  const weekCommission=weekVol*0.1;
  const monthCommission=monthVol*0.1;
  const avgTip=weekCount>0?weekVol/weekCount:0;

  const todayStr=new Date().toISOString().slice(0,10);
  const todayTxns=weekTxns.filter(t=>t.created_at?.slice(0,10)===todayStr);
  const todayVol=todayTxns.reduce((a,t)=>a+Number(t.amount),0);

  const hourAgo=Date.now()-3600000;
  const hourTxns=weekTxns.filter(t=>new Date(t.created_at).getTime()>=hourAgo);
  const hourVol=hourTxns.reduce((a,t)=>a+Number(t.amount),0);

  const days7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d.toISOString().slice(0,10);});
  const oldVol=weekTxns.filter(t=>days7.slice(0,3).includes(t.created_at?.slice(0,10))).reduce((a,t)=>a+Number(t.amount),0);
  const newVol=weekTxns.filter(t=>days7.slice(3).includes(t.created_at?.slice(0,10))).reduce((a,t)=>a+Number(t.amount),0);
  const weekPct=oldVol>0?Math.round(((newVol-oldVol)/oldVol)*100):(newVol>0?100:0);

  const currencyStats=(stats?.tipsByCurrency||[]).find(c=>c.currency===selectedCurrency)||{total:0,count:0};
  const pendingWds=(withdrawalsData?.withdrawals||[]).filter(w=>w.status==='pending'&&w.currency===selectedCurrency);
  const pendingAmt=pendingWds.reduce((a,w)=>a+Number(w.net_amount||w.amount||0),0);
  const pendingCount=pendingWds.length;

  const statCards=[
    {period:'Month',mainLabel:'Tips Volume',mainValue:fmtCur(monthVol,selectedCurrency),secLabel:'Commission',secValue:fmtCur(monthCommission,selectedCurrency),color:ACCENT,pct:weekPct},
    {period:'Week',mainLabel:'Tips Volume',mainValue:fmtCur(weekVol,selectedCurrency),secLabel:'Transactions',secValue:weekCount,color:GREEN,pct:weekPct},
    {period:'Day',mainLabel:'Tips Volume',mainValue:fmtCur(todayVol,selectedCurrency),secLabel:'Transactions',secValue:todayTxns.length,color:YELLOW,pct:0},
    {period:'Hour',mainLabel:'Activity',mainValue:fmtCur(hourVol,selectedCurrency),secLabel:'Transactions',secValue:hourTxns.length,color:PURPLE,pct:0},
  ];

  return(<>
    {/* HEADER + CURRENCY SELECTOR */}
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
      <div>
        <h1 style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:4}}>Overview</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,.35)'}}>Showing data for {selectedCurrency}</p>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:12,color:'rgba(255,255,255,.35)',fontWeight:600}}>Currency</span>
        <div style={{position:'relative'}}>
          <select value={selectedCurrency} onChange={e=>setSelectedCurrency(e.target.value)} style={{appearance:'none',WebkitAppearance:'none',background:'rgba(255,255,255,.07)',border:`1px solid ${BORDER}`,borderRadius:12,padding:'9px 36px 9px 14px',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',outline:'none',fontFamily:'inherit'}}>
            {CURRENCIES.map(c=><option key={c.code} value={c.code} style={{background:'#0d1117'}}>{c.flag} {c.code}</option>)}
          </select>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2.5" style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </div>

    {/* TOP STATS BAR */}
    <div className="overview-grid" style={{display:'grid',gap:12,marginBottom:20}}>
      {statCards.map(card=>(
        <div key={card.period} style={{background:CARD,borderRadius:16,padding:'18px 20px',border:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:.6}}>{card.period}</span>
            <span style={{fontSize:11,fontWeight:700,color:card.pct>=0?GREEN:RED,background:card.pct>=0?'rgba(0,200,150,.1)':'rgba(239,68,68,.1)',borderRadius:50,padding:'2px 8px'}}>{card.pct>=0?'+':''}{card.pct}%</span>
          </div>
          <div>
            <p style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:3}}>{card.mainLabel}</p>
            <p style={{fontSize:19,fontWeight:800,color:'#fff',letterSpacing:-.3,lineHeight:1.1}}>{card.mainValue}</p>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
            <div>
              <p style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>{card.secLabel}</p>
              <p style={{fontSize:13,fontWeight:700,color:card.color}}>{card.secValue}</p>
            </div>
            <Spark color={card.color}/>
          </div>
        </div>
      ))}
    </div>

    {/* MAIN 2-COLUMN AREA */}
    <div className="overview-main" style={{display:'grid',gap:16,marginBottom:16}}>
      {/* LEFT: commission + stats */}
      <div style={{background:CARD,borderRadius:20,padding:'28px 24px',border:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',gap:28}}>
        <div>
          <p style={{fontSize:11,color:'rgba(255,255,255,.35)',textTransform:'uppercase',letterSpacing:.6,fontWeight:700,marginBottom:10}}>Platform Commission</p>
          <p style={{fontSize:34,fontWeight:800,color:'#fff',letterSpacing:-1,lineHeight:1}}>{fmtCur(weekCommission,selectedCurrency)}</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:6}}>This week · {selectedCurrency}</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {[
            {icon:I.transactions,label:'Total Tips',value:currencyStats.count||0,color:'rgba(255,255,255,.8)'},
            {icon:I.analytics,label:'Avg Tip Amount',value:fmtCur(avgTip,selectedCurrency),color:GREEN},
            {icon:I.withdrawals,label:'Platform Income',value:fmtCur(monthCommission,selectedCurrency),color:ACCENT},
          ].map(row=>(
            <div key={row.label} style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.04)',display:'flex',alignItems:'center',justifyContent:'center',color:'rgba(255,255,255,.4)',flexShrink:0}}>{row.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,.35)',marginBottom:2}}>{row.label}</p>
                <p style={{fontSize:15,fontWeight:700,color:row.color}}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: line chart */}
      <div style={{background:'#1a2744',borderRadius:20,padding:'24px 24px 16px',border:`1px solid ${BORDER}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <p style={{fontSize:14,fontWeight:700,color:'#fff'}}>Tips Trend (Last 7 Days)</p>
          <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.4)',background:'rgba(255,255,255,.06)',borderRadius:50,padding:'4px 10px'}}>{selectedCurrency}</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{top:24,right:16,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" vertical={false}/>
            <XAxis dataKey="label" tick={{fill:'rgba(255,255,255,.35)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'rgba(255,255,255,.35)',fontSize:11}} axisLine={false} tickLine={false} width={56} tickFormatter={v=>fmtCur(v,selectedCurrency)}/>
            <Tooltip contentStyle={{background:'#0d1117',border:`1px solid ${BORDER}`,borderRadius:10,color:'#fff',fontSize:13}} formatter={v=>[fmtCur(v,selectedCurrency),'Volume']} labelStyle={{color:'rgba(255,255,255,.5)',marginBottom:4}}/>
            <Line type="monotone" dataKey="amount" stroke="#ffffff" strokeWidth={2}
              dot={({cx,cy,value,index})=>(
                <g key={index}>
                  <circle cx={cx} cy={cy} r={4} fill="#ffffff" stroke="#1a2744" strokeWidth={2}/>
                  {value>0&&<text x={cx} y={cy-10} textAnchor="middle" fill="rgba(255,255,255,.75)" fontSize={10} fontWeight="600">{fmtCur(value,selectedCurrency)}</text>}
                </g>
              )}
              activeDot={{r:6,fill:'#ffffff',stroke:ACCENT,strokeWidth:2}}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* BOTTOM ROW */}
    <div className="overview-bottom" style={{display:'grid',gap:16}}>
      <div onClick={()=>onNavigate('withdrawals')} style={{background:'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)',borderRadius:20,padding:'28px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid rgba(239,68,68,.3)',transition:'opacity .2s'}}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.88'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
        <div>
          <p style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.6,marginBottom:10}}>Pending Withdrawals</p>
          <p style={{fontSize:32,fontWeight:800,color:'#fff',letterSpacing:-1,lineHeight:1}}>{fmtCur(pendingAmt,selectedCurrency)}</p>
          <p style={{fontSize:13,color:'rgba(255,255,255,.65)',marginTop:8}}>{pendingCount} pending request{pendingCount!==1?'s':''}</p>
        </div>
        <div style={{color:'rgba(255,255,255,.6)',flexShrink:0}}>{I.arrowDown}</div>
      </div>
      <div onClick={()=>onNavigate('transactions')} style={{background:'linear-gradient(135deg,#7c3aed 0%,#6c6cff 100%)',borderRadius:20,padding:'28px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',border:'1px solid rgba(108,108,255,.3)',transition:'opacity .2s'}}
        onMouseEnter={e=>e.currentTarget.style.opacity='0.88'} onMouseLeave={e=>e.currentTarget.style.opacity='1'}>
        <div>
          <p style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:.6,marginBottom:10}}>Total Tips Collected</p>
          <p style={{fontSize:32,fontWeight:800,color:'#fff',letterSpacing:-1,lineHeight:1}}>{fmtCur(currencyStats.total||0,selectedCurrency)}</p>
          <p style={{fontSize:13,color:'rgba(255,255,255,.65)',marginTop:8}}>{currencyStats.count||0} transaction{currencyStats.count!==1?'s':''}</p>
        </div>
        <div style={{color:'rgba(255,255,255,.6)',flexShrink:0}}>{I.arrowUp}</div>
      </div>
    </div>
  </>);
}

/* ═══ USERS ═══ */
function UsersSection({showToast,onLogout}){
  const[users,setUsers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState('');
  const[filterType,setFilterType]=useState('all');
  const[actionLoading,setActionLoading]=useState(null);
  const[detail,setDetail]=useState(null);

  const fetchUsers=useCallback(async()=>{
    setLoading(true);
    try{
      const token=localStorage.getItem('snaptip_admin_token');
      const res=await fetch('/api/admin/users',{headers:{'Authorization':'Bearer '+token}});
      if(res.status===401){clearAdminToken();onLogout();return}
      const data=await res.json();
      console.log('[admin] fetchUsers got',data.users?.length||0,'users');
      setUsers(data.users||[]);
    }catch(e){console.error('[admin] fetchUsers error:',e)}
    setLoading(false);
  },[onLogout]);

  useEffect(()=>{fetchUsers()},[fetchUsers]);

  const filtered=useMemo(()=>{let list=users;if(filterType==='members')list=list.filter(u=>u.account_type==='member'||u.account_type==='individual');if(filterType==='business')list=list.filter(u=>u.account_type==='business');if(filterType==='suspended')list=list.filter(u=>u.is_suspended);if(search){const q=search.toLowerCase();list=list.filter(u=>(u.full_name||'').toLowerCase().includes(q)||(u.username||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)||(u.country||'').toLowerCase().includes(q))}return list},[users,filterType,search]);

  const doAction=async(action,userId,userName)=>{
    console.log('[admin] doAction:',action,'userId:',userId);
    const token=localStorage.getItem('snaptip_admin_token');
    if(!token){showToast('Not authenticated','error');return}
    setActionLoading(userId);
    try{
      let url,method;
      if(action==='suspend'){url='/api/admin/users/'+userId+'/suspend';method='PATCH'}
      else if(action==='reactivate'){url='/api/admin/users/'+userId+'/reactivate';method='PATCH'}
      else if(action==='delete'){url='/api/admin/users/'+userId;method='DELETE'}
      else if(action==='reset'){url='/api/admin/users/'+userId+'/reset-password';method='POST'}
      console.log('[admin] calling:',method,url);
      const res=await fetch(url,{method,headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}});
      const data=await res.json();
      console.log('[admin] response:',res.status,data);
      if(res.ok&&(data.success||data.message)){
        if(action==='suspend')showToast('User suspended successfully');
        else if(action==='reactivate')showToast('User reactivated successfully');
        else if(action==='delete')showToast('User permanently deleted');
        else if(action==='reset')showToast('Password reset! New password sent to email.');
        if(action!=='reset')await fetchUsers();
      }else{
        showToast(data.error||'Action failed','error');
      }
    }catch(e){
      console.error('[admin] action error:',e);
      showToast('Network error: '+e.message,'error');
    }
    setActionLoading(null);
  };

  const typeBadge=t=>{if(t==='business')return<Badge text="Business" bg="rgba(0,200,150,.12)" color={GREEN}/>;if(t==='member')return<Badge text="Member" bg="rgba(108,108,255,.12)" color={ACCENT}/>;return<Badge text={t||'Individual'} bg="rgba(255,255,255,.06)" color="rgba(255,255,255,.4)"/>};
  return(<>
    {detail&&<div onClick={()=>setDetail(null)} style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.82)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:24,padding:28,maxWidth:520,width:'100%',marginTop:20,marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'rgba(108,108,255,.12)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {detail.photo_base64||detail.profile_image_url?<img src={detail.photo_base64||detail.profile_image_url} style={{width:72,height:72,objectFit:'cover'}} alt=""/>:<span style={{fontSize:28,fontWeight:700,color:ACCENT}}>{(detail.full_name||'?')[0]}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{detail.full_name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:2}}>@{detail.username}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:3}}>{detail.email}</div>
            <div style={{display:'flex',gap:8,marginTop:6,flexWrap:'wrap'}}>{typeBadge(detail.account_type)}<CountryBadge country={detail.country}/>{detail.is_suspended&&<Badge text="Suspended" bg="rgba(239,68,68,.12)" color={RED}/>}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
          {[{l:'Balance',v:fmtMoney(detail.balance,detail.currency),c:GREEN},{l:'Country',v:detail.country||'—',c:'#fff'},{l:'Currency',v:detail.currency||'—',c:YELLOW}].map(k=><div key={k.l} style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'12px 14px'}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>{k.l}</p><p style={{fontSize:15,fontWeight:800,color:k.c}}>{k.v}</p></div>)}
        </div>
        {[['Job Title',detail.job_title],['Joined',fmtDate(detail.created_at)],['Last Login',fmtDate(detail.last_login)]].map(([l,v])=><div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}><span style={{color:'rgba(255,255,255,.4)',fontSize:13}}>{l}</span><span style={{color:'#fff',fontSize:13,fontWeight:600}}>{v||'—'}</span></div>)}
        <Btn onClick={()=>setDetail(null)} bg='rgba(255,255,255,.08)' color='rgba(255,255,255,.5)' style={{marginTop:20,width:'100%'}}>Close</Btn>
      </div>
    </div>}
    <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Users Management</h1>
    <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
      <Input value={search} onChange={setSearch} placeholder="Search name, email, country..." style={{maxWidth:320}}/>
      <div style={{display:'flex',gap:6}}>{['all','members','business','suspended'].map(f=><button key={f} onClick={()=>setFilterType(f)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:filterType===f?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:filterType===f?ACCENT:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{f}</button>)}</div>
      <span style={{fontSize:12,color:'rgba(255,255,255,.3)',marginLeft:'auto'}}>{filtered.length} user{filtered.length!==1?'s':''}</span>
    </div>
    {loading?<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>:
    <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
      <table><thead><tr><th>User</th><th>Email</th><th>Type</th><th>Country</th><th>Balance</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(u=><tr key={u.id}>
        <td><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:34,height:34,borderRadius:'50%',background:'rgba(108,108,255,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden'}}>{u.photo_base64||u.profile_image_url?<img src={u.photo_base64||u.profile_image_url} style={{width:34,height:34,objectFit:'cover'}} alt=""/>:<span style={{fontWeight:700,color:ACCENT,fontSize:13}}>{(u.full_name||'?')[0].toUpperCase()}</span>}</div><div><div style={{fontWeight:700,color:'#fff',fontSize:13}}>{u.full_name}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>@{u.username}</div></div></div></td>
        <td style={{fontSize:12}}>{u.email}</td>
        <td>{typeBadge(u.account_type)}</td>
        <td><CountryBadge country={u.country}/> <span style={{marginLeft:4}}>{u.country}</span></td>
        <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(u.balance,u.currency)}</td>
        <td style={{fontSize:12}}>{fmtDate(u.last_login)}</td>
        <td>{u.is_suspended?<Badge text="Suspended" bg="rgba(239,68,68,.12)" color={RED}/>:<Badge text="Active" bg="rgba(0,200,150,.12)" color={GREEN}/>}</td>
        <td>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button type="button" style={{background:'rgba(108,108,255,.15)',color:ACCENT,border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:12,fontWeight:600}} onClick={(e)=>{e.preventDefault();e.stopPropagation();setDetail(u)}}>View</button>
            {u.is_suspended?(
              <button type="button" style={{background:'#22c55e',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:12,fontWeight:600}} onClick={(e)=>{e.preventDefault();e.stopPropagation();doAction('reactivate',u.id,u.full_name)}}>Activate</button>
            ):(
              <button type="button" style={{background:'#f59e0b',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:12,fontWeight:600}} onClick={(e)=>{e.preventDefault();e.stopPropagation();doAction('suspend',u.id,u.full_name)}}>Suspend</button>
            )}
            <button type="button" style={{background:'#6c6cff',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:12,fontWeight:600}} onClick={(e)=>{e.preventDefault();e.stopPropagation();doAction('reset',u.id,u.full_name)}}>Reset PW</button>
            <button type="button" style={{background:'#ef4444',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:12,fontWeight:600}} onClick={(e)=>{e.preventDefault();e.stopPropagation();if(!window.confirm('Delete '+u.full_name+'? Cannot be undone.'))return;doAction('delete',u.id,u.full_name)}}>Delete</button>
          </div>
        </td>
      </tr>)}
      {!filtered.length&&<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No users found</td></tr>}
      </tbody></table>
    </div>}
  </>);
}

/* ═══ WITHDRAWALS ═══ */
function WithdrawalsSection({showToast,onLogout,onUpdate}){
  const[withdrawals,setWithdrawals]=useState([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState('all');
  const[methodFilter,setMethodFilter]=useState('all');
  const[search,setSearch]=useState('');
  const[actionId,setActionId]=useState(null);
  const[detail,setDetail]=useState(null);
  const[adminNotes,setAdminNotes]=useState('');
  const[rejectMode,setRejectMode]=useState(false);
  const[rejectReason,setRejectReason]=useState('');
  const[standaloneRejectId,setStandaloneRejectId]=useState(null);
  const[standaloneReason,setStandaloneReason]=useState('');

  const fetchW=useCallback(()=>{
    setLoading(true);
    api().get('/withdrawals')
      .then(r=>setWithdrawals(r.data.withdrawals||[]))
      .catch(e=>{if(e.response?.status===401){clearAdminToken();onLogout();}})
      .finally(()=>setLoading(false));
  },[onLogout]);
  useEffect(()=>{fetchW();},[fetchW]);

  const handlePaid=async id=>{
    setActionId(id);
    try{await api().patch('/withdrawals/'+id+'/status');showToast('Marked as paid! Email sent.');fetchW();onUpdate();setDetail(null);setRejectMode(false);setRejectReason('');}
    catch(e){showToast(e.response?.data?.error||'Failed','error');}
    setActionId(null);
  };
  const handleRejectConfirm=async(id,reason)=>{
    if(!reason.trim()){showToast('Please provide a rejection reason','error');return;}
    setActionId(id);
    try{await api().patch('/withdrawals/'+id+'/reject',{reason});showToast('Rejected. Balance refunded. Email sent.');fetchW();onUpdate();setDetail(null);setRejectMode(false);setRejectReason('');setStandaloneRejectId(null);setStandaloneReason('');}
    catch(e){showToast(e.response?.data?.error||'Failed','error');}
    setActionId(null);
  };

  const handleSaveNote=async()=>{
    if(!detail)return;
    try{await api().patch('/withdrawals/'+detail.id+'/note',{note:adminNotes});showToast('Note saved!');}catch{showToast('Failed to save note','error');}
  };

  const parseDetails=d=>{if(!d)return{};try{return JSON.parse(d);}catch(_){return{Details:d};}};
  const AccountDetailsBlock=({w})=>{
    const d=parseDetails(w.account_details);
    const m=(w.method||'').toLowerCase();
    const CopyBtn=({val})=>val?<button onClick={()=>{navigator.clipboard.writeText(val);showToast('Copied!');}} style={{marginLeft:6,background:'rgba(108,108,255,.12)',border:'none',color:ACCENT,fontSize:11,cursor:'pointer',fontWeight:700,padding:'2px 7px',borderRadius:6}}>Copy</button>:null;
    const Row=({label,val,copy})=>(<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}><span style={{color:'rgba(255,255,255,.4)',fontSize:13,minWidth:120}}>{label}</span><span style={{color:'#fff',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',textAlign:'right',wordBreak:'break-all'}}>{val||'—'}{copy&&<CopyBtn val={val}/>}</span></div>);
    if(m.includes('wise')||m.includes('international'))return(<>
      <Row label="Account Holder" val={d.accountHolder||d.account_holder} copy/>
      <Row label="IBAN" val={d.iban||d.IBAN} copy/>
      <Row label="SWIFT / BIC" val={d.swift||d.bic||d.SWIFT} copy/>
      <Row label="Bank Name" val={d.bankName||d.bank_name}/>
      <Row label="Contact Phone" val={d.phone||d.contactPhone||w.contact_phone} copy/>
      <div style={{marginTop:14}}>
        <a href="https://wise.com/send" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,200,150,.1)',border:'1px solid rgba(0,200,150,.3)',color:'#00C896',textDecoration:'none',padding:'10px 20px',borderRadius:50,fontSize:14,fontWeight:700}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open Wise
        </a>
      </div>
    </>);
    if(m.includes('cih'))return(<><Row label="Full Name" val={d.fullName||d.full_name} copy/><Row label="RIB (16 digits)" val={d.rib||d.RIB} copy/></>);
    if(m.includes('other bank')||m.includes('bank'))return(<><Row label="Bank Name" val={d.bankName||d.bank_name}/><Row label="Full Name" val={d.fullName||d.full_name} copy/><Row label="RIB (24 digits)" val={d.rib||d.RIB} copy/></>);
    if(m.includes('agency')||m.includes('cash')||m.includes('wafa'))return(<><Row label="Full Name" val={d.fullName||d.full_name} copy/><Row label="CIN" val={d.cin||d.CIN} copy/><Row label="Phone" val={d.phone||w.contact_phone} copy/></>);
    return(<Row label="Phone Number" val={d.phone||w.contact_phone||d.phoneNumber} copy/>);
  };

  const allMethods=useMemo(()=>['all',...new Set(withdrawals.map(w=>w.method).filter(Boolean))],[withdrawals]);
  const filtered=useMemo(()=>{
    let list=withdrawals;
    if(filter!=='all')list=list.filter(w=>w.status===filter);
    if(methodFilter!=='all')list=list.filter(w=>w.method===methodFilter);
    if(search){const q=search.toLowerCase();list=list.filter(w=>(w.full_name||'').toLowerCase().includes(q)||(w.username||'').toLowerCase().includes(q));}
    return list;
  },[withdrawals,filter,methodFilter,search]);

  return(<>
    {detail&&<div onClick={()=>{setDetail(null);setRejectMode(false);setRejectReason('');}} style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.82)',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:24,padding:28,maxWidth:560,width:'100%',marginTop:20,marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:24,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{width:72,height:72,borderRadius:'50%',overflow:'hidden',background:'rgba(108,108,255,.12)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {detail.photo_base64||detail.profile_image_url?<img src={detail.photo_base64||detail.profile_image_url} style={{width:72,height:72,objectFit:'cover'}} alt=""/>:<span style={{fontSize:28,fontWeight:700,color:ACCENT}}>{(detail.full_name||'?')[0]}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:20,fontWeight:800,color:'#fff'}}>{detail.full_name}</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,.4)',marginTop:2}}>@{detail.username}</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:3}}>{detail.email}</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}><CountryBadge country={detail.country}/><span style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>{detail.country} · {detail.currency} · Joined {fmtDate(detail.emp_created_at)}</span></div>
          </div>
        </div>
        <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:.5,marginBottom:10}}>Withdrawal Details</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
          {[{l:'Amount',v:fmtMoney(detail.amount,detail.currency),c:'#fff'},{l:'Fee',v:fmtMoney(detail.fee,detail.currency),c:YELLOW},{l:'Net Payout',v:fmtMoney(detail.net_amount,detail.currency),c:GREEN}].map(k=><div key={k.l} style={{background:'rgba(255,255,255,.04)',borderRadius:12,padding:'12px 14px'}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>{k.l}</p><p style={{fontSize:16,fontWeight:800,color:k.c}}>{k.v}</p></div>)}
        </div>
        {[['Method',detail.method,'text'],['Status',null,'badge'],['Date',fmtDate(detail.created_at),'text']].map(([l,v,t])=><div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}><span style={{color:'rgba(255,255,255,.4)',fontSize:13}}>{l}</span>{t==='badge'?<StatusBadge status={detail.status}/>:<span style={{color:'#fff',fontSize:13,fontWeight:600}}>{v}</span>}</div>)}
        <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:.5,margin:'20px 0 10px'}}>Account Details</p>
        <div style={{background:'rgba(255,255,255,.03)',borderRadius:12,padding:'4px 14px',marginBottom:20}}><AccountDetailsBlock w={detail}/></div>
        <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Admin Notes (internal)</p>
        <textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} placeholder="Add internal notes..." rows={2} style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:12,color:'#fff',fontSize:13,outline:'none',resize:'vertical',marginBottom:8,boxSizing:'border-box'}}/>
        <div style={{display:'flex',justifyContent:'flex-end',marginBottom:20}}><Btn small onClick={handleSaveNote} bg='rgba(108,108,255,.12)' color={ACCENT}>Save Note</Btn></div>
        {rejectMode&&<><p style={{fontSize:11,fontWeight:700,color:RED,textTransform:'uppercase',letterSpacing:.5,marginBottom:8}}>Rejection Reason (sent to employee)</p><textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Enter reason..." rows={2} style={{width:'100%',background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,padding:12,color:'#fff',fontSize:13,outline:'none',resize:'vertical',marginBottom:16,boxSizing:'border-box'}}/></>}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          {detail.status==='pending'&&<>{!rejectMode?<><Btn onClick={()=>handlePaid(detail.id)} bg={GREEN} color='#080818' disabled={!!actionId}>{I.check} Mark as Paid</Btn><Btn onClick={()=>setRejectMode(true)} bg='rgba(239,68,68,.1)' color={RED}>{I.x} Reject</Btn></>:<><Btn onClick={()=>handleRejectConfirm(detail.id,rejectReason)} bg={RED} disabled={!!actionId}>Confirm Reject</Btn><Btn onClick={()=>{setRejectMode(false);setRejectReason('');}} bg='rgba(255,255,255,.08)' color='rgba(255,255,255,.5)'>Cancel</Btn></>}</>}
          <Btn onClick={()=>{setDetail(null);setRejectMode(false);setRejectReason('');}} bg='rgba(255,255,255,.08)' color='rgba(255,255,255,.5)' style={{marginLeft:'auto'}}>Close</Btn>
        </div>
      </div>
    </div>}
    {standaloneRejectId&&<div style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}><div style={{background:CARD,border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:32,maxWidth:420,width:'100%'}}><p style={{color:'#fff',fontSize:16,fontWeight:600,marginBottom:12}}>Reject Withdrawal</p><textarea value={standaloneReason} onChange={e=>setStandaloneReason(e.target.value)} placeholder="Rejection reason (sent to employee)..." rows={3} style={{width:'100%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:12,color:'#fff',fontSize:14,outline:'none',resize:'vertical',marginBottom:16}}/><div style={{display:'flex',gap:12,justifyContent:'flex-end'}}><Btn onClick={()=>{setStandaloneRejectId(null);setStandaloneReason('');}} bg='rgba(255,255,255,.08)' color='rgba(255,255,255,.5)'>Cancel</Btn><Btn onClick={()=>handleRejectConfirm(standaloneRejectId,standaloneReason)} bg={RED} disabled={!!actionId}>Reject</Btn></div></div></div>}
    <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Withdrawals</h1>
    <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
      <Input value={search} onChange={setSearch} placeholder="Search by name or @username..." style={{maxWidth:260}}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{['all','pending','paid','rejected'].map(f=><button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:filter===f?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:filter===f?ACCENT:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{f}</button>)}</div>
      <select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)} style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,height:36,padding:'0 12px',color:'rgba(255,255,255,.7)',fontSize:12,cursor:'pointer',outline:'none'}}>{allMethods.map(m=><option key={m} value={m} style={{background:'#0d1117'}}>{m==='all'?'All Methods':m}</option>)}</select>
      <span style={{fontSize:12,color:'rgba(255,255,255,.3)',marginLeft:'auto'}}>{filtered.length} result{filtered.length!==1?'s':''}</span>
    </div>
    {loading?<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>:
    <div style={{background:CARD,borderRadius:16,border:'1px solid rgba(255,255,255,0.06)',overflow:'auto'}}>
      <table><thead><tr><th>Date</th><th>Employee</th><th>Method</th><th>Amount</th><th>Fee</th><th>Net</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>{filtered.map(w=><tr key={w.id}>
        <td style={{fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(w.created_at)}</td>
        <td><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:30,height:30,borderRadius:'50%',background:'rgba(108,108,255,.12)',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{w.photo_base64||w.profile_image_url?<img src={w.photo_base64||w.profile_image_url} style={{width:30,height:30,objectFit:'cover'}} alt=""/>:<span style={{fontSize:12,fontWeight:700,color:ACCENT}}>{(w.full_name||'?')[0]}</span>}</div><div><div style={{fontWeight:700,color:'#fff',fontSize:13}}>{w.full_name}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)',display:'flex',alignItems:'center',gap:4}}>@{w.username} <CountryBadge country={w.country}/></div></div></div></td>
        <td style={{fontSize:12,color:'rgba(255,255,255,.6)',maxWidth:140}}>{w.method}</td>
        <td style={{fontWeight:700,color:'#fff'}}>{fmtMoney(w.amount,w.currency)}</td>
        <td style={{color:YELLOW}}>{fmtMoney(w.fee,w.currency)}</td>
        <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(w.net_amount,w.currency)}</td>
        <td><StatusBadge status={w.status}/></td>
        <td><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><Btn small onClick={()=>{setDetail(w);setAdminNotes(w.admin_notes||'');setRejectMode(false);setRejectReason('');}}>View</Btn>{w.status==='pending'&&<><Btn small bg={GREEN} color='#080818' disabled={actionId===w.id} onClick={()=>handlePaid(w.id)} style={{padding:'6px 10px'}}>{I.check}</Btn><Btn small bg='rgba(239,68,68,.1)' color={RED} disabled={actionId===w.id} onClick={()=>{setStandaloneRejectId(w.id);setStandaloneReason('');}} style={{padding:'6px 10px'}}>{I.x}</Btn></>}</div></td>
      </tr>)}
      {!filtered.length&&<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No withdrawals found</td></tr>}
      </tbody></table>
    </div>}
  </>);
}

/* ═══ BUSINESSES ═══ */
function BusinessesSection({showToast,onLogout}){
  const[businesses,setBusinesses]=useState([]);const[loading,setLoading]=useState(true);const[confirm,setConfirm]=useState(null);
  const fetchB=useCallback(()=>{setLoading(true);api().get('/businesses').then(r=>setBusinesses(r.data.businesses||[])).catch(e=>{if(e.response?.status===401){clearAdminToken();onLogout()}}).finally(()=>setLoading(false))},[onLogout]);
  useEffect(()=>{fetchB()},[fetchB]);
  const handleDelete=async id=>{try{await api().delete(`/businesses/${id}`);showToast('Business deleted.');fetchB()}catch(e){showToast(e.response?.data?.error||'Failed','error')}setConfirm(null)};
  return(<>
    {confirm&&<Confirm msg={confirm.msg} onConfirm={confirm.fn} onCancel={()=>setConfirm(null)}/>}
    <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Businesses</h1>
    {loading?<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>:
    <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
      <table><thead><tr><th>Business</th><th>Owner</th><th>Type</th><th>Country</th><th>Team</th><th>Total Tips</th><th>Created</th><th>Actions</th></tr></thead>
      <tbody>{businesses.map(b=><tr key={b.id}>
        <td style={{fontWeight:700,color:'#fff'}}>{b.business_name}</td>
        <td><div style={{fontSize:13}}>{b.owner_name}</div><div style={{fontSize:11,color:'rgba(255,255,255,.3)'}}>{b.owner_email}</div></td>
        <td><Badge text={b.business_type} bg='rgba(108,108,255,.12)' color={ACCENT}/></td>
        <td><CountryBadge country={b.country}/> {b.country}</td>
        <td style={{fontWeight:700,color:'#fff'}}>{b.team_count}</td>
        <td style={{fontWeight:700,color:GREEN}}>{fmtMoney(b.total_tips)}</td>
        <td style={{fontSize:12}}>{fmtDate(b.created_at)}</td>
        <td><Btn small bg='rgba(239,68,68,.1)' color={RED} onClick={()=>setConfirm({msg:`Delete "${b.business_name}"? Team links removed, employee accounts kept.`,fn:()=>handleDelete(b.id)})}>{I.trash} Delete</Btn></td>
      </tr>)}
      {!businesses.length&&<tr><td colSpan={8} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No businesses yet</td></tr>}
      </tbody></table>
    </div>}
  </>);
}

/* ═══ TRANSACTIONS ═══ */
function TransactionsSection({showToast,onLogout}){
  const[data,setData]=useState({transactions:[],totalVolume:0,totalCommission:0,totalCount:0});const[loading,setLoading]=useState(true);const[range,setRange]=useState('all');
  const fetchT=useCallback(()=>{setLoading(true);api().get('/transactions',{params:{range}}).then(r=>setData(r.data)).catch(e=>{if(e.response?.status===401){clearAdminToken();onLogout()}}).finally(()=>setLoading(false))},[range,onLogout]);
  useEffect(()=>{fetchT()},[fetchT]);
  const exportCSV=()=>{const h='Date,Employee,Username,Amount,Currency,Commission,Method\n';const rows=data.transactions.map(t=>`"${fmtDate(t.created_at)}","${t.full_name}","${t.username}",${Number(t.amount).toFixed(2)},${t.currency||'MAD'},${(Number(t.amount)*.1).toFixed(2)},${t.payment_method}`).join('\n');const b=new Blob([h+rows],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=`snaptip_transactions_${range}.csv`;a.click();showToast('CSV exported!')};
  return(<>
    <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:20}}>Transactions</h1>
    <div style={{display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'}}>
      <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>TOTAL VOLUME</p><p style={{fontSize:20,fontWeight:800,color:GREEN}}>{fmtMoney(data.totalVolume)}</p></div>
      <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>COMMISSION (10%)</p><p style={{fontSize:20,fontWeight:800,color:PURPLE}}>{fmtMoney(data.totalCommission)}</p></div>
      <div style={{background:CARD,borderRadius:14,padding:'14px 20px',border:`1px solid ${BORDER}`,flex:1,minWidth:150}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:4}}>TRANSACTIONS</p><p style={{fontSize:20,fontWeight:800,color:'#fff'}}>{data.totalCount}</p></div>
    </div>
    <div style={{display:'flex',gap:12,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
      <div style={{display:'flex',gap:6}}>{['today','week','month','all'].map(r=><button key={r} onClick={()=>setRange(r)} style={{padding:'6px 14px',borderRadius:50,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',background:range===r?'rgba(108,108,255,.15)':'rgba(255,255,255,.04)',color:range===r?ACCENT:'rgba(255,255,255,.4)',textTransform:'capitalize'}}>{r==='all'?'All Time':r==='week'?'This Week':r==='month'?'This Month':'Today'}</button>)}</div>
      <Btn small onClick={exportCSV} bg='rgba(0,200,150,.12)' color={GREEN} style={{marginLeft:'auto'}}>Export CSV</Btn>
    </div>
    {loading?<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>:
    <div style={{background:CARD,borderRadius:16,border:`1px solid ${BORDER}`,overflow:'auto'}}>
      <table><thead><tr><th>Date</th><th>Employee</th><th>Amount</th><th>Commission</th><th>Method</th></tr></thead>
      <tbody>{data.transactions.map((t,i)=><tr key={i}>
        <td style={{fontSize:12}}>{fmtDate(t.created_at)}</td>
        <td><span style={{fontWeight:600,color:'#fff'}}>{t.full_name}</span> <span style={{color:'rgba(255,255,255,.3)'}}>@{t.username}</span></td>
        <td style={{fontWeight:700,color:'#fff'}}><CurrencyPill currency={t.currency} amount={t.amount}/></td>
        <td><CurrencyPill currency={t.currency} amount={Number(t.amount)*.1}/></td>
        <td><Badge text={t.payment_method||'mock'} bg='rgba(255,255,255,.06)' color='rgba(255,255,255,.5)'/></td>
      </tr>)}
      {!data.transactions.length&&<tr><td colSpan={5} style={{textAlign:'center',padding:40,color:'rgba(255,255,255,.3)'}}>No transactions for this period</td></tr>}
      </tbody></table>
    </div>}
  </>);
}

/* ═══ ANALYTICS ═══ */
function AnalyticsSection({showToast}){
  const[data,setData]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{api().get('/analytics').then(r=>setData(r.data)).catch(()=>showToast('Failed','error')).finally(()=>setLoading(false))},[]);
  if(loading)return<p style={{color:'rgba(255,255,255,.4)',padding:40,textAlign:'center'}}>Loading...</p>;
  if(!data)return null;
  const maxTip=Math.max(...(data.topEmployees||[]).map(e=>e.total_tips),1),maxHour=Math.max(...(data.peakHours||[]).map(h=>h.count),1);
  return(<>
    <h1 style={{fontSize:26,fontWeight:800,color:'#fff',marginBottom:24}}>Analytics</h1>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:28}}>
      <div style={{background:CARD,borderRadius:16,padding:'18px 22px',border:`1px solid ${BORDER}`}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:6}}>AVG TIP AMOUNT</p><p style={{fontSize:22,fontWeight:800,color:GREEN}}>{fmtMoney(data.avgTip)}</p></div>
      {(data.methodBreakdown||[]).map((m,i)=><div key={i} style={{background:CARD,borderRadius:16,padding:'18px 22px',border:`1px solid ${BORDER}`}}><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:6}}>{(m.payment_method||'mock').toUpperCase()}</p><p style={{fontSize:22,fontWeight:800,color:ACCENT}}>{m.count}</p><p style={{fontSize:12,color:'rgba(255,255,255,.3)',marginTop:4}}>{fmtMoney(m.total)}</p></div>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(380px,1fr))',gap:14,marginBottom:28}}>
      <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
        <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>Top 10 Employees by Tips</p>
        {(data.topEmployees||[]).map((e,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <span style={{width:24,fontSize:14,fontWeight:800,color:i<3?[YELLOW,'#C0C0C0','#CD7F32'][i]:'rgba(255,255,255,.3)'}}>#{i+1}</span>
          <div style={{flex:1}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontWeight:600,color:'#fff',fontSize:13}}>{e.full_name}</span><span style={{fontWeight:700,color:GREEN,fontSize:13}}>{fmtMoney(e.total_tips,e.currency)}</span></div>
          <div style={{height:6,background:'rgba(255,255,255,.04)',borderRadius:3}}><div style={{height:6,borderRadius:3,background:`linear-gradient(90deg,${ACCENT},${GREEN})`,width:`${(e.total_tips/maxTip)*100}%`}}/></div></div>
        </div>)}
        {(!data.topEmployees||!data.topEmployees.length)&&<p style={{color:'rgba(255,255,255,.3)',fontSize:13}}>No data</p>}
      </div>
      <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
        <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:16}}>Peak Hours</p>
        <div style={{display:'flex',alignItems:'flex-end',gap:3,height:120}}>
          {Array.from({length:24},(_,h)=>{const f=(data.peakHours||[]).find(p=>p.hour===h);const c=f?.count||0;return<div key={h} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}><div style={{width:'100%',background:c>0?ACCENT:'rgba(255,255,255,.04)',borderRadius:3,height:`${Math.max((c/maxHour)*90,2)}px`}}/>{h%4===0&&<span style={{fontSize:8,color:'rgba(255,255,255,.25)'}}>{h}h</span>}</div>})}
        </div>
      </div>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:14}}>
      <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
        <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:14}}>Top Countries by Users</p>
        {(data.topCountriesByUsers||[]).map((c,i)=><div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${BORDER}`}}><span style={{color:'#fff',fontWeight:600,fontSize:14,display:'flex',alignItems:'center',gap:6}}><CountryBadge country={c.country}/>{c.country}</span><span style={{color:ACCENT,fontWeight:700,fontSize:14}}>{c.count}</span></div>)}
      </div>
      <div style={{background:CARD,borderRadius:16,padding:20,border:`1px solid ${BORDER}`}}>
        <p style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:14}}>Top Countries by Tips</p>
        {(data.topCountriesByTips||[]).map((c,i)=><div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${BORDER}`}}><span style={{color:'#fff',fontWeight:600,fontSize:14,display:'flex',alignItems:'center',gap:6}}><CountryBadge country={c.country}/>{c.country}</span><span style={{color:GREEN,fontWeight:700,fontSize:14}}>{fmtMoney(c.total)}</span></div>)}
      </div>
    </div>
  </>);
}
