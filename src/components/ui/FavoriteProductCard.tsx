
import React from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/hooks/use-toast';

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

  return (
    <Link to={`/product/${product.id}`} className="block">
      <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 h-full">
        <div className="relative pb-[100%] overflow-hidden">
          <img 
            src={productImage} 
            alt={product.name} 
            className="absolute top-0 right-0 w-full h-full object-contain p-2"
          />
        </div>
        
        <div className="p-3 text-right">
          <h3 className="font-medium text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          
          <div className="flex justify-between items-center mb-2">
            {product.offer_price ? (
              <div className="flex flex-col items-end">
                <span className="font-bold text-primary">{product.offer_price} ر.س</span>
                <span className="text-xs line-through text-gray-400">{product.price} ر.س</span>
              </div>
            ) : (
              <span className="font-bold">{product.price} ر.س</span>
            )}
            
            <div className="flex items-center space-x-1 space-x-reverse">
              <button 
                onClick={handleRemoveFromFavorites}
                className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                aria-label="إزالة من المفضلة"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={handleAddToCart}
                className="p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors mr-1"
                aria-label="إضافة إلى السلة"
              >
                <ShoppingCart size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FavoriteProductCard;
