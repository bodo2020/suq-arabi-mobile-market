
import React from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/supabase';
import FavoriteButton from './FavoriteButton';
import { Button } from './button';
import { useCart } from '@/contexts/useCart';

interface ProductCardProps {
  product: Product;
  hideAddToCart?: boolean;
  size?: 'default' | 'sm';
}

const ProductCard = ({ product, hideAddToCart, size = 'default' }: ProductCardProps) => {
  const { items, addToCart } = useCart();
  
  const bulkItemInCart = items.find(item => 
    item.product.id === product.id && item.is_bulk
  );

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.is_weight_based) {
      // Don't add to cart, let the link navigate to product detail
      return;
    }

    addToCart({
      ...product,
      price: product.price || 0,
      quantity: 1
    });
  };

  return (
    <Link to={`/product/${product.id}`} className="group">
      <div className={cn(
        "relative bg-white rounded-lg overflow-hidden border hover:border-primary transition-colors",
        size === 'sm' ? 'h-44' : 'h-64'
      )}>
        <div className="relative h-full">
          {product.image_urls && product.image_urls.length > 0 ? (
            <img 
              src={product.image_urls[0]} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src="/placeholder.svg" 
              alt="Placeholder" 
              className="w-full h-full object-cover"
            />
          )}
          
          <FavoriteButton productId={product.id} className="absolute top-2 left-2" />
          
          {bulkItemInCart && (
            <div className="absolute bottom-2 right-2 bg-[#d3ffb3] text-[#005931] text-sm rounded-full px-3 py-1 flex items-center gap-2">
              <Package className="w-4 h-4" />
              {product.bulk_quantity} قطعة
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <h3 className={cn(
          "font-medium line-clamp-2",
          size === 'sm' ? 'text-sm' : 'text-base'
        )}>
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {product.offer_price ? (
              <>
                <div className="text-primary font-bold">
                  {product.offer_price} ج.م
                  {product.is_weight_based && <span className="text-sm font-normal">/كجم</span>}
                </div>
                <div className="text-gray-400 line-through text-sm">
                  {product.price} ج.م
                  {product.is_weight_based && <span className="text-sm font-normal">/كجم</span>}
                </div>
              </>
            ) : (
              <div className="text-primary font-bold">
                {product.price} ج.م
                {product.is_weight_based && <span className="text-sm font-normal">/كجم</span>}
              </div>
            )}
          </div>

          {!hideAddToCart && (
            <Button 
              variant={product.is_weight_based ? "secondary" : "default"}
              size="sm" 
              onClick={handleAddToCart}
            >
              {product.is_weight_based ? 'تحديد الوزن' : 'إضافة للسلة'}
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
