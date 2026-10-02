import React from 'react';
import './brand-loader.css';
import { BRAND_ICON } from '@/lib/brand';

export default function BrandLoader({ size = 'md', label = 'جاري التحميل', className = '' }: {
  size?: 'xs' | 'sm' | 'md' | 'lg'; label?: string; className?: string;
}) {
  return <span role="status" className={`brand-loader brand-loader--${size} ${className}`}>
    <img src={BRAND_ICON} alt="" width="64" height="64" draggable={false} />
    <span className="sr-only">{label}</span>
  </span>;
}
