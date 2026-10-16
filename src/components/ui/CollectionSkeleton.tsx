import { Skeleton } from '@/components/ui/skeleton';
import ProductCardSkeleton from './ProductCardSkeleton';

const CollectionSkeleton = () => {
  return (
    <div className="rounded-[28px] border border-[#d8ebdf] bg-white p-4 shadow-sm sm:p-5" role="status" aria-label="جاري تحميل مجموعة المنتجات">
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl bg-[#fff5d3]" />
        <div className="space-y-2"><Skeleton className="h-5 w-36 rounded-lg bg-[#eaf6ee]" /><Skeleton className="h-3 w-48 rounded-lg bg-[#f3f8f4]" /></div>
      </div>
      <div className="hide-scrollbar flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }).map((_, index) => <div key={index} className="w-[124px] shrink-0 sm:w-[158px]"><ProductCardSkeleton /></div>)}
      </div>
    </div>
  );
};

export default CollectionSkeleton;
