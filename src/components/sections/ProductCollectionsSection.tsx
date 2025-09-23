
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import CollectionsList from './CollectionsList';

const ProductCollectionsSection = () => {
  // Optimize collections query with proper caching
  const {
    data: productCollections = [],
    isLoading: collectionsLoading
  } = useQuery({
    queryKey: ['productCollections'],
    queryFn: async () => {
      try {
        const {
          data,
          error
        } = await supabase
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
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false
  });

  // Use a more efficient product fetch strategy - only get active products
  const { 
    data: products = [], 
    isLoading: productsLoading 
  } = useQuery({
    queryKey: ['active-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('quantity', 0);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false
  });

  if (collectionsLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-36 mb-2" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!productCollections.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <CollectionsList collections={productCollections} products={products} />
    </div>
  );
};

export default ProductCollectionsSection;
