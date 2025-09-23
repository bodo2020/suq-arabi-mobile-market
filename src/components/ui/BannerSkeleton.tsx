import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface BannerSkeletonProps {
  className?: string;
}

const BannerSkeleton: React.FC<BannerSkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`relative w-full overflow-hidden rounded-lg ${className}`}>
      <Skeleton className="w-full h-40 md:h-56 lg:h-64 rounded-lg" />
      
      {/* نقط وهمية للتنقل */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="w-3 h-3 rounded-full" />
        ))}
      </div>
    </div>
  );
};

export default BannerSkeleton;