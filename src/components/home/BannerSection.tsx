
import React, { useRef, useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Banner from '@/components/ui/Banner';

interface BannerSectionProps {
  banners: any[];
}

const BannerSection: React.FC<BannerSectionProps> = ({ banners }) => {
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (banners.length > 1) {
      bannerIntervalRef.current = setInterval(() => {
        setActiveBanner(prev => (prev + 1) % banners.length);
      }, 5000);
    }
    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current);
      }
    };
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="mb-6 w-full">
      <Carousel className="w-full" opts={{
        loop: true
      }} setApi={api => {
        if (api && banners.length > 1) {
          api.scrollTo(activeBanner);
        }
      }}>
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <Banner banner={banner} />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {banners.length > 1 && (
          <div className="flex justify-center mt-2">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 mx-1 rounded-full ${
                  activeBanner === index ? 'bg-primary' : 'bg-gray-300'
                }`}
                onClick={() => {
                  setActiveBanner(index);
                  if (bannerIntervalRef.current) {
                    clearInterval(bannerIntervalRef.current);
                    bannerIntervalRef.current = setInterval(() => {
                      setActiveBanner(prev => (prev + 1) % banners.length);
                    }, 5000);
                  }
                }}
                aria-label={`شريحة ${index + 1}`}
              />
            ))}
          </div>
        )}
      </Carousel>
    </div>
  );
};

export default BannerSection;
