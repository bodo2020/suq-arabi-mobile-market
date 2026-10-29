import BrandMark from '@/components/brand/BrandMark';
import './brand-loader.css';

export default function BrandLoader({ size = 'md', label = 'جاري التحميل', className = '' }: {
  size?: 'sm' | 'md' | 'lg'; label?: string; className?: string;
}) {
  return (
    <span role="status" aria-label={label} className={`brand-loader brand-loader--${size} ${className}`}>
      <BrandMark variant="mark" className="brand-loader__mark" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
