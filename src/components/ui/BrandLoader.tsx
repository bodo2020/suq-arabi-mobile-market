import BrandMark from '@/components/brand/BrandMark';
import './brand-loader.css';

/** Shared branded data/route loader; the SVG strokes are re-assembled in a
 * loop with a few lightweight decorative particles (no extra image requests). */
export default function BrandLoader({ size = 'md', label = 'جاري التحميل', className = '' }: {
  size?: 'sm' | 'md' | 'lg'; label?: string; className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`brand-loader brand-loader--${size} ${className}`.trim()}>
      <BrandMark variant="mark" motion="reveal" className="brand-loader__mark" />
      <span className="brand-loader__particles" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className={`brand-loader__particle brand-loader__particle--${index + 1}`} />
        ))}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
