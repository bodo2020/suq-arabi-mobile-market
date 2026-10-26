import React from 'react';
import './brand-loader.css';
import BrandWordmark from '@/components/brand/BrandWordmark';

export default function BrandLoader({ size = 'md', label = 'جاري التحميل', className = '' }: {
  size?: 'sm' | 'md' | 'lg'; label?: string; className?: string;
}) {
  return <span role="status" className={`brand-loader brand-loader--${size} ${className}`}>
    <span aria-hidden="true" className="brand-loader__name"><BrandWordmark /></span>
    <span className="sr-only">{label}</span>
  </span>;
}
