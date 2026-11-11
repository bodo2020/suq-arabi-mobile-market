import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ui/ProductCard';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { supabase } from '@/lib/supabase';
import { inStock, useBranchCatalog } from '@/hooks/useBranchCatalog';

type Props = {
  /** The product being viewed, or everything in the bag. */
  productIds: string[];
  title: string;
  subtitle?: string;
  limit?: number;
  className?: string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * "بيتشروا مع بعض": products other customers put in the same basket (from
 * real cashier invoices and online orders, rebuilt every night). Prices and
 * stock come from the branch catalog; nothing shows when there is nothing to say.
 */
export default function BoughtTogetherRail({ productIds, title, subtitle, limit = 10, className = 'mt-5' }: Props) {
  const ids = React.useMemo(() => [...new Set(productIds)].sort().slice(0, 40), [productIds]);
  const catalog = useBranchCatalog(ids.length > 0);
  const together = useQuery({
    queryKey: ['bought-together', ids],
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await rpc('get_bought_together_v1', { p_product_ids: ids, p_limit: 30 });
      if (error) return [] as string[]; // older database: simply no rail
      return (Array.isArray(data) ? data : []).map(row => String((row as { product_id: string }).product_id));
    },
  });

  const picks = React.useMemo(() => {
    const byId = new Map((catalog.data || []).map(product => [product.id, product]));
    const given = new Set(ids);
    return (together.data || [])
      .map(id => byId.get(id))
      .filter((product): product is NonNullable<typeof product> => Boolean(product) && !given.has(product!.id) && inStock(product!))
      .slice(0, limit);
  }, [catalog.data, together.data, ids, limit]);

  // Two products are not a rail.
  if (picks.length < 3) return null;

  return (
    <section className={`${className} ${HOME_SECTION_CARD}`} aria-label={title}>
      <HomeSectionHeader title={title} subtitle={subtitle} />
      <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2" dir="rtl">
        {picks.map(product => (
          <div key={product.id} className="w-[124px] shrink-0"><ProductCard product={product} /></div>
        ))}
      </div>
    </section>
  );
}
