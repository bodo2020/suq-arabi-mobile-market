
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import CollectionsList from './CollectionsList';
import { Skeleton } from '@/components/ui/skeleton';

const ProductCollectionsSection = () => {
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
        } = await supabase.from('product_collections').select('*').eq('active', true).order('position');
        console.log('Fetched collections:', data);
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('quantity', 0);
      
      if (error) throw error;
      return data || [];
    }
  });

  if (collectionsLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-36 mb-2" />
          <div className="px-4">
            <div className="flex space-x-4 rtl:space-x-reverse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="min-w-[55%] flex-shrink-0">
                  <Skeleton className="h-56 w-full rounded-lg" />
                </div>
              ))}
            </div>
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
