
import React, { useState, useEffect } from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

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

  const [activeIndices, setActiveIndices] = useState<{[key: string]: number}>({});
  const [carouselApis, setCarouselApis] = useState<{[key: string]: any}>({});

  const updateActiveIndex = (collectionId: string, index: number) => {
    setActiveIndices(prev => ({
      ...prev,
      [collectionId]: index
    }));
  };
  
  const setApiForCollection = (collectionId: string, api: any) => {
    setCarouselApis(prev => ({
      ...prev,
      [collectionId]: api
    }));
  };
  
  // Reset carousels when products change
  useEffect(() => {
    Object.entries(carouselApis).forEach(([id, api]) => {
      if (api) {
        api.scrollTo(0);
        api.reInit();
      }
    });
  }, [products, collections]);

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
              <div className="relative overflow-hidden" dir="ltr">
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                    skipSnaps: false,
                    dragFree: false,
                  }}
                  setApi={(api) => {
                    if (!api) return;
                    setApiForCollection(collection.id, api);
                    api.on('select', () => {
                      updateActiveIndex(collection.id, api.selectedScrollSnap());
                    });
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {collectionProducts.map(product => (
                      <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/10">
                        <div dir="rtl" className="h-full flex">
                          <ProductCard 
                            key={product.id} 
                            product={product}
                            hideIfUnavailable={false}
                            showBulkQuantity={false}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex" />
                  <CarouselNext className="hidden md:flex" />
                </Carousel>
                
                <div className="flex justify-center gap-2 mt-4" dir="ltr">
                  {collectionProducts.map((_, index) => (
                    <button 
                      key={index}
                      onClick={() => carouselApis[collection.id]?.scrollTo(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        index === (activeIndices[collection.id] || 0)
                          ? 'bg-primary scale-125' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
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
