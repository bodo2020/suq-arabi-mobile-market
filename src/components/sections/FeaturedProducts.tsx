
import React from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface FeaturedProductsProps {
  products: Product[];
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  const isMobile = useIsMobile();
  const availableProducts = products.filter(product => product.quantity > 0);
  const featuredProducts = availableProducts.slice(0, isMobile ? 4 : 10);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      {featuredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {featuredProducts.map(product => (
            <ProductCard 
              key={product.id}
              product={product}
              hideIfUnavailable={true}
              showBulkQuantity={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد منتجات مميزة متاحة حاليًا
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
