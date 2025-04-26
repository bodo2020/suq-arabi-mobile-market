
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';

interface AddToCartModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const AddToCartModal = ({ product, isOpen, onClose }: AddToCartModalProps) => {
  const [saleType, setSaleType] = useState<'normal' | 'bulk'>('normal');
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  
  const handleAddToCart = () => {
    const price = saleType === 'bulk' ? product.bulk_price : product.price;
    addToCart({
      ...product,
      price: price || 0,
      quantity,
      is_bulk: saleType === 'bulk'
    });
    onClose();
  };

  const currentPrice = saleType === 'bulk' ? product.bulk_price : product.price;
  const total = (currentPrice || 0) * quantity;

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
                <SelectItem value="bulk">جملة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">الكمية</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full"
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>السعر للقطعة:</span>
            <span className="font-bold">{currentPrice} ج.م</span>
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
