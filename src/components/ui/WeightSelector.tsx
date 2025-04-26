
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Input } from './input';
import { Button } from './button';
import { Scale } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';

interface WeightSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: () => void;
}

const WeightSelector = ({ product, isOpen, onClose, onAddToCart }: WeightSelectorProps) => {
  const [weight, setWeight] = useState<number>(100);
  const { addToCart } = useCart();
  
  const pricePerKg = product.price || 0;
  const total = (pricePerKg * weight) / 1000; // تحويل الوزن من جرام إلى كيلوجرام لحساب السعر

  const handleAddToCart = () => {
    addToCart({
      ...product,
      price: total, // السعر المحسوب بناءً على الوزن
      quantity: weight // الوزن بالجرام
    });
    onClose();
    if (onAddToCart) onAddToCart();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>تحديد الوزن</DialogTitle>
          <DialogDescription>
            يرجى تحديد الوزن المطلوب بالجرام
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Scale size={20} className="text-gray-500" />
            <Input
              type="number"
              min="100"
              step="100"
              value={weight}
              onChange={(e) => setWeight(parseInt(e.target.value) || 100)}
              className="w-full"
            />
            <span className="text-sm text-gray-500">جرام</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>السعر للكيلو:</span>
            <span className="font-bold">{pricePerKg} ج.م</span>
          </div>

          <div className="flex justify-between items-center text-sm font-bold">
            <span>الإجمالي:</span>
            <span className="text-primary">{total.toFixed(2)} ج.م</span>
          </div>

          <Button onClick={handleAddToCart} className="w-full">
            إضافة للسلة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeightSelector;
