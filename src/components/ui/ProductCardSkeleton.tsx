import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="flex h-full flex-col rounded-[18px] bg-white p-1.5 ring-1 ring-black/[0.03] sm:rounded-[22px] sm:p-2.5">
      <div className="relative mb-5 aspect-square sm:mb-7">
        <Skeleton className="absolute inset-0 rounded-[14px] sm:rounded-[18px]" />
        <Skeleton className="absolute left-1 top-1 h-7 w-7 rounded-full sm:left-2 sm:top-2 sm:h-9 sm:w-9" />
        <Skeleton className="absolute -bottom-4 left-1 h-9 w-9 rounded-full sm:-bottom-5 sm:left-2 sm:h-12 sm:w-12" />
      </div>

      <div className="space-y-1 sm:space-y-1.5">
        <Skeleton className="h-2.5 w-full rounded sm:h-3" />
        <Skeleton className="h-2.5 w-4/5 rounded sm:h-3" />
      </div>

      <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
        <Skeleton className="h-2 w-1/2 rounded sm:h-2.5" />
        <div className="flex items-end gap-1">
          <Skeleton className="h-5 w-12 rounded sm:h-6 sm:w-16" />
          <Skeleton className="h-2 w-6 rounded sm:h-3 sm:w-8" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
