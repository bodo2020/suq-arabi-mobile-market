import React from 'react';
import './hero-banner.css';

interface BannerSkeletonProps {
  className?: string;
}

/** Same shape as the hero banner (3:2 on phones, 21:8 on larger screens), so nothing jumps when it loads. */
const BannerSkeleton: React.FC<BannerSkeletonProps> = ({ className = '' }) => (
  <div className={`hero-banner ${className}`} role="status" aria-label="جاري تحميل العروض">
    <div className="hero-banner__track">
      <div className="hero-banner__slide skeleton-shimmer" />
    </div>
  </div>
);

export default BannerSkeleton;
