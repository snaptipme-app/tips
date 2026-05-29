import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Copy } from 'lucide-react';
import { clearAdminToken } from './AdminLogin';

const ACCENT='#00ffcc';
const GREEN='#00C896';
const YELLOW='#f59e0b';
const RED='#ef4444';
const BG='#0B0F14';
const PANEL='#0f151c';
const PANEL_2='#111a23';
const BORDER='rgba(255,255,255,.08)';

const COUNTRY_CODES={
  Morocco:'MA','United States':'US',France:'FR',Spain:'ES',Germany:'DE',Italy:'IT',
  UAE:'AE','United Arab Emirates':'AE',Philippines:'PH',Indonesia:'ID',Thailand:'TH',
  'United Kingdom':'GB',Netherlands:'NL',Portugal:'PT',Belgium:'BE',Austria:'AT',
  Ireland:'IE',Poland:'PL',Sweden:'SE',Switzerland:'CH',Denmark:'DK',Norway:'NO',
  Finland:'FI',Singapore:'SG',Japan:'JP','Hong Kong':'HK',Malaysia:'MY',
  Canada:'CA',Mexico:'MX',Australia:'AU','New Zealand':'NZ',
};

const ISO_TO_COUNTRY=Object.fromEntries(Object.entries(COUNTRY_CODES).map(([name,code])=>[code,name]));

function api(){return axios.create({baseURL:'/api/admin',withCredentials:true});}
function fmtDate(d){return d?new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'Not set';}
function fmtMoney(n,c='USD'){return `${Number(n||0).toFixed(2)} ${c||''}`.trim();}

function countryCodeFor(w){
  const raw=w?.country_code||w?.country;
  return COUNTRY_CODES[raw]||raw||'??';
}

function CountryFlag({code,size=22}){
  const iso=String(code||'').toLowerCase();
  if(!iso||iso==='??')return <span style={{width:size,height:Math.round(size*.72),borderRadius:4,background:'rgba(255,255,255,.1)',display:'inline-block'}}/>;
  return <img src={`https://flagcdn.com/${iso}.svg`} alt={iso.toUpperCase()} width={size} height={Math.round(size*.72)} loading="lazy" style={{width:size,height:Math.round(size*.72),borderRadius:4,objectFit:'cover',boxShadow:'0 0 0 1px rgba(255,255,255,.14)',display:'inline-block',flexShrink:0}}/>;
}

function CountryBadge({w,large=false}){
  const code=typeof w==='string'?w:countryCodeFor(w);
  return <span style={{display:'inline-flex',alignItems:'center',gap:7,background:'rgba(255,255,255,.06)',border:`1px solid ${BORDER}`,borderRadius:large?10:8,padding:large?'6px 10px':'5px 8px',color:'rgba(255,255,255,.75)',fontSize:large?13:12,fontWeight:800}}>
    <CountryFlag code={code} size={large?22:18}/>{code}
  </span>;
}

function StatusBadge({status}){
  const s=String(status||'pending').toLowerCase();
  const map={
    pending:{label:'Pending',bg:'rgba(245,158,11,.14)',border:'rgba(245,158,11,.28)',color:YELLOW},
    processing:{label:'Processing',bg:'rgba(59,130,246,.14)',border:'rgba(59,130,246,.28)',color:'#60a5fa'},
    paid:{label:'Paid',bg:'rgba(0,200,150,.14)',border:'rgba(0,200,150,.28)',color:GREEN},
    completed:{label:'Paid',bg:'rgba(0,200,150,.14)',border:'rgba(0,200,150,.28)',color:GREEN},
    rejected:{label:'Rejected',bg:'rgba(239,68,68,.14)',border:'rgba(239,68,68,.28)',color:RED},
    failed:{label:'Failed',bg:'rgba(239,68,68,.14)',border:'rgba(239,68,68,.28)',color:RED},
  };
  const cfg=map[s]||map.pending;
  return <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,borderRadius:9,padding:'6px 10px',fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.4,whiteSpace:'nowrap'}}>{cfg.label}</span>;
}

function Button({children,onClick,variant='neutral',small=false,disabled=false,style}){
  const variants={
    neutral:{bg:'rgba(255,255,255,.07)',border:BORDER,color:'rgba(255,255,255,.78)'},
    green:{bg:GREEN,border:GREEN,color:'#06120f'},
    greenSoft:{bg:'rgba(0,200,150,.12)',border:'rgba(0,200,150,.28)',color:GREEN},
    red:{bg:RED,border:RED,color:'#fff'},
    redSoft:{bg:'rgba(239,68,68,.12)',border:'rgba(239,68,68,.28)',color:RED},
  };
  const v=variants[variant]||variants.neutral;
  return <button type="button" disabled={disabled} onClick={e=>{e.stopPropagation();onClick?.(e);}} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,height:small?34:40,padding:small?'0 12px':'0 16px',borderRadius:small?9:11,border:`1px solid ${v.border}`,background:v.bg,color:v.color,fontSize:small?12:13,fontWeight:850,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.55:1,whiteSpace:'nowrap',...style}}>{children}</button>;
}

function moneyFrom(w,key,fallback=0){
  return Number(w?.[key]??fallback??0);
}

export default function WithdrawalsSectionPro({showToast,onLogout,onUpdate}){
  const[withdrawals,setWithdrawals]=useState([]);
  const[loading,setLoading]=useState(true);
  const[filter,setFilter]=useState('all');
  const[methodFilter,setMethodFilter]=useState('all');
  const[countryFilter,setCountryFilter]=useState('all');
  const[search,setSearch]=useState('');
  const[detail,setDetail]=useState(null);
  const[adminNotes,setAdminNotes]=useState('');
  const[actionId,setActionId]=useState(null);
  const[paidTarget,setPaidTarget]=useState(null);
  const[rejectTarget,setRejectTarget]=useState(null);
  const[rejectReason,setRejectReason]=useState('');
  const[revealedDetails,setRevealedDetails]=useState(null);
  const[revealing,setRevealing]=useState(false);

  const fetchWithdrawals=useCallback(()=>{
    setLoading(true);
    api().get('/withdrawals')
      .then(r=>setWithdrawals(r.data.withdrawals||[]))
      .catch(e=>{if(e.response?.status===401){clearAdminToken();onLogout();}})
      .finally(()=>setLoading(false));
  },[onLogout]);

  useEffect(()=>{fetchWithdrawals();},[fetchWithdrawals]);

  const employeeName=w=>String(w?.full_name||w?.employee_name||'Unknown employee').trim();
  const employeeHandle=w=>w?.username?`@${w.username}`:'@employee';
  const employeeInitial=w=>(employeeName(w)[0]||'?').toUpperCase();
  const employeeEmail=w=>String(w?.email||w?.contact_email||'').trim();
  const statusKey=w=>String(w?.status||w?.payout_status||'pending').toLowerCase();
  const visibleStatus=w=>statusKey(w)==='completed'?'paid':statusKey(w);
  const methodRaw=w=>String(w?.payout_method||w?.method||'wise_manual').toLowerCase();
  const isStripe=w=>methodRaw(w).includes('stripe');
  const isWise=w=>!isStripe(w);
  const isPending=w=>statusKey(w)==='pending';
  const isManualPending=w=>isWise(w)&&isPending(w);
  const methodLabel=w=>isStripe(w)?'Stripe Connect':'Wise Manual';
  const grossRequested=w=>moneyFrom(w,'gross_requested_amount',w?.amount);
  const feeAmount=w=>moneyFrom(w,'platform_fee_amount',w?.fee);
  const netPayout=w=>moneyFrom(w,'net_payout_amount',w?.net_amount??Math.max(0,grossRequested(w)-feeAmount(w)));
  const grossEarned=w=>moneyFrom(w,'gross_earned',w?.total_earned);
  const availableBalance=w=>moneyFrom(w,'net_balance',w?.available_balance??w?.balance);

  const parseDetails=d=>{
    if(!d)return{};
    if(typeof d==='object')return d;
    try{return JSON.parse(d);}catch(_){return{raw:d};}
  };

  const cleanMask=v=>{
    const text=String(v||'').trim().replace(/\*/g,'•');
    return text||'-';
  };

  const maskedDisplay=(value,label='')=>{
    const raw=String(value||'').trim();
    if(!raw)return'-';
    if(raw.includes('*')||raw.includes('•'))return cleanMask(raw);
    const lower=label.toLowerCase();
    if(lower.includes('email')){
      const [name,domain]=raw.split('@');
      if(!domain)return'••••';
      return `${(name||'').slice(0,1)}***@${domain}`;
    }
    if(lower.includes('phone')){
      const compact=raw.replace(/\s+/g,'');
      if(compact.length<=6)return'••••';
      return `${compact.slice(0,4)}••••${compact.slice(-3)}`;
    }
    if(lower.includes('address'))return'Saved - reveal to view';
    const compact=raw.replace(/\s+/g,'');
    if(lower.includes('iban')&&compact.length>8)return`${compact.slice(0,2)}••••••••••••${compact.slice(-4)}`;
    return `••••••••${compact.slice(-4)}`;
  };

  const getPayoutDetails=w=>{
    const revealed=w?.id&&revealedDetails?.withdrawalId===w.id?revealedDetails:null;
    const pd=revealed||w?.employee?.payout_details||w?.payout_details||{};
    const masked=pd.masked||{};
    const d=parseDetails(w?.employee?.account_details??w?.account_details);
    return {
      bankName:pd.bankName||d.bankName||d.bank_name||d.bank||d.Bank||'-',
      accountHolder:pd.accountHolderName||pd.accountHolderNameEn||d.fullName||d.full_name||d.accountHolder||d.account_holder||d.recipientName||w?.full_name||'-',
      accountNumber:pd.ribNumber||pd.iban||pd.accountNumber||masked.ribNumber||masked.iban||masked.accountNumber||d.accountNumber||d.account_number||d.rib||d.RIB||d.iban||d.IBAN||'-',
      email:pd.contactEmail||masked.contactEmail||d.contactEmail||d.email||w?.email||'-',
      phone:pd.phoneNumber||masked.phoneNumber||d.phone||d.phoneNumber||d.contactPhone||w?.contact_phone||'-',
      address:pd.address||masked.address||d.address||'-',
      country:pd.countryCode||countryCodeFor(w),
      currency:pd.currency||w?.currency||'-',
      revealed:Boolean(revealed),
    };
  };

  const methodBadgeStyle=w=>isStripe(w)
    ?{bg:'rgba(124,92,255,.16)',border:'rgba(124,92,255,.30)',color:'#b8a7ff'}
    :{bg:'rgba(0,200,150,.13)',border:'rgba(0,200,150,.30)',color:GREEN};

  const openDetail=w=>{
    setDetail(w);
    setAdminNotes(w?.admin_note||'');
    setRevealedDetails(null);
    setRevealing(false);
    setRejectReason('');
  };

  const copyValue=(value,label)=>{
    const text=String(value||'').trim();
    if(!text||text==='-')return;
    navigator.clipboard?.writeText(text);
    showToast(`${label} copied`);
  };

  const handlePaid=async w=>{
    if(!w)return;
    setActionId(w.id);
    try{
      await api().patch(`/withdrawals/${w.id}/status`);
      showToast('Withdrawal marked as paid');
      setPaidTarget(null);
      setDetail(null);
      fetchWithdrawals();
      onUpdate?.();
    }catch(e){
      showToast(e.response?.data?.error||'Failed to mark withdrawal as paid','error');
    }
    setActionId(null);
  };

  const handleReject=async()=>{
    if(!rejectTarget)return;
    if(!rejectReason.trim()){showToast('Please add a rejection reason','error');return;}
    setActionId(rejectTarget.id);
    try{
      await api().patch(`/withdrawals/${rejectTarget.id}/reject`,{reason:rejectReason});
      showToast('Withdrawal rejected and balance refunded');
      setRejectTarget(null);
      setRejectReason('');
      setDetail(null);
      fetchWithdrawals();
      onUpdate?.();
    }catch(e){
      showToast(e.response?.data?.error||'Failed to reject withdrawal','error');
    }
    setActionId(null);
  };

  const handleSaveNote=async()=>{
    if(!detail)return;
    try{
      await api().patch(`/withdrawals/${detail.id}/note`,{note:adminNotes});
      showToast('Internal note saved');
      setDetail({...detail,admin_note:adminNotes});
    }catch(e){
      showToast(e.response?.data?.error||'Failed to save note','error');
    }
  };

  const revealPayoutDetails=async()=>{
    if(!detail)return;
    setRevealing(true);
    try{
      const r=await api().get(`/withdrawals/${detail.id}/payout-details`);
      setRevealedDetails({...r.data.details,withdrawalId:detail.id});
      showToast('Full payout details revealed');
    }catch(e){
      showToast(e.response?.data?.error||'Could not reveal payout details','error');
    }
    setRevealing(false);
  };

  const countries=useMemo(()=>['all',...new Set(withdrawals.map(countryCodeFor).filter(Boolean).sort())],[withdrawals]);

  const filtered=useMemo(()=>{
    let list=withdrawals;
    if(filter==='paid')list=list.filter(w=>['paid','completed'].includes(statusKey(w)));
    else if(filter!=='all')list=list.filter(w=>statusKey(w)===filter);
    if(methodFilter==='wise_manual')list=list.filter(isWise);
    if(methodFilter==='stripe_connect')list=list.filter(isStripe);
    if(countryFilter!=='all')list=list.filter(w=>countryCodeFor(w)===countryFilter);
    if(search.trim()){
      const q=search.toLowerCase().trim();
      list=list.filter(w=>[
        employeeName(w),w.username,w.email,w.country,w.currency,w.method,w.payout_method,
      ].some(v=>String(v||'').toLowerCase().includes(q)));
    }
    const rank={pending:0,processing:1,failed:2,rejected:3,paid:4,completed:4};
    return [...list].sort((a,b)=>{
      const r=(rank[statusKey(a)]??9)-(rank[statusKey(b)]??9);
      if(r)return r;
      if(isManualPending(a)!==isManualPending(b))return isManualPending(a)?-1:1;
      return new Date(b.created_at||0)-new Date(a.created_at||0);
    });
  },[withdrawals,filter,methodFilter,countryFilter,search]);

  const summary=useMemo(()=>{
    const pending=withdrawals.filter(isPending);
    const manualPending=pending.filter(isWise);
    const rejected=withdrawals.filter(w=>['rejected','failed'].includes(statusKey(w)));
    const paidToday=withdrawals.filter(w=>{
      if(!['paid','completed'].includes(statusKey(w)))return false;
      const d=new Date(w.processed_at||w.updated_at||w.created_at||0);
      return d.toDateString()===new Date().toDateString();
    });
    const currencies=new Set(pending.map(w=>w.currency).filter(Boolean));
    const pendingCurrency=currencies.size===1?[...currencies][0]:'mixed';
    const pendingTotal=pending.reduce((sum,w)=>sum+grossRequested(w),0);
    return {pending,manualPending,rejected,paidToday,pendingTotal,pendingCurrency};
  },[withdrawals]);

  const exportWiseCSV=()=>{
    const pending=withdrawals.filter(isManualPending);
    if(!pending.length){showToast('No pending Wise Manual withdrawals to export','error');return;}
    const rows=pending.map(w=>{
      const d=getPayoutDetails(w);
      return [
        employeeName(w),w.currency,Number(netPayout(w)).toFixed(2),
        d.bankName,d.accountHolder,cleanMask(d.accountNumber),cleanMask(d.email),employeeHandle(w)
      ].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',');
    });
    const csv=['employee,currency,net_payout,bank_name,account_holder,account_or_rib,contact_email,reference',...rows].join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`wise_manual_payouts_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${pending.length} Wise Manual payout${pending.length!==1?'s':''}`);
  };

  const FilterChip=({value,label})=>(
    <button type="button" onClick={()=>setFilter(value)} style={{height:40,border:'1px solid '+(filter===value?'rgba(0,255,204,.35)':BORDER),background:filter===value?'rgba(0,200,150,.16)':'rgba(255,255,255,.045)',color:filter===value?ACCENT:'rgba(255,255,255,.68)',borderRadius:10,padding:'0 16px',fontSize:13,fontWeight:850,cursor:'pointer'}}>{label}</button>
  );

  const SummaryCard=({title,value,sub,color=ACCENT})=>(
    <div className="withdrawals-stat" style={{background:`linear-gradient(145deg,${PANEL_2},${PANEL})`,border:`1px solid ${BORDER}`,borderRadius:14,padding:18,minHeight:96,boxShadow:'0 18px 40px rgba(0,0,0,.22)'}}>
      <p style={{fontSize:12,color:'rgba(255,255,255,.48)',fontWeight:750,marginBottom:8}}>{title}</p>
      <div style={{fontSize:24,fontWeight:950,color:'#fff',lineHeight:1}}>{value}</div>
      <p style={{fontSize:12,color,marginTop:9,fontWeight:750}}>{sub}</p>
    </div>
  );

  const MethodBadge=({w})=>{
    const s=methodBadgeStyle(w);
    return <span style={{display:'inline-flex',alignItems:'center',gap:7,background:s.bg,border:`1px solid ${s.border}`,color:s.color,borderRadius:9,padding:'6px 10px',fontSize:12,fontWeight:850,whiteSpace:'nowrap'}}>{methodLabel(w)}</span>;
  };

  const MoneyCell=({label,value,currency,color='#fff',muted=false})=>(
    <div style={{display:'grid',gap:3}}>
      {label&&<span style={{fontSize:10,color:'rgba(255,255,255,.35)',fontWeight:850,textTransform:'uppercase',letterSpacing:.4}}>{label}</span>}
      <span style={{fontSize:13,color:muted?'rgba(255,255,255,.62)':color,fontWeight:850,whiteSpace:'nowrap'}}>{fmtMoney(value,currency)}</span>
    </div>
  );

  const CopyButton=({value,label,disabled=false})=>(
    <button type="button" disabled={disabled} title={disabled?'Reveal full details to copy':`Copy ${label}`} onClick={()=>copyValue(value,label)} style={{width:30,height:30,borderRadius:9,border:`1px solid ${disabled?'rgba(255,255,255,.08)':'rgba(0,200,150,.28)'}`,background:disabled?'rgba(255,255,255,.04)':'rgba(0,200,150,.10)',color:disabled?'rgba(255,255,255,.25)':GREEN,display:'inline-flex',alignItems:'center',justifyContent:'center',cursor:disabled?'not-allowed':'pointer',flexShrink:0}}>
      <Copy size={14}/>
    </button>
  );

  const ConfirmDialog=()=>{
    if(!paidTarget&&!rejectTarget)return null;
    const target=paidTarget||rejectTarget;
    const rejecting=Boolean(rejectTarget);
    return <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#101820',border:`1px solid ${BORDER}`,borderRadius:20,padding:24,width:'min(460px,100%)',boxShadow:'0 24px 80px rgba(0,0,0,.55)'}}>
        <p style={{fontSize:18,fontWeight:950,color:'#fff',marginBottom:8}}>{rejecting?'Reject withdrawal':'Mark withdrawal as paid'}</p>
        <p style={{fontSize:13,color:'rgba(255,255,255,.58)',lineHeight:1.55,marginBottom:18}}>
          {rejecting?'Reject payout request for ':'Confirm manual payout completion for '}
          <strong style={{color:'#fff'}}>{employeeName(target)}</strong> - {fmtMoney(netPayout(target),target.currency)} via {methodLabel(target)}.
        </p>
        {rejecting&&<textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={4} placeholder="Reason sent to the employee..." style={{width:'100%',resize:'vertical',background:'rgba(255,255,255,.05)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,color:'#fff',padding:12,outline:'none',fontSize:13,marginBottom:16}}/>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
          <Button onClick={()=>{setPaidTarget(null);setRejectTarget(null);setRejectReason('');}}>Cancel</Button>
          {rejecting?<Button variant="red" onClick={handleReject} disabled={actionId===target.id}>Reject</Button>:<Button variant="green" onClick={()=>handlePaid(target)} disabled={actionId===target.id}>Mark Paid</Button>}
        </div>
      </div>
    </div>;
  };

  const DetailField=({label,value,copy=false,sensitive=false,wide=false})=>{
    const details=getPayoutDetails(detail);
    const canCopy=copy&&(!sensitive||details.revealed);
    const display=sensitive&&!details.revealed?maskedDisplay(value,label):cleanMask(value);
    return <div style={{background:'rgba(255,255,255,.035)',border:`1px solid ${BORDER}`,borderRadius:12,padding:13,gridColumn:wide?'1 / -1':'auto',minWidth:0}}>
      <div style={{fontSize:11,color:'rgba(255,255,255,.42)',fontWeight:850,textTransform:'uppercase',letterSpacing:.4,marginBottom:8}}>{label}</div>
      <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
        <span style={{fontSize:14,color:'#fff',fontWeight:750,wordBreak:'break-word',minWidth:0}}>{display}</span>
        {copy&&<CopyButton value={value} label={label} disabled={!canCopy}/>}
      </div>
    </div>;
  };

  const DetailDrawer=()=>{
    if(!detail)return null;
    const details=getPayoutDetails(detail);
    const code=countryCodeFor(detail);
    const stripeId=detail.stripe_account_id?`${String(detail.stripe_account_id).slice(0,10)}...${String(detail.stripe_account_id).slice(-4)}`:'Not linked';
    const transferId=detail.stripe_transfer_id?`${String(detail.stripe_transfer_id).slice(0,10)}...${String(detail.stripe_transfer_id).slice(-4)}`:'Not created';
    return <div style={{position:'fixed',inset:0,zIndex:9998,background:'rgba(3,7,12,.68)',display:'flex',justifyContent:'flex-end'}} onClick={()=>setDetail(null)}>
      <aside onClick={e=>e.stopPropagation()} style={{width:'min(560px,100vw)',height:'100vh',background:'#0d141b',borderLeft:`1px solid ${BORDER}`,boxShadow:'-30px 0 90px rgba(0,0,0,.52)',overflow:'auto',display:'flex',flexDirection:'column'}}>
        <div style={{position:'sticky',top:0,zIndex:2,background:'rgba(13,20,27,.96)',backdropFilter:'blur(18px)',borderBottom:`1px solid ${BORDER}`,padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <p style={{fontSize:18,fontWeight:950,color:'#fff'}}>Payout Details</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,.42)',marginTop:3}}>Operations ticket #{detail.id}</p>
          </div>
          <button type="button" onClick={()=>setDetail(null)} style={{width:34,height:34,borderRadius:10,border:`1px solid ${BORDER}`,background:'rgba(255,255,255,.05)',color:'rgba(255,255,255,.65)',cursor:'pointer',fontSize:22,lineHeight:1}}>x</button>
        </div>

        <div style={{padding:20,display:'grid',gap:16}}>
          <section style={{background:'linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025))',border:`1px solid ${BORDER}`,borderRadius:18,padding:16}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:58,height:58,borderRadius:'50%',overflow:'hidden',background:'rgba(0,255,204,.13)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 0 1px rgba(255,255,255,.12)'}}>
                {detail.photo_base64||detail.profile_image_url?<img src={detail.photo_base64||detail.profile_image_url} alt="" style={{width:58,height:58,objectFit:'cover'}}/>:<span style={{fontSize:22,fontWeight:950,color:ACCENT}}>{employeeInitial(detail)}</span>}
              </div>
              <div style={{minWidth:0,flex:1}}>
                <h2 style={{fontSize:17,color:'#fff',fontWeight:950,marginBottom:3}}>{employeeName(detail)}</h2>
                <p style={{fontSize:12,color:'rgba(255,255,255,.48)',marginBottom:9}}>{employeeHandle(detail)}{employeeEmail(detail)?` - ${employeeEmail(detail)}`:''}</p>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <CountryBadge w={code} large/>
                  <MethodBadge w={detail}/>
                  <StatusBadge status={visibleStatus(detail)}/>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:15}}>
              <div style={{background:'rgba(0,200,150,.10)',border:'1px solid rgba(0,200,150,.22)',borderRadius:13,padding:13}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,.48)',fontWeight:850,textTransform:'uppercase'}}>Net payout</p>
                <p style={{fontSize:23,color:GREEN,fontWeight:950,marginTop:4}}>{fmtMoney(netPayout(detail),detail.currency)}</p>
              </div>
              <div style={{background:'rgba(255,255,255,.035)',border:`1px solid ${BORDER}`,borderRadius:13,padding:13}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,.48)',fontWeight:850,textTransform:'uppercase'}}>Requested</p>
                <p style={{fontSize:14,color:'#fff',fontWeight:850,marginTop:6}}>{fmtDate(detail.created_at)}</p>
              </div>
            </div>
          </section>

          <section style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:18,padding:16}}>
            <h3 style={{fontSize:14,color:'#fff',fontWeight:950,marginBottom:14}}>Financial Summary</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              <MoneyCell label="Gross request" value={grossRequested(detail)} currency={detail.currency}/>
              <MoneyCell label="SnapTip fee 10%" value={feeAmount(detail)} currency={detail.currency} color={YELLOW}/>
              <MoneyCell label="Net payout" value={netPayout(detail)} currency={detail.currency} color={GREEN}/>
              <MoneyCell label="Available balance" value={availableBalance(detail)} currency={detail.currency} muted/>
              <MoneyCell label="Gross earned" value={grossEarned(detail)} currency={detail.currency} muted/>
              <div style={{fontSize:12,color:'rgba(255,255,255,.48)',lineHeight:1.6}}><strong style={{display:'block',color:'rgba(255,255,255,.75)',fontSize:11,textTransform:'uppercase',letterSpacing:.4}}>Processed</strong>{detail.processed_at?fmtDate(detail.processed_at):'Not processed yet'}</div>
            </div>
          </section>

          <section style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:18,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14}}>
              <div>
                <h3 style={{fontSize:14,color:'#fff',fontWeight:950}}>Bank / Payout Details</h3>
                <p style={{fontSize:12,color:'rgba(255,255,255,.42)',marginTop:3}}>{isWise(detail)?'Manual Wise transfer information':'Stripe Connect account summary'}</p>
              </div>
              {isWise(detail)&&<Button small variant="greenSoft" onClick={revealPayoutDetails} disabled={revealing||details.revealed}>{details.revealed?'Full details shown':revealing?'Revealing...':'Reveal full details'}</Button>}
            </div>
            {isWise(detail)?<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              <DetailField label="Bank name" value={details.bankName} copy/>
              <DetailField label="Account holder" value={details.accountHolder} copy/>
              <DetailField label="RIB / Account / IBAN" value={details.accountNumber} copy sensitive wide/>
              <DetailField label="Contact email" value={details.email} copy sensitive/>
              <DetailField label="Phone" value={details.phone} copy sensitive/>
              <DetailField label="Address" value={details.address} copy sensitive wide/>
              <DetailField label="Country" value={`${details.country} / ${detail.country||ISO_TO_COUNTRY[details.country]||'Country'}`}/>
              <DetailField label="Currency" value={details.currency}/>
            </div>:<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>
              <DetailField label="Stripe account" value={stripeId} copy={Boolean(detail.stripe_account_id)}/>
              <DetailField label="Transfer id" value={transferId} copy={Boolean(detail.stripe_transfer_id)}/>
              <DetailField label="Payout status" value={detail.payout_status||detail.status}/>
              <DetailField label="Method" value="Stripe Express"/>
            </div>}
          </section>

          <section style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:18,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:10}}>
              <h3 style={{fontSize:14,color:'#fff',fontWeight:950}}>Internal Notes</h3>
              <span style={{fontSize:11,color:'rgba(255,255,255,.35)'}}>Visible to admins only</span>
            </div>
            <textarea value={adminNotes} onChange={e=>setAdminNotes(e.target.value)} rows={5} placeholder="Add processing notes, Wise reference, or rejection context..." style={{width:'100%',background:'rgba(255,255,255,.045)',border:`1px solid ${BORDER}`,borderRadius:13,color:'#fff',padding:13,outline:'none',fontSize:13,resize:'vertical',lineHeight:1.5}}/>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}><Button small variant="greenSoft" onClick={handleSaveNote}>Save Note</Button></div>
          </section>
        </div>

        <div style={{position:'sticky',bottom:0,background:'rgba(13,20,27,.96)',backdropFilter:'blur(18px)',borderTop:`1px solid ${BORDER}`,padding:16,display:'flex',gap:10,justifyContent:'flex-end',flexWrap:'wrap'}}>
          <Button onClick={()=>setDetail(null)}>Close</Button>
          {isPending(detail)&&<Button variant="redSoft" onClick={()=>{setRejectTarget(detail);setRejectReason('');}}>Reject</Button>}
          {isManualPending(detail)&&<Button variant="green" onClick={()=>setPaidTarget(detail)}>Mark as Paid</Button>}
        </div>
      </aside>
    </div>;
  };

  return <div style={{background:BG,border:`1px solid ${BORDER}`,borderRadius:22,padding:22,boxShadow:'0 24px 80px rgba(0,0,0,.22)'}}>
    <style>{`
      @media(max-width:1200px){.withdrawals-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.withdrawals-toolbar{align-items:stretch!important}.withdrawals-search{min-width:100%!important}}
      @media(max-width:720px){.withdrawals-stats{grid-template-columns:1fr!important}.withdrawals-filters{gap:8px!important}.withdrawals-filters button,.withdrawals-filters select{flex:1 1 140px}.withdrawals-drawer-grid{grid-template-columns:1fr!important}}
    `}</style>
    <ConfirmDialog/>
    <DetailDrawer/>

    <div className="withdrawals-toolbar" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:18,flexWrap:'wrap',marginBottom:20}}>
      <div>
        <h1 style={{fontSize:30,fontWeight:950,color:'#fff',letterSpacing:0}}>Manual Payouts</h1>
        <p style={{fontSize:14,color:'rgba(255,255,255,.52)',marginTop:6}}>Review, verify, and process employee withdrawal requests.</p>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <div className="withdrawals-search" style={{position:'relative',minWidth:340,flex:'1 1 340px'}}>
          <span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.35)'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, username, or email..." style={{width:'100%',height:46,background:'#111820',border:`1px solid ${BORDER}`,borderRadius:12,color:'#fff',outline:'none',padding:'0 14px 0 42px',fontSize:14}}/>
        </div>
        <Button variant="greenSoft" onClick={exportWiseCSV} style={{height:46}}>Export Wise CSV</Button>
      </div>
    </div>

    <div className="withdrawals-filters" style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:18}}>
      <span style={{fontSize:13,color:'rgba(255,255,255,.64)',fontWeight:850,marginRight:2}}>Status</span>
      <FilterChip value="all" label="All"/>
      <FilterChip value="pending" label="Pending"/>
      <FilterChip value="paid" label="Paid"/>
      <FilterChip value="rejected" label="Rejected"/>
      <FilterChip value="failed" label="Failed"/>
      <select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)} style={{height:40,background:'#111820',border:`1px solid ${BORDER}`,borderRadius:12,color:'rgba(255,255,255,.78)',padding:'0 14px',fontSize:13,fontWeight:750,outline:'none'}}>
        <option value="all" style={{background:'#111820'}}>All methods</option>
        <option value="wise_manual" style={{background:'#111820'}}>Wise Manual</option>
        <option value="stripe_connect" style={{background:'#111820'}}>Stripe Connect</option>
      </select>
      <select value={countryFilter} onChange={e=>setCountryFilter(e.target.value)} style={{height:40,background:'#111820',border:`1px solid ${BORDER}`,borderRadius:12,color:'rgba(255,255,255,.78)',padding:'0 14px',fontSize:13,fontWeight:750,outline:'none'}}>
        {countries.map(c=><option key={c} value={c} style={{background:'#111820'}}>{c==='all'?'All countries':c}</option>)}
      </select>
      {(filter!=='all'||methodFilter!=='all'||countryFilter!=='all'||search)&&<Button small onClick={()=>{setFilter('all');setMethodFilter('all');setCountryFilter('all');setSearch('');}}>Clear Filters</Button>}
    </div>

    <div className="withdrawals-stats" style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(160px,1fr))',gap:12,marginBottom:18}}>
      <SummaryCard title="Pending Requests" value={summary.pending.length} sub={`${summary.manualPending.length} Wise Manual`} color={YELLOW}/>
      <SummaryCard title="Total Pending Amount" value={summary.pendingCurrency==='mixed'?Number(summary.pendingTotal||0).toFixed(2):fmtMoney(summary.pendingTotal,summary.pendingCurrency)} sub={summary.pendingCurrency==='mixed'?'Mixed currencies':'Gross requests'} color="rgba(255,255,255,.48)"/>
      <SummaryCard title="Paid Today" value={summary.paidToday.length} sub="Completed tickets" color={GREEN}/>
      <SummaryCard title="Needs Attention" value={summary.rejected.length} sub="Rejected or failed" color={RED}/>
    </div>

    <div style={{background:PANEL,border:`1px solid ${BORDER}`,borderRadius:16,overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:'18px 18px 0'}}>
        <div>
          <h2 style={{fontSize:18,color:'#fff',fontWeight:950}}>Withdrawal Requests ({filtered.length})</h2>
          <p style={{fontSize:12,color:'rgba(255,255,255,.42)',marginTop:4}}>Pending manual payouts are sorted first.</p>
        </div>
      </div>
      {loading?<div style={{padding:48,textAlign:'center',color:'rgba(255,255,255,.48)'}}>Loading withdrawal requests...</div>:
      <div style={{overflow:'auto',padding:12}}>
        <table style={{minWidth:1260,borderCollapse:'separate',borderSpacing:'0 8px'}}>
          <thead><tr>
            <th style={{borderBottom:'none'}}>Employee</th>
            <th style={{borderBottom:'none'}}>Country</th>
            <th style={{borderBottom:'none'}}>Payout Method</th>
            <th style={{borderBottom:'none'}}>Gross Earned</th>
            <th style={{borderBottom:'none'}}>SnapTip Fee</th>
            <th style={{borderBottom:'none'}}>Net Payout</th>
            <th style={{borderBottom:'none'}}>Available Balance</th>
            <th style={{borderBottom:'none'}}>Requested Amount</th>
            <th style={{borderBottom:'none'}}>Status</th>
            <th style={{borderBottom:'none'}}>Requested Date</th>
            <th style={{borderBottom:'none',textAlign:'right'}}>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(w=>{
              const pendingManual=isManualPending(w);
              return <tr key={w.id} onClick={()=>openDetail(w)} style={{cursor:'pointer',background:pendingManual?'rgba(0,200,150,.075)':'rgba(255,255,255,.028)',outline:pendingManual?'1px solid rgba(0,200,150,.38)':`1px solid ${BORDER}`,boxShadow:pendingManual?'0 0 0 1px rgba(0,200,150,.08), 0 12px 28px rgba(0,0,0,.18)':'none'}}>
                <td style={{borderBottom:'none',padding:'13px 14px',borderTopLeftRadius:12,borderBottomLeftRadius:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:11,minWidth:220}}>
                    <div style={{width:42,height:42,borderRadius:'50%',overflow:'hidden',background:'rgba(0,255,204,.13)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {w.photo_base64||w.profile_image_url?<img src={w.photo_base64||w.profile_image_url} alt="" style={{width:42,height:42,objectFit:'cover'}}/>:<span style={{fontSize:15,fontWeight:950,color:ACCENT}}>{employeeInitial(w)}</span>}
                    </div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:14,color:'#fff',fontWeight:950,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{employeeName(w)}</div>
                      <div style={{fontSize:12,color:'rgba(255,255,255,.42)',marginTop:2}}>{employeeHandle(w)}</div>
                    </div>
                  </div>
                </td>
                <td style={{borderBottom:'none'}}><CountryBadge w={w}/></td>
                <td style={{borderBottom:'none'}}><MethodBadge w={w}/><div style={{fontSize:11,color:'rgba(255,255,255,.35)',marginTop:6}}>{String(w.withdrawal_source||'manual').replace(/_/g,' ')}{w.schedule_period_key?` - ${w.schedule_period_key}`:''}</div></td>
                <td style={{borderBottom:'none'}}><MoneyCell value={grossEarned(w)} currency={w.currency} muted/></td>
                <td style={{borderBottom:'none'}}><MoneyCell value={feeAmount(w)} currency={w.currency} color={YELLOW}/></td>
                <td style={{borderBottom:'none'}}><MoneyCell value={netPayout(w)} currency={w.currency} color={GREEN}/></td>
                <td style={{borderBottom:'none'}}><MoneyCell value={availableBalance(w)} currency={w.currency} muted/></td>
                <td style={{borderBottom:'none'}}><MoneyCell value={grossRequested(w)} currency={w.currency}/></td>
                <td style={{borderBottom:'none'}}><StatusBadge status={visibleStatus(w)}/></td>
                <td style={{borderBottom:'none',fontSize:12,color:'rgba(255,255,255,.58)',whiteSpace:'nowrap'}}>{fmtDate(w.created_at)}</td>
                <td style={{borderBottom:'none',textAlign:'right',borderTopRightRadius:12,borderBottomRightRadius:12}}>
                  <div style={{display:'inline-flex',gap:8,alignItems:'center'}}>
                    <Button small onClick={()=>openDetail(w)}>View</Button>
                    {pendingManual&&<Button small variant="green" disabled={actionId===w.id} onClick={()=>setPaidTarget(w)}>Mark Paid</Button>}
                    {isPending(w)&&<Button small variant="redSoft" disabled={actionId===w.id} onClick={()=>{setRejectTarget(w);setRejectReason('');}}>Reject</Button>}
                  </div>
                </td>
              </tr>;
            })}
            {!filtered.length&&<tr><td colSpan={11} style={{borderBottom:'none',padding:54,textAlign:'center',color:'rgba(255,255,255,.45)'}}>No withdrawal requests match these filters.</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  </div>;
}
