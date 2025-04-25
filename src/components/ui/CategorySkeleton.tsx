
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CategorySkeleton = () => {
  return (
    <div className="relative" style={{ aspectRatio: '1' }}>
      <Skeleton className="w-full h-full rounded-2xl" />
    </div>
  );
};

export default CategorySkeleton;
