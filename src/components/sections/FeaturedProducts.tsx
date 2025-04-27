
import React from 'react';
import { Product } from '@/lib/supabase';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import ProductCard from '@/components/ui/ProductCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface FeaturedProductsProps {
  products: Product[];
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  const isMobile = useIsMobile();
  const availableProducts = products.filter(product => product.quantity > 0);
  const featuredProducts = availableProducts.slice(0, isMobile ? 4 : 10);
  
  const carouselOptions = {
    align: "start" as const,
    dragFree: true,
    containScroll: "trimSnaps" as const,
    slidesToScroll: 1
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      <Carousel className="w-full" opts={carouselOptions}>
        <CarouselContent>
          {featuredProducts.length > 0 ? (
            featuredProducts.map(product => (
              <CarouselItem key={product.id} className="basis-[160px] md:basis-[200px] pl-4">
                <ProductCard product={product} hideIfUnavailable={true} showBulkQuantity={false} />
              </CarouselItem>
            ))
          ) : (
            <CarouselItem className="basis-full">
              <div className="text-center py-8 text-muted-foreground">
                لا توجد منتجات مميزة متاحة حاليًا
              </div>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};

export default FeaturedProducts;
