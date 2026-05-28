import React from 'react';

interface ZeroGuardLogoProps {
  className?: string;
  size?: number;
}

/**
 * ZeroGuard brand logo — a stylized cyber-shield with integrated checkmark.
 * Replaces the generic Hexagon icon from lucide-react.
 */
export default function ZeroGuardLogo({ className = '', size = 32 }: ZeroGuardLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-label="ZeroGuard Logo"
    >
      <defs>
        <linearGradient id="zg-shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="1" />
          <stop offset="100%" stopColor="#00A3CC" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="zg-inner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.05" />
        </linearGradient>
        <filter id="zg-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Shield outline */}
      <path
        d="M32 4L8 16v16c0 14.4 10.24 27.84 24 32 13.76-4.16 24-17.6 24-32V16L32 4z"
        stroke="url(#zg-shield-gradient)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="url(#zg-inner-gradient)"
      />

      {/* Inner shield accent line */}
      <path
        d="M32 11L13 20.5v12.5c0 11.5 8.1 22.2 19 25.5 10.9-3.3 19-14 19-25.5V20.5L32 11z"
        stroke="url(#zg-shield-gradient)"
        strokeWidth="0.75"
        strokeLinejoin="round"
        strokeOpacity="0.3"
        fill="none"
      />

      {/* Checkmark / verification mark */}
      <path
        d="M22 33l7 7 13-14"
        stroke="url(#zg-shield-gradient)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#zg-glow)"
      />

      {/* Digital circuit dots */}
      <circle cx="18" cy="24" r="1.5" fill="#00D4FF" opacity="0.5" />
      <circle cx="46" cy="24" r="1.5" fill="#00D4FF" opacity="0.5" />
      <circle cx="32" cy="52" r="1.5" fill="#00D4FF" opacity="0.4" />
    </svg>
  );
}
