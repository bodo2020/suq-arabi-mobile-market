import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCardSkeleton from './ProductCardSkeleton';

const CollectionSkeleton = () => {
  return (
    <div className="space-y-4 mb-8">
      {/* Collection Title */}
      <Skeleton className="h-6 w-40 rounded" />
      
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export default CollectionSkeleton;
