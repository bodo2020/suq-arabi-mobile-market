import React from 'react';
import CollectionSkeleton from '@/components/ui/CollectionSkeleton';
import { useCollectionProducts } from '@/hooks/useCollectionProducts';
import CollectionsList from './CollectionsList';

interface ProductCollectionsSectionProps {
  collectionId?: string;
  titleOverride?: string;
  subtitleOverride?: string;
}

const ProductCollectionsSection: React.FC<ProductCollectionsSectionProps> = ({ collectionId, titleOverride, subtitleOverride }) => {
  // Only the products shown in collections (one shared request for all
  // collections), instead of the whole 1000-row branch catalog.
  const { branchId, collections, products, loading, error } = useCollectionProducts();

  const selectedCollections = React.useMemo(() => collections
    .filter(collection => !collectionId || collection.id === collectionId)
    .map(collection => collectionId ? {
      ...collection,
      title: titleOverride || collection.title,
      description: subtitleOverride ?? collection.description,
    } : collection), [collections, collectionId, titleOverride, subtitleOverride]);

  // Skeleton while loading, including a pull-to-refresh refetch.
  if (loading) return <div className="space-y-6"><CollectionSkeleton /></div>;
  if (!selectedCollections.length || !branchId || error) return null;

  return <div className="space-y-6"><CollectionsList collections={selectedCollections} products={products} /></div>;
};

export default ProductCollectionsSection;
