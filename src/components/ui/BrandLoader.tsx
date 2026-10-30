import BrandMark from '@/components/brand/BrandMark';
import './brand-loader.css';

/** Shared branded data/route loader; the SVG strokes are re-assembled in a
 * loop with a few lightweight decorative particles (no extra image requests).
 * For green backgrounds, pass tone="onGreen" to use the original white/yellow logo. */
export default function BrandLoader({ size = 'md', tone = 'default', label = 'جاري التحميل', className = '' }: {
  size?: 'sm' | 'md' | 'lg'; tone?: 'default' | 'onGreen'; label?: string; className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`brand-loader brand-loader--${size} brand-loader--${tone === 'onGreen' ? 'on-green' : 'default'} ${className}`.trim()}>
      <BrandMark variant="mark" tone={tone} motion="reveal" className="brand-loader__mark" />
      <span className="brand-loader__particles" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`brand-loader__particle brand-loader__particle--${index + 1}`} />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
