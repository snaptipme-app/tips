import React from 'react';

const LOGO_SRC = '/snaptip_icon.png?v=black-20260524';

const SIZES = {
  small: 24,
  medium: 32,
  large: 48,
};

export default function Logo({
  size = 'medium',
  color = '#00C896',
  showText = false,
  href,
  className = '',
  textColor = 'currentColor',
}) {
  const dim = typeof size === 'number' ? size : SIZES[size] || 32;
  const icon = (
    <span
      className="snaptip-logo-icon"
      style={{
        width: dim,
        height: dim,
        minWidth: dim,
        borderRadius: Math.max(8, Math.round(dim * 0.28)),
        background: '#000000',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <img
        src={LOGO_SRC}
        alt=""
        aria-hidden="true"
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
      />
    </span>
  );

  if (showText || href) {
    const Component = href ? 'a' : 'span';
    return (
      <Component
        href={href}
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          color: textColor,
          textDecoration: 'none',
        }}
        aria-label={href ? 'SnapTip home' : undefined}
      >
        {icon}
        {showText && <span className="snaptip-logo-wordmark">SnapTip</span>}
      </Component>
    );
  }

  return icon;
}

export function BoltLogo({ size = 'medium', color = '#00C896' }) {
  const dim = typeof size === 'number' ? size : SIZES[size] || 32;
  return (
    <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 2L4.09 12.64a1 1 0 00.78 1.62H11v5.49a.5.5 0 00.9.31L20.91 9.36a1 1 0 00-.78-1.62H13V2.25a.5.5 0 00-.9-.31L13 2z"
        fill={color}
      />
    </svg>
  );
}
