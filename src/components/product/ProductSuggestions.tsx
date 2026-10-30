import React, { useEffect, useMemo, useRef } from 'react';
import type { Product } from '@/lib/supabase';
import { rankRecommendationCandidates, type RecommendationKind, type RecommendationSignals } from '@/lib/recommendationEngineV2';
import ProductCard from '@/components/ui/ProductCard';
import { trackProductRecommendationEvent } from '@/lib/productRecommendationAnalytics';

type ProductSuggestionsProps = {
  sourceProduct: Product;
  products: Product[];
  cartProductIds: string[];
  learnedScores?: RecommendationSignals;
  loading: boolean;
  layout: 'mobile' | 'desktop';
};

const groupTitles: Record<RecommendationKind, string> = {
  complement: 'يكمل مشترياتك',
  similar: 'بدائل ومنتجات مشابهة',
  discover: 'اكتشف كمان',
};

const groupDescriptions: Record<RecommendationKind, string> = {
  complement: 'منتجات بتكمل استخدام المنتج اللي بتتفرج عليه',
  similar: 'اختيارات قريبة من نفس النوع',
  discover: 'منتجات أخرى متاحة في المتجر',
};

const groupOrder: RecommendationKind[] = ['complement', 'similar', 'discover'];

/**
 * Lazy-loaded below the product hero. Re-rank cached catalog candidates when
 * the cart changes, without another request or a generative model call.
 */
function ProductSuggestions({ sourceProduct, products, cartProductIds, learnedScores, loading, layout }: ProductSuggestionsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackedImpressions = useRef(new Set<string>());
  const recommendations = useMemo(() => {
    const ranked = rankRecommendationCandidates(sourceProduct, products, 16, { cartProductIds, learnedScores });
    const selected = [
      ...ranked.filter(row => row.kind === 'complement').slice(0, 4),
      ...ranked.filter(row => row.kind === 'similar').slice(0, 3),
      ...ranked.filter(row => row.kind === 'discover').slice(0, 1),
    ];
    const selectedIds = new Set(selected.map(row => row.product.id));
    return [...selected, ...ranked.filter(row => !selectedIds.has(row.product.id))].slice(0, 8);
  }, [sourceProduct, products, cartProductIds, learnedScores]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !recommendations.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      for (const row of recommendations) {
        const id = row.product.id;
        if (trackedImpressions.current.has(id)) continue;
        trackedImpressions.current.add(id);
        void trackProductRecommendationEvent(sourceProduct, row.product, 'impression');
      }
      observer.disconnect();
    }, { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [sourceProduct.id, recommendations]);

  useEffect(() => {
    const onCartAdded = (event: Event) => {
      const productId = (event as CustomEvent<{ product_id?: string }>).detail?.product_id;
      if (!productId) return;
      const row = recommendations.find(item => item.product.id === productId);
      if (row) void trackProductRecommendationEvent(sourceProduct, row.product, 'add_to_cart');
    };
    window.addEventListener('super-marko:cart-added', onCartAdded);
    return () => window.removeEventListener('super-marko:cart-added', onCartAdded);
  }, [sourceProduct.id, recommendations]);

  if (!loading && recommendations.length === 0) return null;
  const mobile = layout === 'mobile';
  return (
    <section
      ref={sectionRef}
      data-product-recommendations
      aria-label="اقتراحات منتجات مرتبطة"
      className={mobile
        ? 'rounded-[24px] border border-slate-100 bg-white px-3.5 py-4'
        : 'mt-5 rounded-[26px] bg-white px-5 py-6 ring-1 ring-black/[0.035]'}
    >
      <div className="mb-4 px-1">
        <h2 className={mobile ? 'text-base font-black text-slate-950' : 'text-xl font-black text-slate-950'}>
          مقترحات ليك
        </h2>
        <p className="mt-1 text-xs font-medium text-slate-500">
          اختيارات من المنتجات المتاحة فعلًا في المتجر
        </p>
      </div>
      {loading && recommendations.length === 0 ? (
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
        <div className="space-y-5">
          {groupOrder.map(kind => {
            const group = recommendations.filter(row => row.kind === kind);
            if (!group.length) return null;
            return (
              <div key={kind} data-recommendation-kind={kind}>
                <h3 className="px-1 text-sm font-black text-slate-900">{groupTitles[kind]}</h3>
                <p className="mb-3 mt-1 px-1 text-xs text-slate-500">{groupDescriptions[kind]}</p>
                <div dir="rtl" className={mobile
                  ? 'hide-scrollbar flex snap-x gap-2.5 overflow-x-auto pb-2'
                  : 'flex snap-x gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:overflow-visible'}
                  style={{ scrollbarWidth: 'none' }}
                >
                  {group.map(({ product }) => (
                    <div
                      key={product.id}
                      data-recommendation-product-id={product.id}
                      className={mobile
                        ? 'w-[136px] shrink-0 snap-start sm:w-[156px]'
                        : 'w-[170px] min-w-[170px] snap-start sm:w-[190px] sm:min-w-[190px] md:w-auto md:min-w-0'}
                    >
                      <div onClick={() => { void trackProductRecommendationEvent(sourceProduct, product, 'click'); }}><ProductCard product={product} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default React.memo(ProductSuggestions);
