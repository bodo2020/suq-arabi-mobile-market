import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentDeliveryBranchId, getProducts, supabase } from '@/lib/supabase';
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

  const { data: productCollections = [], isLoading: collectionsLoading } = useQuery({
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

  const { data: products = [], isLoading: productsLoading, isError: productsError } = useQuery({
    queryKey: ['active-products', branchId],
    queryFn: () => getProducts(),
    enabled: Boolean(branchId),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (branchLoading || collectionsLoading || productsLoading) {
    return <div className="space-y-6"><CollectionSkeleton /></div>;
  }

  const selectedCollections = productCollections
    .filter(collection => !collectionId || collection.id === collectionId)
    .map(collection => collectionId ? {
      ...collection,
      title: titleOverride || collection.title,
      description: subtitleOverride ?? collection.description,
    } : collection);

  if (!selectedCollections.length || !branchId || productsError) return null;

  return <div className="space-y-6"><CollectionsList collections={selectedCollections} products={products} /></div>;
};

export default ProductCollectionsSection;
