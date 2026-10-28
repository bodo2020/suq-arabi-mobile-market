import React from 'react';
import type { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';

type ProductSuggestionsProps = {
  products: Product[];
  loading: boolean;
  layout: 'mobile' | 'desktop';
};

/**
 * Loaded only when the shopper reaches the lower section of product details.
 * Keeping ProductCard and its cart/favorites dependencies out of the critical
 * detail-sheet bundle reduces work before the hero/name/price first paint.
 */
function ProductSuggestions({ products, loading, layout }: ProductSuggestionsProps) {
  if (!loading && products.length === 0) return null;
  const mobile = layout === 'mobile';
  return (
    <section
      data-product-recommendations
      aria-label="منتجات مقترحة"
      className={mobile
        ? 'rounded-[24px] border border-slate-100 bg-white px-3.5 py-4'
        : 'mt-5 rounded-[26px] bg-white px-5 py-6 ring-1 ring-black/[0.035]'}
    >
      <div className="mb-4 px-1">
        <h2 className={mobile ? 'text-base font-black text-slate-950' : 'text-xl font-black text-slate-950'}>
          قد يعجبك أيضًا
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500">
          اختيارات مرتبطة بالمنتج اللي بتتفرج عليه
        </p>
      </div>
      {loading && products.length === 0 ? (
        <div className="flex gap-3 overflow-hidden" role="status" aria-label="جاري تجهيز الاقتراحات">
          {[0, 1, 2].map(index => (
            <div key={index} className={mobile ? 'w-[136px] shrink-0' : 'w-[175px] shrink-0'}>
              <div className="aspect-square animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-3 h-3 w-4/5 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      ) : (
        <div dir="rtl" className={mobile
          ? 'hide-scrollbar flex snap-x gap-2.5 overflow-x-auto pb-2'
          : 'flex snap-x gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:overflow-visible'}
          style={{ scrollbarWidth: 'none' }}
        >
          {products.slice(0, 8).map(item => (
            <div key={item.id} className={mobile
              ? 'w-[136px] shrink-0 snap-start sm:w-[156px]'
              : 'w-[170px] min-w-[170px] snap-start sm:w-[190px] sm:min-w-[190px] md:w-auto md:min-w-0'}
            >
              <ProductCard product={item} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default React.memo(ProductSuggestions);
