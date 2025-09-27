import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const SubcategorySkeleton = () => {
  return (
    <div className="flex flex-col items-center space-y-2 p-2 rounded-lg animate-pulse">
      <Skeleton className="w-full aspect-square rounded-lg" />
      <Skeleton className="h-4 w-16 rounded" />
    </div>
  );
};

export default SubcategorySkeleton;