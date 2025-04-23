
import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ productId, className }) => {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (isLoading) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className={`p-1.5 rounded-full bg-white shadow-sm hover:bg-gray-50 ${className}`}
      aria-label={isFavorite(productId) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
    >
      <Heart 
        size={18} 
        className={isFavorite(productId) ? "fill-red-500 text-red-500" : "text-gray-500"} 
      />
    </button>
  );
};

export default FavoriteButton;
