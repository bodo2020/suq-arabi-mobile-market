import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomeBestSellers } from '@/lib/homePage';
import { getCurrentDeliveryBranchId } from '@/lib/supabase';

/** How many of the week's top sellers get the "الأكثر طلبًا" sticker. */
const STICKER_TOP = 20;
/** A product must have sold at least this much in the window to count. */
const STICKER_MIN_SOLD = 2;

/** The week's best sellers for the customer's store (one shared, cached request). */
export function useBestSellers(enabled = true) {
  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: getCurrentDeliveryBranchId,
    staleTime: 30_000,
  });
  return useQuery({
    queryKey: ['home-best-sellers', branchQuery.data],
    queryFn: () => getHomeBestSellers(branchQuery.data || null),
    enabled: enabled && Boolean(branchQuery.data),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** True for products in the top sellers list (drives the card sticker). */
export function useIsBestSeller(productId: string | undefined): boolean {
  const { data } = useBestSellers(Boolean(productId));
  const top = useMemo(() => new Set((data?.ids || [])
    .filter(id => (data?.sold.get(id) || 0) >= STICKER_MIN_SOLD)
    .slice(0, STICKER_TOP)), [data]);
  return Boolean(productId && top.has(productId));
}
