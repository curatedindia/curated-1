import React from 'react';

/**
 * Curated Official Brand Logo
 * Features the signature white clothes hanger on a sleek black rounded square.
 */
export default function CuratedLogo({
  size = 32,
  hangerSize = 20,
  showText = false,
  textColor = '#121212',
  textSize = 'clamp(20px, 4.5vw, 24px)',
  className = ''
}) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      {/* Black Square with Crisp White Clothes Hanger */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: '#000000',
          borderRadius: `${Math.max(5, Math.round(size * 0.18))}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
        }}
      >
        <svg
          width={hangerSize}
          height={hangerSize}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: 'block' }}
        >
          {/* Top Hook Arc */}
          <path
            d="M12 9.2V6.8a2.5 2.5 0 0 1 2.5-2.5c1.4 0 2.5 1.1 2.5 2.5"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Symmetrical Triangular Frame & Horizontal Bottom Bar */}
          <path
            d="M12 9.2L20.4 15.4a1.6 1.6 0 0 1-.95 2.8H4.55a1.6 1.6 0 0 1-.95-2.8L12 9.2z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: textSize,
            fontWeight: 800,
            letterSpacing: '0.14em',
            color: textColor,
            lineHeight: 1,
            textTransform: 'uppercase'
          }}
        >
          CURATED
        </span>
      )}
    </div>
  );
}

