
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Input } from './input';
import { Scale } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';

interface WeightSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const WeightSelector = ({ product, isOpen, onClose }: WeightSelectorProps) => {
  const [weight, setWeight] = useState(100);
  const { addToCart } = useCart();
  
  const pricePerKg = product.price || 0;
  const total = (pricePerKg * weight) / 1000; // Convert grams to kg for price calculation

  const handleAddToCart = () => {
    addToCart({
      ...product,
      price: product.price || 0,
      quantity: weight // Store weight in grams
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>تحديد الوزن</DialogTitle>
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

          <div className="flex justify-between items-center text-sm">
            <span>الإجمالي:</span>
            <span className="font-bold">{total.toFixed(2)} ج.م</span>
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

export default WeightSelector;
