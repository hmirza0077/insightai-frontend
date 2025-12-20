import React from 'react';

const Logo = ({ size = 48, className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-labelledby="logoTitle logoDesc"
    >
      <title id="logoTitle">Insight Eye</title>
      <desc id="logoDesc">Eye with a small page icon as the pupil</desc>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* eye */}
        <path d="M12 60 C32 20, 88 20, 108 60 C88 100, 32 100, 12 60 Z" />
        {/* pupil page */}
        <rect x="48" y="46" width="24" height="28" rx="2" fill="currentColor" />
        <line x1="54" y1="56" x2="66" y2="56" stroke="#fff" strokeWidth="2" />
        <line x1="54" y1="64" x2="66" y2="64" stroke="#fff" strokeWidth="2" />
      </g>
    </svg>
  );
};

export default Logo;




