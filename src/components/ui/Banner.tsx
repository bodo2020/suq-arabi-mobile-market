import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface BannerProps {
  banner: {
    id: string;
    title: string;
    image_url: string;
    link?: string | null;
    category_id?: string | null;
    main_category_id?: string | null;
    company_id?: string | null;
    products?: string[] | null;
  };
  hideTitle?: boolean;
  autoRotate?: boolean;
}

interface BannersContainerProps {
  banners: BannerProps['banner'][];
}

const Banner: React.FC<BannerProps> = ({ banner, hideTitle = true }) => {
  const navigate = useNavigate();
  const hasTarget = Boolean(
    banner.products?.length || banner.company_id || banner.main_category_id || banner.category_id,
  );

  const handleClick = () => {
    if (hasTarget) {
      navigate(`/banner-products/${banner.id}`);
      return;
    }
    if (!banner.link) return;
    if (/^https?:\/\//i.test(banner.link)) window.location.assign(banner.link);
    else navigate(banner.link);
  };

  return (
    <div
      className="relative mx-2 h-40 min-w-[300px] cursor-pointer overflow-hidden rounded-2xl md:h-64 md:min-w-[400px]"
      onClick={handleClick}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') handleClick(); }}
      tabIndex={0}
      role="button"
      aria-label={banner.title || 'فتح العرض'}
    >
      <img
        src={banner.image_url}
        alt={banner.title || 'عرض من المعداوي'}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
      />
      {!hideTitle && (
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 to-transparent p-4">
          <h3 className="text-lg font-bold text-white md:text-xl">{banner.title}</h3>
          {(hasTarget || banner.link) && (
            <div className="mt-2 flex items-center text-sm text-white">
              <span>عرض المزيد</span>
              <ChevronLeft size={16} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const BannersContainer: React.FC<BannersContainerProps> = ({ banners }) => (
  <ScrollArea className="w-full whitespace-nowrap rounded-md">
    <div className="flex w-max space-x-4">
      {banners.map(banner => <Banner key={banner.id} banner={banner} />)}
    </div>
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

export default Banner;
