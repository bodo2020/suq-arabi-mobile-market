import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import type { Product } from '@/lib/supabase';
import type { HomeSectionConfig } from '@/lib/homePage';
import { getProductListWithVariants } from '@/utils/productUtils';

export default function HomeProductSection({ section, products, title, subtitle, smart = false, loading = false, error = false, paused = false, onRetry }: {
  section: HomeSectionConfig; products: Product[]; title: string; subtitle?: string | null; smart?: boolean;
  loading?: boolean; error?: boolean; paused?: boolean; onRetry?: () => void;
}) {
  const grid = section.display_config?.layout === 'grid';
  const [visibleCount, setVisibleCount] = useState(8);
  const productIdentity = products.map(p => `${p.id}:${p.marketplace_listing_id || 'owned'}`).join('|');
  useEffect(() => setVisibleCount(8), [section.id, productIdentity]);
  const variants = useMemo(() => getProductListWithVariants(products).filter(p =>
    section.data_source?.include_unavailable === true || (p.displayType !== 'bulk' || Number(p.quantity) >= Number(p.bulk_quantity || 1))), [products, section.data_source]);
  if (!loading && !error && !paused && !variants.length) return null;
  return <section className="space-y-3" aria-label={title}>
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#005931] sm:text-xl">{smart && <Sparkles size={18} />}{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>}
      </div>
      <Link to={section.data_source?.mode === 'offers' ? '/offers' : '/search'} className="flex min-h-11 shrink-0 items-center gap-1 px-1 text-xs font-bold text-[#005931]">عرض الكل<ChevronLeft size={16} /></Link>
    </div>
    {paused ? <p role="status" className="rounded-2xl bg-amber-50 p-4 text-sm">افتح المتجر بالإنترنت أول مرة لتحميل منتجات العنوان ده.</p>
      : error ? <div className="rounded-2xl bg-white p-4 text-center"><p className="text-sm text-slate-600">تعذّر تحميل المنتجات</p><button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-xl bg-[#fff5d3] px-4 text-sm font-bold text-[#005931]">إعادة المحاولة</button></div>
      : loading ? <div className="home-product-grid grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
      : <>
        <div className={grid ? 'home-product-grid grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6' : 'home-product-rail hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2'} dir="rtl">
          {(grid ? variants.slice(0, visibleCount) : variants).map(p => <div key={`${p.marketplace_listing_id || 'owned'}:${p.variantKey}`} className={grid ? 'min-w-0' : 'w-[160px] shrink-0 snap-start sm:w-[180px]'}><ProductCard product={p} hideIfUnavailable={false} /></div>)}
        </div>
        {grid && variants.length > visibleCount && <button type="button" onClick={() => setVisibleCount(n => n + 12)} className="min-h-11 w-full rounded-xl border border-[#c8e0d2] bg-white text-sm font-bold text-[#005931]">عرض منتجات أكثر</button>}
      </>}
  </section>;
}
