
import React from 'react';
import { Product } from '@/lib/supabase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ProductCard from '@/components/ui/ProductCard';

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

  const carouselOptions = {
    align: "start" as const,
    dragFree: true,
    containScroll: "trimSnaps" as const,
    slidesToScroll: 1
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
          
          <Carousel className="w-full" opts={carouselOptions}>
            <CarouselContent>
              {collection.products && Array.isArray(collection.products) && collection.products.length > 0 ? (
                productsByIds(collection.products).map(product => (
                  <CarouselItem key={product.id} className="basis-[160px] md:basis-[200px] pl-4">
                    <ProductCard product={product} hideIfUnavailable={true} showBulkQuantity={true} />
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem className="basis-full">
                  <div className="text-center py-8 text-muted-foreground">
                    لا توجد منتجات في هذه المجموعة
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      ))}
    </>
  );
};

export default CollectionsList;
