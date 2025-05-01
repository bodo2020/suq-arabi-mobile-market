
import React from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        const scrollContainerRef = React.useRef<HTMLDivElement>(null);
        
        // وظائف التمرير للأزرار
        const scrollLeft = () => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
          }
        };

        const scrollRight = () => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
          }
        };
        
        return (
          <div key={collection.id} className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold">{collection.title}</h2>
              {collection.description && (
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              )}
            </div>
            
            {collectionProducts.length > 0 ? (
              <div className="relative">
                {/* أزرار التنقل */}
                <button 
                  onClick={scrollRight} 
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
                  aria-label="السابق"
                >
                  <ChevronRight className="h-5 w-5 text-primary" />
                </button>
                
                <button 
                  onClick={scrollLeft} 
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1 shadow-md"
                  aria-label="التالي"
                >
                  <ChevronLeft className="h-5 w-5 text-primary" />
                </button>
                
                <ScrollArea className="w-full pb-4">
                  <div 
                    ref={scrollContainerRef}
                    className="flex space-x-4 rtl:space-x-reverse px-4"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {collectionProducts.map(product => (
                      <div 
                        key={product.id} 
                        className="min-w-[55%] flex-shrink-0 px-1"
                      >
                        <ProductCard 
                          product={product}
                          hideIfUnavailable={false}
                          showBulkQuantity={false}
                          compactDesign={true}
                        />
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
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
