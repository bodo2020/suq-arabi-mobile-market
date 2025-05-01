
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import FeaturedProducts from './FeaturedProducts';

const ProductCollectionsSection = () => {
  const {
    data: products = [],
    isLoading: productsLoading
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  });

  if (productsLoading) {
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

  return <FeaturedProducts products={products} />;
};

export default ProductCollectionsSection;
