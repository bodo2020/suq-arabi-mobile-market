
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Minus } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { items, addToCart, updateQuantity } = useCart();
  
  const cartItem = items.find(item => item.product.id === product.id);
  const quantity = cartItem?.quantity || 0;
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
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

  // Use the first image from image_urls array, or a placeholder
  const productImage = product.image_urls && product.image_urls.length > 0 
    ? product.image_urls[0] 
    : '/placeholder.svg';

  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <button 
        className="favorite-btn" 
        onClick={toggleFavorite}
        aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
      >
        <Heart fill={isFavorite ? "red" : "none"} color={isFavorite ? "red" : "currentColor"} size={20} />
      </button>
      
      <div className="relative pt-[100%] mb-2">
        <img 
          src={productImage} 
          alt={product.name} 
          className="absolute top-0 left-0 w-full h-full object-contain"
        />
      </div>
      
      <div className="text-right">
        <h3 className="font-bold text-sm mb-1 line-clamp-1">{product.name}</h3>
        
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            {product.offer_price ? (
              <>
                <span className="text-xs line-through text-gray-500">{product.price} ر.س</span>
                <span className="font-bold text-primary">{product.offer_price} ر.س</span>
              </>
            ) : (
              <span className="font-bold">{product.price} ر.س</span>
            )}
          </div>
          
          {quantity === 0 ? (
            <button 
              onClick={handleAddToCart}
              className="add-to-cart-btn empty"
              aria-label="إضافة إلى السلة"
            >
              <Plus size={18} color="white" />
            </button>
          ) : (
            <div 
              className="add-to-cart-btn has-items"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleDecreaseQuantity}
                  aria-label="تقليل الكمية"
                >
                  <Minus size={16} color="white" />
                </button>
                <span className="mx-2 text-white">{quantity}</span>
                <button 
                  onClick={handleIncreaseQuantity}
                  aria-label="زيادة الكمية"
                >
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
