
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CategorySkeleton = () => {
  return (
    <div className="rounded-[22px] border border-[#d8ebdf] bg-white p-2" aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-[18px] bg-[#f3f8f4]" />
      <Skeleton className="mx-1 mt-3 h-4 w-3/4 rounded bg-[#fff5d3]" />
    </div>
  );
};

export default CategorySkeleton;

