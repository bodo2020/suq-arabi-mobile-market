import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ui/ProductCard';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { supabase } from '@/lib/supabase';
import { inStock, useBranchCatalog } from '@/hooks/useBranchCatalog';

type SeasonRailData = { title: string; subtitle: string | null; days_until: number; product_ids: string[] };

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const countdown = (days: number) => days <= 0 ? null : days === 1 ? 'فاضل يوم' : days === 2 ? 'فاضل يومين' : days <= 10 ? `فاضل ${days} أيام` : `فاضل ${days} يوم`;

/**
 * The store's season rail (رمضان، العيد...): the store switches a season on
 * once and the server shows it only inside its dates, so this simply renders
 * what comes back. Prices and stock come from the branch catalog.
 */
export default function SeasonRail() {
  const catalog = useBranchCatalog();
  const season = useQuery({
    queryKey: ['season-rail', catalog.branchId],
    enabled: Boolean(catalog.branchId),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<SeasonRailData | null> => {
      const { data, error } = await rpc('get_customer_season_rail_v1', { p_branch_id: catalog.branchId });
      if (error || !data || typeof data !== 'object') return null; // older database or no season now
      const raw = data as Record<string, unknown>;
      return {
        title: String(raw.title || ''),
        subtitle: raw.subtitle ? String(raw.subtitle) : null,
        days_until: Number(raw.days_until) || 0,
        product_ids: Array.isArray(raw.product_ids) ? raw.product_ids.map(String) : [],
      };
    },
  });

  const picks = React.useMemo(() => {
    const byId = new Map((catalog.data || []).map(product => [product.id, product]));
    return (season.data?.product_ids || [])
      .map(id => byId.get(id))
      .filter((product): product is NonNullable<typeof product> => Boolean(product) && inStock(product!))
      .slice(0, 18);
  }, [catalog.data, season.data]);

  if (!season.data?.title || picks.length < 3) return null;
  const left = countdown(season.data.days_until);

  return (
    <section className={`mb-5 ${HOME_SECTION_CARD} border-[#F1DE9B] bg-[linear-gradient(180deg,#FFF6D6_0px,#ffffff_110px)]`} aria-label={season.data.title}>
      <HomeSectionHeader title={season.data.title} subtitle={[season.data.subtitle, left].filter(Boolean).join(' · ') || null} />
      <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2" dir="rtl">
        {picks.map(product => (
          <div key={product.id} className="w-[124px] shrink-0"><ProductCard product={product} /></div>
        ))}
      </div>
    </section>
  );
}
