
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BannerProps {
  banner: {
    id: string;
    title: string;
    image_url: string;
    link?: string;
    category_id?: string;
    products?: string[];
  };
  hideTitle?: boolean;
}

const Banner: React.FC<BannerProps> = ({ banner, hideTitle = true }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (banner.products && banner.products.length) {
      navigate(`/banner-products/${banner.id}`);
    } else if (banner.link) {
      navigate(banner.link);
    }
  };

  const renderBannerContent = () => (
    <div
      className="relative h-40 md:h-64 w-full rounded-lg overflow-hidden cursor-pointer"
      onClick={handleClick}
      tabIndex={0}
      role="button"
    >
      <img 
        src={banner.image_url} 
        alt={banner.title} 
        className="w-full h-full object-cover"
      />
      {!hideTitle && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex flex-col justify-end p-4">
          <h3 className="text-white font-bold text-lg md:text-xl">{banner.title}</h3>
          {(banner.link || (banner.products && banner.products.length)) && (
            <div className="flex items-center text-white text-sm mt-2">
              <span>عرض المزيد</span>
              <ChevronLeft size={16} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  return renderBannerContent();
};

export default Banner;
