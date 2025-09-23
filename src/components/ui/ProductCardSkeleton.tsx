import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCardSkeleton = () => {
  return (
    <div className="flex flex-col h-full">
      {/* Product Image */}
      <div className="relative pt-[80%] mb-2">
        <Skeleton className="absolute top-0 right-0 w-full h-full rounded-lg" />
        {/* Favorite button skeleton */}
        <div className="absolute top-2 right-2">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>

      {/* Product Info */}
      <div className="text-right flex-grow flex flex-col justify-between space-y-2">
        {/* Product Name - 3 lines */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
        </div>

        <div className="mt-auto space-y-2">
          {/* Price */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          
          {/* Add to Cart Button */}
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;