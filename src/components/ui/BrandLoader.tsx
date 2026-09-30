import React from 'react';
import './brand-loader.css';

export default function BrandLoader({ size = 'md', label = 'جاري التحميل', className = '' }: {
  size?: 'sm' | 'md' | 'lg'; label?: string; className?: string;
}) {
  return <span role="status" className={`brand-loader brand-loader--${size} ${className}`}>
    <span aria-hidden="true" className="brand-loader__name">سوبر <strong>ماركو</strong></span>
    <span className="sr-only">{label}</span>
  </span>;
}
