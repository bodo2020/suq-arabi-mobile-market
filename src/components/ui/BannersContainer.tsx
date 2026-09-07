
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannersContainerProps {
  banners: {
    id: string;
    title: string;
    image_url: string;
    link?: string;
    category_id?: string;
    products?: string[];
  }[];
}

const BannersContainer: React.FC<BannersContainerProps> = ({ banners }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // التحريك التلقائي
  useEffect(() => {
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      }, 4000); // تغيير كل 4 ثواني
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [banners.length]);

  // إيقاف التحريك التلقائي عند التفاعل مع الماوس
  const handleMouseEnter = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      }, 4000);
    }
  };

  const handleBannerClick = (banner: any) => {
    if (banner.products && banner.products.length) {
      navigate(`/banner-products/${banner.id}`);
    } else if (banner.link) {
      navigate(banner.link);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  if (banners.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden rounded-lg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* الشرائح */}
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="w-full flex-shrink-0"
          >
            <div
              className="relative h-40 md:h-56 lg:h-64 w-full cursor-pointer"
              onClick={() => handleBannerClick(banner)}
              tabIndex={0}
              role="button"
            >
              <img 
                src={banner.image_url} 
                alt={banner.title} 
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>
        ))}
      </div>

      {/* أسهم التنقل - تظهر فقط إذا كان هناك أكثر من بانر واحد */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 z-10"
            aria-label="البانر السابق"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200 z-10"
            aria-label="البانر التالي"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* النقط للتنقل - تظهر فقط إذا كان هناك أكثر من بانر واحد */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                currentSlide === index 
                  ? 'bg-white shadow-lg scale-110' 
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`الانتقال إلى البانر ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannersContainer;

