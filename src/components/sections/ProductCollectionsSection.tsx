import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentDeliveryBranchId, supabase } from '@/lib/supabase';
import { getProductsByIds } from '@/lib/branchProductIds';
import CollectionSkeleton from '@/components/ui/CollectionSkeleton';
import CollectionsList from './CollectionsList';

interface ProductCollectionsSectionProps {
  collectionId?: string;
  titleOverride?: string;
  subtitleOverride?: string;
}

const ProductCollectionsSection: React.FC<ProductCollectionsSectionProps> = ({ collectionId, titleOverride, subtitleOverride }) => {
  const { data: branchId, isLoading: branchLoading } = useQuery({
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
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const selectedCollections = React.useMemo(() => (collectionsQuery.data || [])
    .filter(collection => !collectionId || collection.id === collectionId)
    .map(collection => collectionId ? {
      ...collection,
      title: titleOverride || collection.title,
      description: subtitleOverride ?? collection.description,
    } : collection), [collectionsQuery.data, collectionId, titleOverride, subtitleOverride]);

  // Only the products shown in collections, instead of the whole branch
  // catalog (1000 rows, ~1.5s) just to pick a few dozen. The ids of *all*
  // active collections form one shared query, so the home page's several
  // collection sections make a single request instead of one each.
  const productIds = React.useMemo(() => [...new Set((collectionsQuery.data || []).flatMap(collection =>
    Array.isArray(collection.products) ? collection.products.filter((id): id is string => typeof id === 'string') : []))].sort(),
  [collectionsQuery.data]);

  const productsQuery = useQuery({
    queryKey: ['collection-products', branchId, productIds.join(',')],
    queryFn: () => getProductsByIds(productIds),
    enabled: Boolean(branchId) && productIds.length > 0,
    staleTime: 30_000,
    // Refetching on every app resume would flash the skeleton; pull-to-refresh
    // still refreshes it explicitly.
    refetchOnWindowFocus: false,
  });

  // Skeleton while loading, including a pull-to-refresh refetch.
  if (branchLoading || collectionsQuery.isLoading || productsQuery.isFetching) {
    return <div className="space-y-6"><CollectionSkeleton /></div>;
  }

  if (!selectedCollections.length || !branchId || productsQuery.isError) return null;

  return <div className="space-y-6"><CollectionsList collections={selectedCollections} products={productsQuery.data || []} /></div>;
};

export default ProductCollectionsSection;
