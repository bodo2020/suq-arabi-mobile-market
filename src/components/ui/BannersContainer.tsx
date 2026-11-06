import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerItem {
  id: string;
  title: string;
  image_url: string;
  link?: string | null;
  category_id?: string | null;
  main_category_id?: string | null;
  company_id?: string | null;
  products?: string[] | null;
}

interface BannersContainerProps {
  banners: BannerItem[];
}

const BannersContainer: React.FC<BannersContainerProps> = ({ banners }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);

  const stopRotation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRotation = () => {
    stopRotation();
    if (banners.length > 1) {
      intervalRef.current = setInterval(() => {
        // Don't animate a hidden hero while the shopper scrolls, switches tabs,
        // or opens a product sheet over the still-mounted catalog.
        if (document.hidden || !isVisibleRef.current ||
          document.body.dataset.productSheetOpen === 'true' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        setCurrentSlide(prev => (prev + 1) % banners.length);
      }, 5000);
    }
  };

  useEffect(() => {
    if (currentSlide >= banners.length) setCurrentSlide(0);
    startRotation();
    return stopRotation;
  }, [banners.length]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !bannerRef.current) return;
    const observer = new IntersectionObserver(entries => {
      isVisibleRef.current = entries.some(entry => entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, [banners.length]);

  const handleBannerClick = (banner: BannerItem) => {
    const hasTarget = Boolean(
      banner.products?.length || banner.company_id || banner.main_category_id || banner.category_id,
    );
    if (hasTarget) {
      navigate(`/banner-products/${banner.id}`);
      return;
    }
    if (!banner.link) return;
    if (/^https?:\/\//i.test(banner.link)) window.location.assign(banner.link);
    else navigate(banner.link);
  };

  if (banners.length === 0) return null;

  return (
    <div
      ref={bannerRef}
      className="relative w-full overflow-hidden rounded-3xl"
      onMouseEnter={stopRotation}
      onMouseLeave={startRotation}
      onFocusCapture={stopRotation}
      onBlurCapture={startRotation}
    >
      <div
        className="flex transition-transform duration-[320ms] ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {banners.map(banner => (
          <div key={banner.id} className="w-full flex-shrink-0">
            <div
              className="relative h-44 w-full cursor-pointer sm:h-60 lg:h-72"
              onClick={() => handleBannerClick(banner)}
              tabIndex={0}
              role="button"
              aria-label={banner.title || 'فتح العرض'}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleBannerClick(banner);
                }
              }}
            >
              <img
                src={banner.image_url || '/placeholder.svg'}
                alt={banner.title || 'عرض من سوبر ماركو'}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-gray-800 shadow-lg transition hover:bg-white sm:block"
            aria-label="البانر السابق"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentSlide(prev => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/85 p-2 text-gray-800 shadow-lg transition hover:bg-white sm:block"
            aria-label="البانر التالي"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {banners.map((banner, index) => (
              <button
                type="button"
                key={banner.id}
                onClick={() => setCurrentSlide(index)}
                className={`h-2.5 rounded-full transition-[width,background-color] duration-150 ${currentSlide === index ? 'w-7 bg-[#FFC120] shadow-[0_2px_8px_rgba(0,0,0,.18)]' : 'w-2.5 bg-white/75 hover:bg-white'}`}
                aria-label={`الانتقال إلى البانر ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BannersContainer;
