import { useRef } from 'react';

export default function OtpInput({ value = '', onChange }) {
  const inputsRef = useRef([]);

  const handleChange = (e, idx) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.split('').concat(Array(6).fill('')).slice(0, 6);
    arr[idx] = char;
    const next = arr.join('');
    onChange(next);
    if (char && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      const arr = value.split('').concat(Array(6).fill('')).slice(0, 6);
      if (!arr[idx] && idx > 0) {
        arr[idx - 1] = '';
        onChange(arr.join(''));
        inputsRef.current[idx - 1]?.focus();
      } else {
        arr[idx] = '';
        onChange(arr.join(''));
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted.padEnd(6, ''));
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center" style={{ gap: '10px', margin: '12px 0' }} onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => (inputsRef.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ''}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onFocus={(e) => e.target.select()}
          style={{
            width: '46px',
            height: '54px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 700,
            borderRadius: '14px',
            outline: 'none',
            background: 'rgba(255,255,255,0.06)',
            border: value[idx] ? '2px solid #00C896' : '2px solid rgba(255,255,255,0.1)',
            color: '#ffffff',
            boxShadow: value[idx] ? '0 0 12px rgba(0,200,150,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        />
      ))}
    </div>
  );
}
