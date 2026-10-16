import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { getProducts } from '@/lib/supabase';
import { useBranch } from '@/contexts/BranchContext';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { Button } from '@/components/ui/button';
import { getProductListWithVariants } from '@/utils/productUtils';

export default function UnifiedCatalogSection() {
  const { branch, branchLoading } = useBranch();
  const [limit, setLimit] = useState(12);
  const catalog = useQuery({
    queryKey: ['home-catalog-products', branch?.delivery_branch_id],
    queryFn: () => getProducts(),
    enabled: Boolean(branch?.delivery_branch_id),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const products = useMemo(() => getProductListWithVariants(catalog.data || []), [catalog.data]);

  if (!branchLoading && !branch) return null;

  return (
    <section className="rounded-3xl border border-[#d8ebdf] bg-white p-3 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5d3] text-[#005931]"><ShoppingBag size={20} /></span>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-[#005931] sm:text-xl">اختياراتك اليومية</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">تسوّق المنتجات المتاحة لعنوانك</p>
          </div>
        </div>
        <Link to="/search" className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-[#fff5d3] px-3 text-xs font-bold text-[#005931] hover:bg-[#ffe78d]">بحث <ArrowLeft size={15} /></Link>
      </div>

      {catalog.isLoading || branchLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
      ) : catalog.isError ? (
        <div className="rounded-2xl bg-[#f3f8f4] p-6 text-center">
          <p className="text-sm text-slate-600">تعذّر تحميل المنتجات</p>
          <Button variant="outline" className="mt-3 border-[#c8e0d2] text-[#005931]" onClick={() => void catalog.refetch()}>إعادة المحاولة</Button>
        </div>
      ) : products.length ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
            {products.slice(0, limit).map(product => <ProductCard key={product.variantKey} product={product} hideIfUnavailable={false} />)}
          </div>
          {products.length > limit && <Button variant="outline" className="mx-auto mt-5 flex min-h-11 rounded-xl border-[#c8e0d2] px-5 text-[#005931] hover:bg-[#fff5d3]" onClick={() => setLimit(value => value + 12)}>عرض منتجات أكثر</Button>}
        </>
      ) : (
        <p className="rounded-2xl bg-[#f3f8f4] p-6 text-center text-sm text-slate-600">مفيش منتجات متاحة لعنوانك حاليًا.</p>
      )}
    </section>
  );
}
