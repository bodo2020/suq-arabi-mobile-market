import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface BannerSkeletonProps {
  className?: string;
}

const BannerSkeleton: React.FC<BannerSkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`w-full ${className}`}>
      <Skeleton className="w-full h-40 md:h-48 rounded-lg" />
    </div>
  );
};

export default BannerSkeleton;