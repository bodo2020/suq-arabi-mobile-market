
import React from 'react';
import { Product } from '@/lib/supabase';
import ProductCard from '@/components/ui/ProductCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FeaturedProductsProps {
  products: Product[];
}

const FeaturedProducts = ({ products }: FeaturedProductsProps) => {
  const availableProducts = products.filter(product => product.quantity > 0);
  
  // المرجع للتمرير الأفقي
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
    <div className="mb-6 relative">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">منتجات مميزة</h2>
      </div>
      
      {availableProducts.length > 0 ? (
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
              {availableProducts.map(product => (
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
          لا توجد منتجات مميزة متاحة حاليًا
        </div>
      )}
    </div>
  );
};

export default FeaturedProducts;
