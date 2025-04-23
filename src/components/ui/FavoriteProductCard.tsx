
import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FavoriteProductCardProps {
  product: Product;
}

const FavoriteProductCard: React.FC<FavoriteProductCardProps> = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleFavorite } = useFavorites();
  const { toast } = useToast();

  const handleRemoveFromFavorites = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast({
      title: "تمت الإضافة إلى السلة",
      description: `تم إضافة ${product.name} إلى سلة التسوق`,
    });
  };

  const productImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : '/placeholder.svg';

  const calculateDiscount = () => {
    if (product.offer_price && product.price) {
      const discount = 100 - ((product.offer_price / product.price) * 100);
      return Math.round(discount);
    }
    return 0;
  };

  const discount = calculateDiscount();

  return (
    <Link to={`/product/${product.id}`} className="block h-full">
      <Card className="overflow-hidden h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
        <div className="relative pb-[100%] overflow-hidden bg-gray-50">
          <img 
            src={productImage} 
            alt={product.name} 
            className="absolute top-0 right-0 w-full h-full object-contain p-2"
          />
          {discount > 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full">
              {discount}% خصم
            </div>
          )}
        </div>
        
        <div className="p-3 text-right">
          <h3 className="font-medium text-sm mb-2 line-clamp-2 h-10">
            {product.name}
          </h3>
          
          <div className="flex justify-between items-center mt-auto">
            {product.offer_price ? (
              <div className="flex flex-col items-end">
                <span className="font-bold text-primary">{product.offer_price} ر.س</span>
                <span className="text-xs line-through text-gray-400">{product.price} ر.س</span>
              </div>
            ) : (
              <span className="font-bold">{product.price} ر.س</span>
            )}
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleRemoveFromFavorites}
                variant="destructive"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="إزالة من المفضلة"
              >
                <Trash2 size={16} />
              </Button>
              <Button 
                onClick={handleAddToCart}
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="إضافة إلى السلة"
              >
                <ShoppingCart size={16} />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default FavoriteProductCard;
