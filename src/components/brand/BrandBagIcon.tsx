import type { SVGProps } from 'react';

/**
 * - brand:   official light-background colours (green + yellow).
 * - onGreen: official on-green colours (yellow + white).
 * - mono:    one colour (currentColor), e.g. an idle tab.
 */
export type BrandBagTone = 'brand' | 'onGreen' | 'mono';

type BrandBagIconProps = Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> & {
  size?: number;
  strokeWidth?: number;
  tone?: BrandBagTone;
};

// Stroke colours in the order of the official artwork (public/brand):
// 1 left + bottom · 2 top + right · 3 tail · 4 smile · 5 handle.
const PALETTES: Record<Exclude<BrandBagTone, 'mono'>, [string, string, string, string, string]> = {
  brand: ['#005931', '#FFC120', '#005931', '#005931', '#FFC120'],
  onGreen: ['#FFC120', '#FFFFFF', '#FFC120', '#FFC120', '#FFFFFF'],
};

const PATHS = [
  'M10.5 32.535V153.686C10.5 163.074 18.1112 170.686 27.5 170.686H114.644',
  'M10.5 32.004H136.964C146.353 32.004 153.964 39.6151 153.964 49.004V204.161',
  'M114.642 170.707L153.964 204.161',
  'M51.9445 88.3275C51.9445 120.208 111.987 122.865 111.987 88.3275',
  'M111.988 31.4169C111.988 -0.464026 51.9454 -3.12077 51.9454 31.4169',
];

/**
 * The Super Marko bag as a line icon, drawn from the official artwork so its
 * colours match the logo: on light surfaces the left/bottom, tail and smile
 * are green and the top/right and handle are yellow.
 */
export default function BrandBagIcon({
  size = 24,
  strokeWidth = 2,
  tone = 'brand',
  className,
  ...props
}: BrandBagIconProps) {
  // Artwork is drawn in a ~165x219 box; scale the stroke so it reads like a
  // lucide icon drawn at `strokeWidth` in a 24px box.
  const width = strokeWidth * 8.4;
  const colors = tone === 'mono' ? null : PALETTES[tone];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-8 -12 181 232"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      {PATHS.map((d, index) => (
        <path key={index} d={d} stroke={colors ? colors[index] : 'currentColor'} strokeWidth={width} />
      ))}
    </svg>
  );
}
