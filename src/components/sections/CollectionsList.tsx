
import React, { memo } from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { getProductListWithVariants } from '@/utils/productUtils';
import { pickForRail } from '@/lib/homeRanking';
import HomeSectionHeader, { HOME_SECTION_CARD } from './HomeSectionHeader';

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
      // Hand-picked lists go stale; only show what can be ordered now.
      .filter((product): product is Product => !!product && Number(product.quantity || 0) > 0);
  };

  return (
    <>
      {collections.map(collection => {
        // Hand-picked list, but a rotating dozen of it each time the app opens.
        const collectionProducts = pickForRail(getProductsByIds(collection.products), { limit: 12, perFamily: 3 });
        
        if (collectionProducts.length === 0) return null;
        
        return (
          <div key={collection.id} className={`mb-7 ${HOME_SECTION_CARD}`}>
            <HomeSectionHeader title={collection.title} subtitle={collection.description} />
            
            <ScrollArea className="w-full whitespace-nowrap rounded-2xl" dir="rtl">
              <div className="flex gap-3 pb-3">
                {getProductListWithVariants(collectionProducts).map(product => (
                  <div key={product.variantKey} className="w-[112px] flex-shrink-0 sm:w-[148px]">
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

