import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function SuccessScreen({ amount, employeeName, onClose }) {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.6 },
        colors: ['#00C896', '#00a87d', '#34d399', '#6ee7b7', '#fbbf24', '#a855f7'],
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.6 },
        colors: ['#00C896', '#00a87d', '#34d399', '#6ee7b7', '#fbbf24', '#a855f7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse at bottom left, rgba(120,0,180,0.4) 0%, transparent 60%),
          radial-gradient(ellipse at bottom right, rgba(80,0,160,0.3) 0%, transparent 60%),
          #080818
        `,
        padding: '20px',
      }}
    >
      {/* Green checkmark circle — 80px */}
      <div
        className="flex items-center justify-center"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#00C896',
          boxShadow: '0 0 30px rgba(0, 200, 150, 0.4)',
          marginBottom: '24px',
        }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', textAlign: 'center' }}>
        Tip Sent! 🎉
      </h2>

      {/* Description */}
      <p style={{ fontSize: '16px', color: '#9ca3af', textAlign: 'center', marginBottom: '40px' }}>
        You tipped <span style={{ color: '#ffffff', fontWeight: 600 }}>${amount}</span> to <span style={{ color: '#ffffff', fontWeight: 600 }}>{employeeName}</span>
      </p>

      {/* Done button — full width, gradient */}
      <button
        onClick={onClose}
        className="cursor-pointer active:scale-95"
        style={{
          width: '100%',
          maxWidth: '350px',
          height: '56px',
          borderRadius: '50px',
          background: 'linear-gradient(135deg, #4facfe 0%, #a855f7 100%)',
          boxShadow: '0 8px 32px rgba(168,85,247,0.5)',
          border: 'none',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: 700,
          transition: 'all 0.2s ease',
        }}
      >
        Done ✨
      </button>
    </div>
  );
}
