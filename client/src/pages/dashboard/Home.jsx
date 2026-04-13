import { useRef, useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

function getPhotoSrc(employee) {
  if (!employee) return '';
  if (employee.photo_base64) return employee.photo_base64;
  if (employee.profile_image_url && employee.profile_image_url.startsWith('/')) return `http://localhost:5000${employee.profile_image_url}`;
  if (employee.profile_image_url) return employee.profile_image_url;
  if (employee.photo_url && employee.photo_url.startsWith('/')) return `http://localhost:5000${employee.photo_url}`;
  if (employee.photo_url) return employee.photo_url;
  return '';
}

const CopyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="13" height="13" x="9" y="9" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" />
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

const BoltIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
    <path d="M13 2L4 14h7v8l9-12h-7V2z" fill="#7c5cfc" />
  </svg>
);

export default function Home() {
  const { user, data, loadError, fetchDashboard } = useOutletContext();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const qrCardRef = useRef(null);

  const balance = Number.isFinite(Number(user?.balance)) ? Number(user.balance) : 0;
  const totalTips = Number.isFinite(Number(data?.total_tips)) ? Number(data.total_tips) : 0;

  const tipPageUrl = `https://snaptip.me/${user?.username}`;
  const localUrl = `http://localhost:5173/${user?.username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(localUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = useCallback(async () => {
    const el = qrCardRef.current;
    if (!el) return;
    // Temporarily show the hidden card for capture
    el.style.display = 'flex';
    try {
      const canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        allowTaint: true,
      });
      const link = document.createElement('a');
      link.download = `snaptip-qr-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('QR card generation error:', err);
    } finally {
      el.style.display = 'none';
    }
  }, [user]);

  const photoSrc = getPhotoSrc(user);
  const initials = (user?.full_name || 'U').charAt(0).toUpperCase();

  return (
    <div className="animate-fadeIn w-full" style={{ padding: '16px', paddingTop: '20px' }}>

      {/* ── Header: bolt + Snaptip  |  @username + avatar ── */}
      <header className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <BoltIcon />
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>Snaptip</span>
        </div>
        <div className="flex items-center" style={{ gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>@{user?.username}</span>
          <div className="overflow-hidden flex-shrink-0" style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)' }}>
            {photoSrc ? (
              <img src={photoSrc} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full font-bold" style={{ color: '#5577ff', fontSize: '14px' }}>{initials}</span>
            )}
          </div>
        </div>
      </header>

      {loadError && (
        <div style={{ borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 500, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.15)', marginBottom: '16px' }}>
          <p style={{ marginBottom: '10px', wordBreak: 'break-word' }}>{loadError}</p>
          <button onClick={fetchDashboard} style={{ width: '100%', background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            Retry Connection
          </button>
        </div>
      )}

      {/* ── Balance Card ── */}
      <div className="relative overflow-hidden" style={{
        borderRadius: '18px',
        padding: '20px',
        background: 'linear-gradient(135deg, #12123a 0%, #2a0a4a 50%, #3a0a5a 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '20px',
      }}>
        {/* Purple blob on right side */}
        <div className="absolute" style={{ right: '-20px', top: '-20px', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, rgba(120,60,200,0.15) 50%, transparent 75%)', filter: 'blur(10px)' }} />
        <div className="absolute" style={{ right: '15px', top: '15px', width: '90px', height: '90px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,100,255,0.25) 0%, transparent 65%)', filter: 'blur(5px)' }} />

        <div className="relative z-10">
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Available Balance</p>
          <p style={{ fontSize: '36px', fontWeight: 800, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: '12px' }}>
            ${balance.toFixed(2)}
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>Total Earnings</p>
          <p style={{ fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>${totalTips.toFixed(2)}</p>
        </div>
      </div>

      {/* ── QR Code Section ── */}
      <div className="flex justify-center" style={{ marginBottom: '20px' }}>
        <div
          ref={qrRef}
          className="animate-neon-pulse"
          style={{
            width: '80%',
            borderRadius: '18px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '2px solid rgba(80, 120, 255, 0.4)',
            boxShadow: '0 0 30px rgba(80, 120, 255, 0.6)',
          }}
        >
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px', display: 'inline-flex' }}>
            <QRCodeSVG value={tipPageUrl} size={180} fgColor="#000000" bgColor="#ffffff" level="H" />
          </div>
        </div>
      </div>

      {/* ── URL Pill ── */}
      <div style={{
        width: '100%',
        borderRadius: '50px',
        padding: '14px 20px',
        textAlign: 'center',
        background: 'rgba(255,255,255,0.08)',
        marginBottom: '12px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>snaptip.me/{user?.username}</span>
      </div>

      {/* ── Two Buttons Row ── */}
      <div className="flex" style={{ gap: '10px' }}>
        <button
          onClick={handleCopyLink}
          className="flex items-center justify-center flex-1 cursor-pointer active:scale-95"
          style={{
            height: '48px',
            borderRadius: '50px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy Link</>}
        </button>
        <button
          onClick={downloadQR}
          className="flex items-center justify-center flex-1 cursor-pointer active:scale-95"
          style={{
            height: '48px',
            borderRadius: '50px',
            background: '#5577ff',
            border: 'none',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
        >
          <DownloadIcon /> Download QR
        </button>
      </div>

      {/* ══════ Hidden QR Card — premium gradient design ══════ */}
      <div
        ref={qrCardRef}
        style={{
          display: 'none',
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '400px',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'linear-gradient(165deg, #1a1a4e 0%, #2d1463 40%, #3d1a6e 70%, #5b2d8e 100%)',
          borderRadius: '32px',
          padding: '48px 40px 40px 40px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Top text */}
        <p style={{
          color: 'rgba(255,255,255,0.85)',
          fontSize: '26px',
          fontWeight: 700,
          textAlign: 'center',
          lineHeight: 1.3,
          marginBottom: '4px',
        }}>
          Enjoyed the service?
        </p>
        <p style={{
          color: '#ffffff',
          fontSize: '30px',
          fontWeight: 800,
          textAlign: 'center',
          lineHeight: 1.3,
          marginBottom: '36px',
        }}>
          Leave a tip 💙
        </p>

        {/* QR code in white rounded box with glow */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '24px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 40px rgba(140, 160, 255, 0.35), 0 0 80px rgba(140, 160, 255, 0.15)',
          marginBottom: '32px',
        }}>
          <QRCodeSVG value={tipPageUrl} size={220} fgColor="#000000" bgColor="#ffffff" level="H" />
        </div>

        {/* Scan to tip */}
        <p style={{
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '32px',
          letterSpacing: '0.01em',
        }}>
          Scan to tip
        </p>

        {/* Bottom branding */}
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '13px',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '2px',
        }}>
          Powered by SnapTip
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: '12px',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          snaptip.me
        </p>
      </div>
    </div>
  );
}
