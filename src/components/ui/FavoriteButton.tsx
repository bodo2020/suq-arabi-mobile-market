import React from 'react';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FavoriteButtonProps {
  productId: string;
  variantId?: string | null;
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
  variantId,
  className,
  size = 'md',
}) => {
  const { isFavorite, toggleFavorite, isLoading, user, favoritesLoaded } = useFavorites();

  if (!user) return null;

  if (!favoritesLoaded) {
    return (
      <div
        className={cn(
          'flex items-center justify-center transition-shadow duration-200',
          size === 'sm' && 'h-8 w-8',
          size === 'md' && 'h-11 w-11',
          size === 'lg' && 'h-14 w-14',
          className,
        )}
      >
        <Heart size={sizeMap[size]} strokeWidth={2} className="animate-pulse text-gray-200" />
      </div>
    );
  }

  const selected = isFavorite(productId, variantId);
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    void toggleFavorite(productId, variantId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={selected ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      disabled={isLoading}
      className={cn(
        'relative flex items-center justify-center transition-shadow duration-200',
        size === 'sm' && 'h-8 w-8',
        size === 'md' && 'h-11 w-11',
        size === 'lg' && 'h-14 w-14',
        className,
      )}
      style={{ padding: 0, background: 'transparent' }}
    >
      <Heart
        size={sizeMap[size]}
        strokeWidth={2}
        className={cn(
          'transition-colors duration-300',
          selected ? 'fill-[#22C55E] text-[#22C55E]' : 'text-gray-300 group-hover:text-primary',
        )}
      />
      {isLoading && <Skeleton className="absolute inset-0 rounded-full" />}
    </button>
  );
};

export default FavoriteButton;