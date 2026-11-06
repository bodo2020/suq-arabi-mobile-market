import type { SVGProps } from 'react';

type BrandBagIconProps = Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> & {
  size?: number;
  strokeWidth?: number;
  /** Colour for the handle and the smile (the gold parts of the logo). */
  accent?: string;
};

/**
 * The Super Marko bag drawn as a line icon (same strokes as the logo), so the
 * cart can use the brand itself instead of a generic trolley. The body uses
 * currentColor; the handle and smile take `accent` (gold when active).
 */
export default function BrandBagIcon({
  size = 24,
  strokeWidth = 2,
  accent = 'currentColor',
  className,
  ...props
}: BrandBagIconProps) {
  // The logo's stroke is drawn in a ~121x161 box; scale the stroke so it
  // matches lucide icons drawn at `strokeWidth` in a 24px box.
  const width = strokeWidth * 6.2;
  return (
    <svg
      width={size}
      height={size}
      viewBox="-6 -10 133 172"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <path d="M8 23.06V107.17C8 116.56 15.61 124.17 25 124.17H84.22" stroke="currentColor" strokeWidth={width} />
      <path d="M8 22.67H96C105.39 22.67 113 30.28 113 39.67V148.67" stroke="currentColor" strokeWidth={width} />
      <path d="M84.22 124.18L113 148.67" stroke="currentColor" strokeWidth={width} />
      <path d="M38.33 63.89C38.33 87.22 82.28 89.17 82.28 63.89" stroke={accent} strokeWidth={width} />
      <path d="M82.28 22.24C82.28 -1.1 38.33 -3.04 38.33 22.24" stroke={accent} strokeWidth={width} />
    </svg>
  );
}
