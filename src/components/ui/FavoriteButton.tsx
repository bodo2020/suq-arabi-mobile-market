
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

  // زر المفضلة الآن أيقونة قلب شفافة فقط، بلا خلفية بيضاء ولا دائرة، مع تحكم باللون عند التفضيل
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFavorite(productId) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      disabled={isLoading}
      className={cn(
        'flex items-center justify-center transition-shadow duration-200 hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      style={{
        background: 'transparent',
        padding: 0,
        border: 'none',
        position: 'relative',
      }}
    >
      <Heart
        size={iconSize}
        strokeWidth={2.4}
        className={cn(
          "transition-colors duration-200",
          isFavorite(productId)
            ? "fill-[#22C55E] text-[#22C55E]"
            : "text-gray-300 hover:text-primary"
        )}
      />
      {isLoading && (
        <span className="absolute inset-0 bg-white/60 rounded-full cursor-wait"></span>
      )}
    </button>
  );
};

export default FavoriteButton;
