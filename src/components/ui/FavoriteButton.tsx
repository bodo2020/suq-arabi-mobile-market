import React from 'react';
import { Heart } from 'lucide-react';
import { appNavigate } from '@/lib/appNavigation';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [burst, setBurst] = React.useState(false);
  React.useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(false), 480);
    return () => window.clearTimeout(timer);
  }, [burst]);

  const baseClassName = cn(
    'relative flex items-center justify-center transition-colors duration-200',
    size === 'sm' && 'h-8 w-8',
    size === 'md' && 'h-11 w-11',
    size === 'lg' && 'h-14 w-14',
    className,
  );

  if (!user) {
    const handleGuestFavorite = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      toast({ title: 'سجل دخولك أولاً', description: 'سجل الدخول علشان تحفظ المنتجات في المفضلة.' });
      appNavigate('/phone-login');
    };

    return (
      <button
        type="button"
        onClick={handleGuestFavorite}
        aria-label="سجل الدخول لإضافة المنتج للمفضلة"
        className={baseClassName}
        style={{ padding: 0, background: 'transparent' }}
      >
        <Heart size={sizeMap[size]} strokeWidth={2.1} className="text-slate-400 transition-colors active:text-[#005931]" />
      </button>
    );
  }

  if (!favoritesLoaded) {
    return (
      <div className={baseClassName}>
        <Heart size={sizeMap[size]} strokeWidth={2} className="text-gray-200" />
      </div>
    );
  }

  const selected = isFavorite(productId, variantId);
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selected && !isLoading) setBurst(true);
    void toggleFavorite(productId, variantId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={selected ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
      disabled={isLoading}
      className={baseClassName}
      style={{ padding: 0, background: 'transparent' }}
    >
      <Heart
        size={sizeMap[size]}
        strokeWidth={2}
        className={cn(
          'transition-colors duration-300',
          burst && 'brand-favorite-heart--burst',
          selected ? 'fill-[#005931] text-[#005931]' : 'text-slate-400 group-hover:text-[#005931]',
        )}
      />
      {burst && <span className="brand-favorite-sparks" aria-hidden="true" />}
      {isLoading && <Skeleton className="absolute inset-0 rounded-full" />}
    </button>
  );
};

export default FavoriteButton;