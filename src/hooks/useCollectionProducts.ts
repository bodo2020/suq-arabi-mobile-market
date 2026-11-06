import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';
import { getProductsByIds } from '@/lib/branchProductIds';

export type ProductCollection = {
  id: string;
  title: string;
  description: string | null;
  products: string[] | null;
  position?: number | null;
};

/**
 * Active product collections and the branch products they contain, as ONE
 * shared request (same query keys everywhere: home rails, cart suggestions).
 */
export function useCollectionProducts() {
  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: () => getCurrentDeliveryBranchId(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const collectionsQuery = useQuery({
    queryKey: ['productCollections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_collections')
        .select('*')
        .eq('active', true)
        .order('position');
      if (error) throw error;
      return (data || []) as ProductCollection[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const productIds = React.useMemo(() => [...new Set((collectionsQuery.data || []).flatMap(collection =>
    Array.isArray(collection.products) ? collection.products.filter((id): id is string => typeof id === 'string') : []))].sort(),
  [collectionsQuery.data]);

  const productsQuery = useQuery({
    queryKey: ['collection-products', branchQuery.data, productIds.join(',')],
    queryFn: () => getProductsByIds(productIds),
    enabled: Boolean(branchQuery.data) && productIds.length > 0,
    staleTime: 30_000,
    // Refetching on every app resume would flash skeletons; pull-to-refresh
    // still refreshes it explicitly.
    refetchOnWindowFocus: false,
  });

  return {
    branchId: branchQuery.data || null,
    collections: collectionsQuery.data || [],
    products: (productsQuery.data || []) as Product[],
    loading: branchQuery.isLoading || collectionsQuery.isLoading || productsQuery.isFetching,
    error: productsQuery.isError,
  };
}
