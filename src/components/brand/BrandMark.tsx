import type { CSSProperties } from 'react';
import './brand-motion.css';

type BrandMarkProps = {
  variant?: 'mark' | 'badge';
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
  motion = 'none',
  className = '',
  style,
  decorative = true,
}: BrandMarkProps) {
  const classes = `brand-mark brand-mark--${variant} brand-mark--${motion} ${className}`.trim();
  const aria = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': 'شعار سوبر ماركو' };

  if (motion !== 'reveal') {
    return (
      <span className={classes} style={style} {...aria}>
        <img
          src={variant === 'badge' ? '/brand/super-marko-badge.svg' : '/brand/super-marko-mark.svg'}
          alt=""
          draggable={false}
          decoding="async"
          width={variant === 'badge' ? 321 : 121}
          height={variant === 'badge' ? 320 : 161}
        />
      </span>
    );
  }

  if (variant === 'mark') {
    return (
      <span className={classes} style={style} {...aria}>
        <svg viewBox="0 0 121 161" fill="none" aria-hidden="true">
          <path className="brand-mark__stroke brand-mark__stroke--1" pathLength={100} d="M8 23.0552V107.166C8 116.555 15.6112 124.166 25 124.166H84.2226" stroke="#005931" strokeWidth="8" strokeLinecap="round"/>
          <path className="brand-mark__stroke brand-mark__stroke--2" pathLength={100} d="M8 22.6663H96.0005C105.389 22.6663 113.001 30.2775 113.001 39.6663V148.666" stroke="#FFC120" strokeWidth="8" strokeLinecap="round"/>
          <path className="brand-mark__stroke brand-mark__stroke--3" pathLength={100} d="M84.2205 124.182L113.001 148.667" stroke="#005931" strokeWidth="8" strokeLinecap="round"/>
          <path className="brand-mark__stroke brand-mark__stroke--4" pathLength={100} d="M38.3335 63.8893C38.3335 87.2226 82.2782 89.1671 82.2782 63.8893" stroke="#005931" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
          <path className="brand-mark__stroke brand-mark__stroke--5" pathLength={100} d="M82.2782 22.2364C82.2782 -1.09694 38.3335 -3.04139 38.3335 22.2364" stroke="#FFC120" strokeWidth="8" strokeLinecap="round" strokeLinejoin="bevel"/>
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
