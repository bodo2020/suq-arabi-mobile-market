import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentDeliveryBranchId } from '@/lib/supabase';

/** Round sold quantities down to a step people read at a glance: +50, +100, +200 ... */
const TIERS = [5000, 2000, 1000, 500, 200, 100, 50];

export function soldTier(sold: number): number | null {
  return TIERS.find(tier => sold >= tier) || null;
}

/** "اتباع منه +100": units sold in the last 30 days, as a tier (null under 50). */
export function useProductSoldTier(productId: string | undefined): number | null {
  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: getCurrentDeliveryBranchId,
    staleTime: 30_000,
  });
  const { data } = useQuery({
    queryKey: ['product-sold-30d', productId, branchQuery.data],
    enabled: Boolean(productId),
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
      const { data: sold, error } = await rpc('get_product_sold_30d_v1', { p_product_id: productId, p_branch_id: branchQuery.data || null });
      if (error) return 0;
      return Number(sold) || 0;
    },
  });
  return soldTier(data || 0);
}
