
import React from 'react';
import { Heart, HeartOff } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outlined' | 'filled';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  className,
  size = 'md',
  variant = 'outlined',
}) => {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (isLoading) {
    return (
      <button
        type="button"
        className={cn(
          'rounded-full bg-white animate-pulse',
          size === 'sm' && 'p-1',
          size === 'md' && 'p-1.5',
          size === 'lg' && 'p-2',
          className
        )}
        disabled
        aria-label="جارٍ التحميل"
      >
        <Heart className="text-gray-300" size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />
      </button>
    );
  }

  const fav = isFavorite(productId);
  
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      className={cn(
        "rounded-full transition-all duration-300 border border-gray-100 group",
        size === "sm" && "p-1",
        size === "md" && "p-1.5",
        size === "lg" && "p-2",
        variant === 'outlined' && "bg-white hover:shadow-lg shadow-md",
        variant === 'filled' && "bg-primary shadow-lg",
        fav && variant === 'outlined' && "ring-2 ring-primary ring-offset-2",
        className
      )}
    >
      <Heart
        size={size === "sm" ? 16 : size === "lg" ? 24 : 20}
        className={cn(
          "transition-all duration-300",
          fav ? "fill-primary text-primary" : 
            variant === 'outlined' ? "text-gray-400 group-hover:text-primary" : "text-white group-hover:fill-white"
        )}
      />
    </button>
  );
};

export default FavoriteButton;
