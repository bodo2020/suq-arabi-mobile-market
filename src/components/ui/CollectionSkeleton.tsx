import React from 'react';
import ProductCardSkeleton from './ProductCardSkeleton';

/** Same shape as a collection rail (title + horizontal product cards), with a shimmer. */
const CollectionSkeleton = () => (
  <div role="status" aria-label="جاري تحميل المنتجات" className="mb-7 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 space-y-2">
      <div className="skeleton-shimmer h-6 w-40" />
      <div className="skeleton-shimmer h-3 w-56 max-w-full" />
    </div>
    <div className="flex gap-3 overflow-hidden pb-3" dir="rtl">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-[158px] flex-shrink-0 sm:w-[180px]"><ProductCardSkeleton /></div>
      ))}
    </div>
  </div>
);

export default CollectionSkeleton;
