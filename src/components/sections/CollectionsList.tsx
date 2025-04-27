import React from 'react';
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

  return (
    <>
      {collections.map(collection => (
        <div key={collection.id} className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">{collection.title}</h2>
            {collection.description && (
              <p className="text-sm text-muted-foreground">{collection.description}</p>
            )}
          </div>
          
          {collection.products && Array.isArray(collection.products) && collection.products.length > 0 ? (
            <div className="relative">
              <Carousel
                opts={{
                  align: "start",
                  containScroll: false,
                  dragFree: false,
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {productsByIds(collection.products).map(product => (
                    <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/5">
                      <ProductCard 
                        key={product.id} 
                        product={product}
                        hideIfUnavailable={false}
                        showBulkQuantity={false}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد منتجات في هذه المجموعة
            </div>
          )}
        </div>
      ))}
    </>
  );
};

export default CollectionsList;
