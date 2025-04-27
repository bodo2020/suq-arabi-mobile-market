
import React from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FeaturedProductsProps {
  products: Product[];
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  const availableProducts = products.filter(product => product.quantity > 0);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      {availableProducts.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
          <div className="flex flex-row-reverse w-max space-x-4 space-x-reverse p-4">
            {availableProducts.map(product => (
              <div key={product.id} className="w-[160px] md:w-[250px] flex-shrink-0">
                <ProductCard 
                  product={product}
                  hideIfUnavailable={false}
                  showBulkQuantity={false}
                />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          لا توجد منتجات مميزة متاحة حاليًا
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
