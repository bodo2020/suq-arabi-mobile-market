import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentDeliveryBranchId, getProducts, supabase } from '@/lib/supabase';
import CollectionSkeleton from '@/components/ui/CollectionSkeleton';
import CollectionsList from './CollectionsList';

const ProductCollectionsSection = () => {
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
    return (
      <div className="space-y-6">
        {[...Array(2)].map((_, i) => <CollectionSkeleton key={i} />)}
      </div>
    );
  }

  if (!productCollections.length || !branchId || productsError) return null;

  return (
    <div className="space-y-6">
      <CollectionsList collections={productCollections} products={products} />
    </div>
  );
};

export default ProductCollectionsSection;
