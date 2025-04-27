
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts, supabase } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import FeaturedProducts from './FeaturedProducts';
import CollectionsList from './CollectionsList';

const ProductCollectionsSection = () => {
  const {
    data: productCollections = [],
    isLoading: collectionsLoading
  } = useQuery({
    queryKey: ['productCollections'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('product_collections')
          .select('*')
          .eq('active', true)
          .order('position');
        
        if (error) {
          console.error('Error fetching collections:', error);
          throw error;
        }
        
        return data || [];
      } catch (err) {
        console.error('Error in query function:', err);
        throw err;
      }
    }
  });

  const {
    data: products = [],
    isLoading: productsLoading
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  });

  if (productsLoading || collectionsLoading) {
    return (
      <>
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {productCollections && productCollections.length > 0 ? (
        <CollectionsList collections={productCollections} products={products} />
      ) : (
        <FeaturedProducts products={products} />
      )}
    </>
  );
};

export default ProductCollectionsSection;
