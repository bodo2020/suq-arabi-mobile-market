import { useQuery } from '@tanstack/react-query';
import { getBranchCatalog, getCurrentDeliveryBranchId, type MainCategory, type Product } from '@/lib/supabase';

/**
 * The whole branch catalog in one request (the server keeps a shared 3-minute
 * copy). Home rails and the categories page read the same cached list, so
 * opening one after the other costs nothing.
 */
export function useBranchCatalog(enabled = true) {
  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: getCurrentDeliveryBranchId,
    staleTime: 30_000,
  });
  const catalogQuery = useQuery({
    queryKey: ['categories', 'catalog', branchQuery.data],
    enabled: enabled && Boolean(branchQuery.data),
    queryFn: () => getBranchCatalog({ limit: 1500 }),
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: true,
  });
  return { branchId: branchQuery.data || null, branchLoading: branchQuery.isLoading, ...catalogQuery };
}

export const inStock = (product: Product) => Number(product.quantity || 0) > 0;

/** Orderable products per main category. */
export function inStockCounts(products: Product[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const product of products) {
    if (product.main_category_id && inStock(product)) counts[product.main_category_id] = (counts[product.main_category_id] || 0) + 1;
  }
  return counts;
}

/**
 * Every section that has something to order, in the admin's order; sections
 * with only a handful of products move to the end so the grid opens strong.
 * Until stock is known, all sections show in their normal order.
 */
export function orderCategoriesForHome(categories: MainCategory[], counts: Record<string, number> | null, thin = 4): MainCategory[] {
  if (!counts) return categories;
  const withStock = categories.filter(category => (counts[category.id] || 0) > 0);
  return [
    ...withStock.filter(category => counts[category.id] >= thin),
    ...withStock.filter(category => counts[category.id] < thin),
  ];
}
