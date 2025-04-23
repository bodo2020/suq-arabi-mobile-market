
import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Bell, AlertTriangle } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import FavoriteButton from './FavoriteButton';

interface ProductCardProps {
  product: Product;
  hideIfUnavailable?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, hideIfUnavailable = false }) => {
  const { items, addToCart, updateQuantity } = useCart();
  const { toast } = useToast();

  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  const isOutOfStock = product.quantity <= 0;

  if (hideIfUnavailable && isOutOfStock) {
    return null;
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      addToCart(product);
    }
  };

  const handleIncreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantity + 1);
  };

  const handleDecreaseQuantity = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(product.id, quantity - 1);
  };

  const handleNotifyAvailability = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
      title: "سيتم إشعارك",
      description: "سنقوم بإشعارك عندما يصبح المنتج متوفراً",
      variant: "default",
    });
  };

  const productImage = product.image_urls && product.image_urls.length > 0
    ? product.image_urls[0]
    : '/placeholder.svg';

  const calcDiscount = () => {
    if (product.offer_price && product.price) {
      const discount = 100 - Math.round((product.offer_price / product.price) * 100);
      return discount > 0 ? discount : 0;
    }
    return 0;
  };

  const discount = calcDiscount();

  return (
    <Link to={`/product/${product.id}`} className="product-card flex flex-col h-full hover-scale group relative">
      {/* زر المفضلة كأيقونة فقط بلا إطار أو خلفية */}
      <div className="absolute top-2 right-2 z-20">
        <FavoriteButton 
          productId={product.id} 
          size="md"
        />
      </div>
      <div className="relative pt-[100%] mb-3">
        <img
          src={productImage}
          alt={product.name}
          className="absolute top-0 right-0 w-full h-full object-contain"
        />
        {discount > 0 && (
          <div className="absolute left-2 top-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full shadow animate-fade-in">
            {discount}% خصم
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute top-0 right-0 w-full h-full flex items-center justify-center bg-black/30 rounded">
            <div className="bg-white p-2 rounded text-red-500 text-sm font-semibold flex items-center">
              <AlertTriangle size={14} className="ml-1" />
              غير متوفر
            </div>
          </div>
        )}
      </div>
      <div className="text-right flex-grow flex flex-col justify-between">
        <h3 className="font-bold text-sm mb-2 line-clamp-2">{product.name}</h3>
        <div className="mt-auto">
          <div className="flex justify-between mb-2 items-center">
            <div className="flex flex-col items-end">
              {product.offer_price ? (
                <>
                  <span className="text-xs line-through text-gray-400">{product.price} ج.م</span>
                  <span className="font-bold text-primary">{product.offer_price} ج.م</span>
                </>
              ) : (
                <span className="font-bold">{product.price} ج.م</span>
              )}
            </div>
          </div>
          {isOutOfStock ? (
            <button
              onClick={handleNotifyAvailability}
              className="w-full py-2 px-3 bg-gray-200 rounded-lg text-gray-700 flex items-center justify-center text-sm"
              aria-label="أعلمني عندما يصبح متوفر"
            >
              <Bell size={16} className="ml-1" />
              إشعار عند التوفر
            </button>
          ) : quantity === 0 ? (
            <button
              onClick={handleAddToCart}
              className="add-to-cart-btn empty w-full hover-scale"
              aria-label="إضافة إلى السلة"
            >
              <Plus size={18} color="white" />
              إضافة للسلة
            </button>
          ) : (
            <div className="add-to-cart-btn has-items" onClick={(e) => e.preventDefault()}>
              <div className="flex items-center justify-between w-full">
                <button onClick={handleDecreaseQuantity} aria-label="تقليل الكمية">
                  <Minus size={16} color="white" />
                </button>
                <span className="mx-2 text-white">{quantity}</span>
                <button onClick={handleIncreaseQuantity} aria-label="زيادة الكمية">
                  <Plus size={16} color="white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
