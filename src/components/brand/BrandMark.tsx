import { useId, type CSSProperties } from 'react';
import './brand-motion.css';

type BrandMarkProps = {
  variant?: 'mark' | 'badge';
  tone?: 'default' | 'onGreen';
  motion?: 'none' | 'reveal' | 'pop';
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
};

/** Exact geometry and official colors from the supplied SVG artwork.
 * Static rendering uses the original files; the entrance version only
 * animates their individual strokes, without rasterization or SVG filters. */
export default function BrandMark({
  variant = 'mark',
  tone = 'default',
  motion = 'none',
  className = '',
  style,
  decorative = true,
}: BrandMarkProps) {
  const filterId = `brand-on-green-shadow-${useId().replace(/:/g, '')}`;
  const classes = `brand-mark brand-mark--${variant} brand-mark--${tone === 'onGreen' ? 'on-green' : 'default'} brand-mark--${motion} ${className}`.trim();
  const aria = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': 'شعار سوبر ماركو' };

  if (motion !== 'reveal') {
    return (
      <span className={classes} style={style} {...aria}>
        <img
          src={variant === 'badge' ? '/brand/super-marko-badge.svg' : tone === 'onGreen' ? '/brand/super-marko-mark-on-green.svg' : '/brand/super-marko-mark.svg'}
          alt=""
          draggable={false}
          decoding="async"
          width={variant === 'badge' ? 321 : 165}
          height={variant === 'badge' ? 320 : 219}
        />
      </span>
    );
  }

  // Exact five paths from the supplied white/yellow on-green artwork.
  // Keep path geometry and the original drop shadow, while reusing the same
  // stroke classes so BrandLoader's trace timing matches the light variant.
  if (variant === 'mark' && tone === 'onGreen') {
    return (
      <span className={classes} style={style} {...aria}>
        <svg viewBox="0 0 165 219" fill="none" aria-hidden="true">
          <defs>
            <filter id={filterId} x="0" y="0" width="164.465" height="218.661" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="2" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            <path className="brand-mark__stroke brand-mark__stroke--1" pathLength={100} d="M10.5 32.535V153.686C10.5 163.074 18.1112 170.686 27.5 170.686H114.644" stroke="#FFC120" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--2" pathLength={100} d="M10.5 32.0039H136.964C146.353 32.0039 153.964 39.6151 153.964 49.0039V204.161" stroke="white" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--3" pathLength={100} d="M114.642 170.707L153.964 204.161" stroke="#FFC120" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--4" pathLength={100} d="M51.9445 88.3274C51.9445 120.208 111.987 122.865 111.987 88.3274" stroke="#FFC120" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
            <path className="brand-mark__stroke brand-mark__stroke--5" pathLength={100} d="M111.988 31.4169C111.988 -0.464045 51.9454 -3.12079 51.9454 31.4169" stroke="white" strokeWidth={13} strokeLinecap="round" strokeLinejoin="bevel" />
          </g>
        </svg>
      </span>
    );
  }

  // Official light-background artwork (Group 139): same geometry as the
  // on-green mark, green + yellow strokes, with its soft drop shadow.
  if (variant === 'mark') {
    return (
      <span className={classes} style={style} {...aria}>
        <svg viewBox="0 0 165 219" fill="none" aria-hidden="true">
          <defs>
            <filter id={filterId} x="0" y="0" width="164.465" height="218.661" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="2" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            <path className="brand-mark__stroke brand-mark__stroke--1" pathLength={100} d="M10.5 32.535V153.686C10.5 163.074 18.1112 170.686 27.5 170.686H114.644" stroke="#005931" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--2" pathLength={100} d="M10.5 32.004H136.964C146.353 32.004 153.964 39.6151 153.964 49.004V204.161" stroke="#FFC120" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--3" pathLength={100} d="M114.642 170.707L153.964 204.161" stroke="#005931" strokeWidth={13} strokeLinecap="round" />
            <path className="brand-mark__stroke brand-mark__stroke--4" pathLength={100} d="M51.9445 88.3275C51.9445 120.208 111.987 122.865 111.987 88.3275" stroke="#005931" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
            <path className="brand-mark__stroke brand-mark__stroke--5" pathLength={100} d="M111.988 31.4169C111.988 -0.464026 51.9454 -3.12077 51.9454 31.4169" stroke="#FFC120" strokeWidth={13} strokeLinecap="round" strokeLinejoin="bevel" />
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span className={classes} style={style} {...aria}>
      <svg viewBox="0 0 321 320" fill="none" aria-hidden="true">
        <rect x="0" y="0" width="320.988" height="320" rx="20" fill="#005931" />
        <path className="brand-mark__stroke brand-mark__stroke--1" pathLength={100} d="M88.4893 87.0349V208.185C88.4893 217.574 96.1004 225.185 105.489 225.185H192.634" stroke="#FFC120" strokeWidth="13" strokeLinecap="round" />
        <path className="brand-mark__stroke brand-mark__stroke--2" pathLength={100} d="M88.4893 86.5038H214.953C224.342 86.5038 231.953 94.115 231.953 103.504V258.661" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
        <path className="brand-mark__stroke brand-mark__stroke--3" pathLength={100} d="M192.631 225.207L231.954 258.661" stroke="#FFC120" strokeWidth="13" strokeLinecap="round" />
        <path className="brand-mark__stroke brand-mark__stroke--4" pathLength={100} d="M129.934 142.827C129.934 174.708 189.976 177.365 189.976 142.827" stroke="#FFC120" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
        <path className="brand-mark__stroke brand-mark__stroke--5" pathLength={100} d="M189.977 85.9167C189.977 54.0358 129.935 51.3791 129.935 85.9167" stroke="#fff" strokeWidth="13" strokeLinecap="round" strokeLinejoin="bevel" />
      </svg>
    </span>
  );
}
