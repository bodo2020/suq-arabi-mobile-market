
import React, { memo } from 'react';
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

// Use memoization to prevent unnecessary re-renders
const CollectionsList = memo(({ collections, products }: CollectionsListProps) => {
  // Create a product map for faster lookups instead of filtering repeatedly
  const productMap = React.useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(product => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const getProductsByIds = (productIds: string[] | null) => {
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) return [];
    
    // Use the map for faster lookups
    return productIds
      .map(id => productMap.get(id))
      .filter((product): product is Product => !!product);
  };

  return (
    <>
      {collections.map(collection => {
        const collectionProducts = getProductsByIds(collection.products);
        
        if (collectionProducts.length === 0) return null;
        
        return (
          <div key={collection.id} className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">{collection.title}</h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              )}
            </div>
            
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
              <div className="flex flex-row-reverse space-x-4 space-x-reverse p-2">
                {collectionProducts.map(product => (
                  <div key={product.id} className="w-[120px] flex-shrink-0">
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
          </div>
        );
      })}
    </>
  );
});

CollectionsList.displayName = 'CollectionsList';

export default CollectionsList;
