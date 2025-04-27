
import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ProductCard from '@/components/ui/ProductCard';
import { Product } from '@/lib/supabase';

interface ProductCollectionsSectionProps {
  collections: any[];
  products: Product[];
  carouselOptions: any;
  featuredProducts: Product[];
}

const ProductCollectionsSection: React.FC<ProductCollectionsSectionProps> = ({
  collections,
  products,
  carouselOptions,
  featuredProducts,
}) => {
  const productsByIds = (productIds: string[] | null) => {
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) return [];
    return products.filter(product => productIds.includes(product.id));
  };

  if (collections && collections.length > 0) {
    return collections.map(collection => (
      <div key={collection.id} className="mb-6 w-full">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">{collection.title}</h2>
          {collection.description && (
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          )}
        </div>
        
        <Carousel className="w-full overflow-visible" opts={carouselOptions}>
          <CarouselContent className="-ml-2 -mr-2">
            {collection.products && Array.isArray(collection.products) && collection.products.length > 0 ? (
              productsByIds(collection.products).map(product => (
                <CarouselItem key={product.id} className="px-2 max-w-[180px] md:max-w-[220px]">
                  <ProductCard product={product} hideIfUnavailable={true} showBulkQuantity={true} />
                </CarouselItem>
              ))
            ) : (
              <CarouselItem className="basis-full pl-2">
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد منتجات في هذه المجموعة
                </div>
              </CarouselItem>
            )}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    ));
  }

  return (
    <div className="mb-6 w-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      <Carousel className="w-full overflow-visible" opts={carouselOptions}>
        <CarouselContent className="-ml-2 -mr-2">
          {featuredProducts.length > 0 ? (
            featuredProducts.map(product => (
              <CarouselItem key={product.id} className="px-2 max-w-[180px] md:max-w-[220px]">
                <ProductCard product={product} hideIfUnavailable={true} showBulkQuantity={false} />
              </CarouselItem>
            ))
          ) : (
            <CarouselItem className="basis-full pl-2">
              <div className="text-center py-8 text-muted-foreground">
                لا توجد منتجات مميزة متاحة حاليًا
              </div>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};

export default ProductCollectionsSection;
