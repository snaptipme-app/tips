import React from 'react';

const SIZES = {
  small: 24,
  medium: 32,
  large: 48,
};

export default function Logo({ size = 'medium', color = '#00C896' }) {
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
