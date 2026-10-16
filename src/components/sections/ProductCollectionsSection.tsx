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

  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery({
    queryKey: ['home-catalog-products', branchId],
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

  if (!selectedCollections.length || !branchId) return null;
  if (productsError) return <div className="rounded-3xl border border-[#d8ebdf] bg-white p-5 text-center"><p className="text-sm text-slate-600">تعذّر تحميل مجموعات المنتجات</p><button type="button" onClick={() => void refetchProducts()} className="mt-3 min-h-10 rounded-xl bg-[#fff5d3] px-4 text-sm font-bold text-[#005931]">إعادة المحاولة</button></div>;

  return <CollectionsList collections={selectedCollections} products={products} />;
};

export default ProductCollectionsSection;
