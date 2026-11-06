
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';

interface AddToCartModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const AddToCartModal = ({ product, isOpen, onClose }: AddToCartModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const { user } = useUser();

  useEffect(() => {
    setQuantity(1); // default to 1 pack
  }, [product.id]);

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول أولاً لإضافة المنتجات للشنطة",
        variant: "destructive"
      });
      onClose();
      return;
    }
    
    // Existing units (consider bulk packs in cart)
    const existingUnits = items.reduce((total, item) => {
      if (item.product.id !== product.id) return total;
      if (item.is_bulk) {
        return total + item.quantity * (item.product.bulk_quantity || 1);
      }
      return total + item.quantity;
    }, 0);

    const unitsPerPack = product.bulk_quantity || 1;
    const unitsToAdd = quantity * unitsPerPack; // quantity = packs

    if (existingUnits + unitsToAdd > (product.quantity || 0)) {
      toast({
        title: "تنبيه",
        description: "الكمية المطلوبة غير متوفرة",
        variant: "destructive"
      });
      return;
    }

    addToCart({
      ...product,
      price: product.bulk_price || 0,
      quantity, // packs
      is_bulk: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>إضافة للشنطة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">الكمية</label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            {product.bulk_quantity && (
              <p className="text-xs text-gray-500">
                (حجم العبوة: {product.bulk_quantity} قطعة)
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>السعر:</span>
            <span className="font-bold">{product.bulk_price} ج.م (سعر الجملة)</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>الإجمالي:</span>
            <span className="font-bold">{(product.bulk_price || 0) * quantity} ج.م</span>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            إضافة للشنطة
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToCartModal;

