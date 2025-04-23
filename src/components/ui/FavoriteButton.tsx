
import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 20,
  md: 28,
  lg: 36,
};

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  className,
  size = 'md',
}) => {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  const iconSize = sizeMap[size];

  // Styling: white circle, subtle shadow, soft border, green filling if favorite
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite(productId) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      disabled={isLoading}
      className={cn(
        'rounded-full border border-gray-200 bg-white flex items-center justify-center transition-shadow duration-200 shadow-sm hover:shadow-md',
        size === 'sm' && 'w-8 h-8',
        size === 'md' && 'w-11 h-11',
        size === 'lg' && 'w-14 h-14',
        className
      )}
      style={{
        padding: 0,
        position: 'relative',
      }}
    >
      <Heart
        size={iconSize}
        strokeWidth={2}
        className={cn(
          "transition-colors duration-300",
          isFavorite(productId)
            ? "fill-[#22C55E] text-[#22C55E]"  // Solid green
            : "text-gray-300 group-hover:text-primary"
        )}
      />
      {isLoading && (
        <span className="absolute top-0 right-0 left-0 bottom-0 bg-white opacity-60 cursor-wait rounded-full"></span>
      )}
    </button>
  );
};

export default FavoriteButton;
