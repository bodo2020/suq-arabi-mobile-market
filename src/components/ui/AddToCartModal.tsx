
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';

interface AddToCartModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const AddToCartModal = ({ product, isOpen, onClose }: AddToCartModalProps) => {
  const [saleType, setSaleType] = useState<'normal' | 'bulk'>('normal');
  const [quantity, setQuantity] = useState(1);
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  
  useEffect(() => {
    if (saleType === 'bulk' && product.bulk_quantity) {
      setQuantity(product.bulk_quantity);
    } else {
      setQuantity(1);
    }
  }, [saleType, product.bulk_quantity]);

  const handleAddToCart = () => {
    const existingQuantity = items.reduce((total, item) => 
      item.product.id === product.id ? total + item.quantity : total, 0
    );
    
    const totalQuantity = existingQuantity + quantity;

    if (totalQuantity > product.quantity) {
      toast({
        title: "تنبيه",
        description: "الكمية المطلوبة غير متوفرة",
        variant: "destructive"
      });
      return;
    }

    if (saleType === 'bulk') {
      if (!product.bulk_quantity || quantity < product.bulk_quantity) {
        toast({
          title: "تنبيه",
          description: `الحد الأدنى للبيع بالجملة هو ${product.bulk_quantity} قطعة`,
          variant: "destructive"
        });
        return;
      }
    }

    const price = saleType === 'bulk' ? product.bulk_price : (product.offer_price || product.price);
    
    addToCart({
      ...product,
      price: price || 0,
      quantity,
      is_bulk: saleType === 'bulk'
    });
    
    onClose();
  };

  // السعر بناءً على نوع البيع
  const currentPrice = saleType === 'bulk' 
    ? product.bulk_price 
    : (product.offer_price || product.price);
  
  // حساب الإجمالي - في حالة الجملة، السعر هو للكمية كاملة وليس للوحدة
  const total = saleType === 'bulk' 
    ? (currentPrice || 0) // سعر الجملة هو السعر الإجمالي
    : (currentPrice || 0) * quantity; // في حالة البيع العادي، نضرب السعر × الكمية

  // الحد الأدنى للكمية بناءً على نوع البيع
  const minQuantity = saleType === 'bulk' ? (product.bulk_quantity || 1) : 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>إضافة للسلة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">نوع البيع</label>
            <Select value={saleType} onValueChange={(value: 'normal' | 'bulk') => setSaleType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع البيع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">قطعة</SelectItem>
                {product.bulk_enabled && (
                  <SelectItem value="bulk">جملة</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">الكمية</label>
            <Input
              type="number"
              min={minQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || minQuantity)}
              className="w-full"
            />
            {saleType === 'bulk' && product.bulk_quantity && (
              <p className="text-xs text-gray-500">
                (الحد الأدنى للجملة: {product.bulk_quantity})
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>السعر:</span>
            <span className="font-bold">
              {saleType === 'bulk' 
                ? `${product.bulk_price} ج.م (سعر الجملة)` 
                : `${currentPrice} ج.م ${product.offer_price ? '(عرض)' : ''}`}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>الإجمالي:</span>
            <span className="font-bold">{total} ج.م</span>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            إضافة للسلة
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal;
