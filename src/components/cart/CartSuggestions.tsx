import React from 'react';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { useCollectionProducts } from '@/hooks/useCollectionProducts';

type CartSuggestionsProps = {
  title: string;
  subtitle?: string;
  /** Product ids already in the cart, never suggested again. */
  excludeIds?: string[];
  limit?: number;
};

/**
 * A rail of ready-to-add products for the cart page, picked round-robin from
 * the store's collections (one per collection first, so it mixes categories).
 * Uses the same cached request as the home collections — no extra download.
 */
export default function CartSuggestions({ title, subtitle, excludeIds = [], limit = 10 }: CartSuggestionsProps) {
  const { collections, products, loading } = useCollectionProducts();

  const picks = React.useMemo(() => {
    const byId = new Map(products.map(product => [product.id, product]));
    const excluded = new Set(excludeIds);
    const queues = collections.map(collection => (collection.products || [])
      .map(id => byId.get(id))
      .filter((product): product is NonNullable<typeof product> =>
        Boolean(product) && !excluded.has(product!.id) && Number(product!.quantity || 0) > 0));
    const chosen: typeof products = [];
    const seen = new Set<string>();
    for (let round = 0; chosen.length < limit && queues.some(queue => queue.length > round); round++) {
      for (const queue of queues) {
        const product = queue[round];
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        chosen.push(product);
        if (chosen.length >= limit) break;
      }
    }
    return chosen;
  }, [collections, products, excludeIds, limit]);

  if (!loading && !picks.length) return null;

  return (
    <section className={`mt-5 ${HOME_SECTION_CARD}`} aria-label={title}>
      <HomeSectionHeader title={title} subtitle={subtitle} href="/" hrefLabel="تسوّق أكتر" />
      <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2" dir="rtl">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="w-[124px] shrink-0"><ProductCardSkeleton /></div>)
          : picks.map(product => (
            <div key={product.id} className="w-[124px] shrink-0"><ProductCard product={product} /></div>
          ))}
      </div>
    </section>
  );
}
