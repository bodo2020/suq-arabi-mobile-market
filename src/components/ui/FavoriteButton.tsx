
import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outline';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ 
  productId, 
  className,
  size = 'md',
  variant = 'filled'
}) => {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (isLoading) {
    return null;
  }

  const isFav = isFavorite(productId);
  
  const sizeMap = {
    sm: { button: 'p-1', icon: 16 },
    md: { button: 'p-1.5', icon: 18 },
    lg: { button: 'p-2', icon: 22 }
  };
  
  const variantClass = variant === 'filled' 
    ? 'bg-white shadow-sm hover:bg-gray-50' 
    : 'bg-transparent hover:bg-gray-50/20';

  return (
    <button
      onClick={handleClick}
      className={cn(
        `rounded-full transition-all duration-300 ${sizeMap[size].button} ${variantClass}`,
        isFav && variant === 'filled' ? 'bg-red-50 hover:bg-red-100' : '',
        className
      )}
      aria-label={isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <Heart 
        size={sizeMap[size].icon} 
        className={cn(
          "transition-all duration-300",
          isFav ? "fill-red-500 text-red-500" : "text-gray-500"
        )} 
      />
    </button>
  );
};

export default FavoriteButton;
