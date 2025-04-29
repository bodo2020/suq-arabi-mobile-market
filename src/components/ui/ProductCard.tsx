import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, AlertTriangle, Scale, Package } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import FavoriteButton from './FavoriteButton';
import AddToCartModal from './AddToCartModal';
import WeightSelector from './WeightSelector';

interface ProductCardProps {
  product: Product;
  hideIfUnavailable?: boolean;
  showBulkQuantity?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, hideIfUnavailable = false, showBulkQuantity = false }) => {
  const { items, updateQuantity, addToCart } = useCart();
  const { toast } = useToast();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showWeightSelector, setShowWeightSelector] = useState(false);

  const regularCartItem = items.find(item => item.product.id === product.id && !item.is_bulk);
  const bulkCartItem = items.find(item => item.product.id === product.id && item.is_bulk);
  
  const quantity = showBulkQuantity && bulkCartItem ? bulkCartItem.quantity : (regularCartItem?.quantity || 0);
  const isOutOfStock = product.quantity <= 0;

  if (hideIfUnavailable && isOutOfStock) {
    return null;
  }

  const handleAddToCart = (e: React.MouseEvent, isBulk: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      if (product.barcode_type === 'scale') {
        setShowWeightSelector(true);
      } else {
        const quantityToAdd = 1;
        
        addToCart({
          ...product,
          price: isBulk ? product.bulk_price || 0 : product.price || 0,
          quantity: quantityToAdd,
          is_bulk: isBulk
        });
        toast({
          title: "تم الإضافة",
          description: "تم إضافة المنتج إلى السلة",
        });
      }
    }
  };

  const handleIncreaseQuantity = (e: React.MouseEvent, isBulk: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cartItem = isBulk ? bulkCartItem : regularCartItem;
    
    if (product.unit_of_measure === 'weight') {
      setShowWeightSelector(true);
    } else if (cartItem) {
      const quantityToAdd = 1;
      
      const totalProductQuantity = items
        .filter(i => i.product.id === product.id)
        .reduce((total, i) => {
          if (i.is_bulk) {
            return total + (i.quantity * (i.product.bulk_quantity || 1));
          }
          return total + i.quantity;
        }, 0);
      
      const additionalUnitsNeeded = isBulk ? product.bulk_quantity || 1 : 1;
      
      if ((totalProductQuantity + additionalUnitsNeeded) <= product.quantity) {
        updateQuantity(product.id, cartItem.quantity + 1, isBulk);
        toast({
          title: "تم التحديث",
          description: "تم تحديث الكمية",
        });
      } else {
        toast({
          title: "تنبيه",
          description: "الكمية المطلوبة غير متوفرة",
          variant: "destructive"
        });
      }
    }
  };

  const handleDecreaseQuantity = (e: React.MouseEvent, isBulk: boolean = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    const cartItem = isBulk ? bulkCartItem : regularCartItem;
    
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(product.id, cartItem.quantity - 1, isBulk);
      toast({
        title: "تم التحديث",
        description: "تم تحديث الكمية",
      });
    } else if (cartItem) {
      updateQuantity(product.id, 0, isBulk);
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج من السلة",
      });
    }
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
  
  const displayBulkView = showBulkQuantity && product.bulk_enabled && product.bulk_quantity;
  const currentItemInCart = displayBulkView ? bulkCartItem : regularCartItem;
  const currentQuantity = currentItemInCart?.quantity || 0;

  const canPurchaseBulk = product.bulk_enabled && 
    product.bulk_quantity && 
    product.quantity >= product.bulk_quantity;

  return (
    <>
      <Link to={`/product/${product.id}`} className="product-card flex flex-col h-full hover-scale">
        <div className="absolute top-2 right-2 z-20">
          <FavoriteButton productId={product.id} size="md" />
        </div>

        <div className="relative pt-[100%] mb-3">
          <img
            src={productImage}
            alt={product.name}
            className="absolute top-0 right-0 w-full h-full object-contain"
          />
          {discount > 0 && !displayBulkView && (
            <div className="absolute left-2 top-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full shadow animate-fade-in">
              {discount}% خصم
            </div>
          )}
          {displayBulkView && (
            <Badge 
              variant="secondary"
              className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#d3ffb3] text-[#005931] border-0"
            >
              <Package className="h-3 w-3" />
              {product.bulk_quantity} قطعة
            </Badge>
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
              {displayBulkView ? (
                <span className="font-bold">{product.bulk_price} ج.م/وحدة</span>
              ) : product.barcode_type === 'scale' ? (
                <span className="font-bold">{product.price} ج.م/كجم</span>
              ) : product.offer_price ? (
                <>
                  <span className="text-xs line-through text-gray-400">{product.price} ج.م</span>
                  <span className="font-bold text-primary">{product.offer_price} ج.م</span>
                </>
              ) : (
                <span className="font-bold">{product.price} ج.م</span>
              )}
            </div>

            <div className="space-y-2">
              {isOutOfStock ? (
                <button
                  disabled
                  className="w-full py-2 px-3 bg-gray-200 rounded-lg text-gray-500 flex items-center justify-center text-sm"
                  aria-label="غير متوفر"
                >
                  <AlertTriangle size={16} className="ml-1" />
                  نفذت الكمية
                </button>
              ) : (
                <>
                  {regularCartItem || (!showBulkQuantity && !product.barcode_type) ? (
                    <div className="flex items-center justify-between bg-primary text-white rounded-lg p-1">
                      <button 
                        onClick={(e) => handleDecreaseQuantity(e, false)} 
                        className="p-1 hover:bg-primary-foreground/10 rounded"
                        aria-label="تقليل الكمية"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="mx-2">{regularCartItem?.quantity || 0}</span>
                      <button 
                        onClick={(e) => handleIncreaseQuantity(e, false)}
                        className="p-1 hover:bg-primary-foreground/10 rounded"
                        aria-label="زيادة الكمية"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleAddToCart(e, false)}
                      className="w-full py-2 px-3 bg-primary text-white rounded-lg flex items-center justify-center text-sm hover:bg-primary/90 transition-colors"
                      aria-label="إضافة إلى السلة"
                    >
                      إضافة للسلة
                    </button>
                  )}

                  {product.bulk_enabled && product.bulk_quantity && !showBulkQuantity && canPurchaseBulk && (
                    bulkCartItem ? (
                      <div className="flex items-center justify-between bg-[#d3ffb3] text-[#005931] rounded-lg p-1">
                        <button 
                          onClick={(e) => handleDecreaseQuantity(e, true)} 
                          className="p-2 hover:bg-[#c3ef93]/50 rounded"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={16} />
                        </button>
                        <div className="flex items-center mx-2">
                          <Package className="w-4 h-4 ml-1" />
                          <span>{bulkCartItem.quantity}</span>
                        </div>
                        <button 
                          onClick={(e) => handleIncreaseQuantity(e, true)}
                          className="p-2 hover:bg-[#c3ef93]/50 rounded"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleAddToCart(e, true)}
                        className="w-full py-2 px-3 bg-[#d3ffb3] text-[#005931] rounded-lg flex items-center justify-center text-sm hover:bg-[#c3ef93] transition-colors gap-2"
                        aria-label="إضافة للجملة"
                      >
                        <Package className="w-4 h-4" />
                        {product.bulk_price} ج.م ({product.bulk_quantity} قطعة)
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </Link>

      <AddToCartModal
        product={product}
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
      />
      <WeightSelector
        product={product}
        isOpen={showWeightSelector}
        onClose={() => setShowWeightSelector(false)}
      />
    </>
  );
};

export default ProductCard;
