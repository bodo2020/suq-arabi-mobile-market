
import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: number;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ productId, className = '', size = 28 }) => {
  const { isFavorite, toggleFavorite, isLoading } = useFavorites();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
  };

  if (isLoading) {
    return (
      <div className={`rounded-full animate-pulse w-[${size}px] h-[${size}px] bg-gray-200 ${className}`} />
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-full shadow-lg bg-white border border-gray-100 hover:scale-105 transition
        ${className}`}
      aria-label={isFavorite(productId) ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      style={{
        direction: 'rtl'
      }}
    >
      <Heart
        size={size}
        className={`transition-all duration-200 ${isFavorite(productId) ? "fill-[#D946EF] text-[#D946EF]" : "text-[#9b87f5]"}`}
        strokeWidth={2.5}
      />
    </button>
  );
};

export default FavoriteButton;
