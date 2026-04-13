import { useOutletContext } from 'react-router-dom';

const DollarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const CardIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="22" height="16" x="1" y="4" rx="2" ry="2" /><path d="M1 10h22" />
  </svg>
);

const QrCodeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" />
  </svg>
);

const tipIcons = [DollarIcon, CardIcon, DollarIcon, DollarIcon, CardIcon, DollarIcon];

function EmptyTips() {
  return (
    <div className="flex flex-col items-center text-center" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      <div className="flex items-center justify-center" style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: 'rgba(80, 120, 255, 0.1)',
        border: '1px solid rgba(80, 120, 255, 0.2)',
        color: '#5577ff',
        marginBottom: '20px',
      }}>
        <QrCodeIcon />
      </div>
      <p style={{ color: '#ffffff', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No tips yet</p>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', maxWidth: '260px', lineHeight: '1.5' }}>
        Your tip history is empty right now. Share your QR code to start receiving tips!
      </p>
    </div>
  );
}

export default function Tips() {
  const { data } = useOutletContext();
  const tips = data?.recent_tips || [];

  return (
    <div className="animate-fadeIn w-full" style={{ padding: '24px 16px 16px' }}>
      {/* Title */}
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', textAlign: 'center', marginBottom: '24px' }}>
        Tip Transactions
      </h1>

      {tips.length > 0 ? (
        <div className="flex flex-col" style={{ gap: '8px' }}>
          {tips.map((tip, index) => {
            const amount = Number.isFinite(Number(tip.amount)) ? Number(tip.amount) : 0;
            const IconComponent = tipIcons[index % tipIcons.length];
            const isEven = index % 2 === 0;

            return (
              <div
                key={tip.id}
                className="flex items-center justify-between"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Left: icon + text */}
                <div className="flex items-center" style={{ gap: '12px', minWidth: 0, flex: 1 }}>
                  {/* Icon square 44x44, radius 12 */}
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isEven ? 'rgba(120, 90, 255, 0.2)' : 'rgba(80, 120, 255, 0.2)',
                      color: isEven ? '#a78bfa' : '#60a5fa',
                    }}
                  >
                    <IconComponent />
                  </div>
                  {/* Text: Tip Received + date */}
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Tip Received
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {new Date(tip.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()},{' '}
                      {new Date(tip.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Right: amount */}
                <div className="flex-shrink-0" style={{ marginLeft: '8px' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#00C896' }}>
                    +${amount.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyTips />
      )}
    </div>
  );
}
