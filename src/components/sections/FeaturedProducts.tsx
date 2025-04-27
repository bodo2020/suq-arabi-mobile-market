
import React, { useState } from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

interface FeaturedProductsProps {
  products: Product[];
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  const isMobile = useIsMobile();
  const availableProducts = products.filter(product => product.quantity > 0);
  const [activeIndex, setActiveIndex] = useState(0);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      {availableProducts.length > 0 ? (
        <div className="relative" dir="ltr">
          <Carousel
            opts={{
              align: "start",
              containScroll: "trimSnaps",
              loop: true,
              dragFree: true,
            }}
            setApi={(api) => {
              if (!api) return;
              api.on('select', () => {
                setActiveIndex(api.selectedScrollSnap());
              });
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {availableProducts.map(product => (
                <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/5">
                  <div dir="rtl">
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
          
          {/* Pagination Dots */}
          <div className="flex justify-center gap-2 mt-4" dir="ltr">
            {availableProducts.map((_, index) => (
              <button 
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex 
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
          لا توجد منتجات مميزة متاحة حاليًا
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
