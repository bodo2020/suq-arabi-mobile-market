
import React from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CollectionData {
  id: string;
  title: string;
  description: string | null;
  products: string[] | null;
}

interface CollectionsListProps {
  collections: CollectionData[];
  products: Product[];
}

const CollectionsList = ({ collections, products }: CollectionsListProps) => {
  const productsByIds = (productIds: string[] | null) => {
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) return [];
    return products.filter(product => productIds.includes(product.id));
  };

  return (
    <>
      {collections.map(collection => {
        const collectionProducts = productsByIds(collection.products);
        
        return (
          <div key={collection.id} className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">{collection.title}</h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              )}
            </div>
            
            {collectionProducts.length > 0 ? (
              <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex flex-row-reverse space-x-3 space-x-reverse p-2">
                  {collectionProducts.map(product => (
                    <div key={product.id} className="w-[40%] sm:w-[250px] flex-shrink-0">
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
                لا توجد منتجات في هذه المجموعة
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

export default CollectionsList;
