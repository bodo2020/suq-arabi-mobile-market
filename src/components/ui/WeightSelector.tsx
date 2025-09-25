
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Input } from './input';
import { Scale } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

interface WeightSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

const WeightSelector = ({ product, isOpen, onClose }: WeightSelectorProps) => {
  const { items, addToCart } = useCart();
  const { user } = useUser();
  const { toast } = useToast();
  
  // Find if this product is already in cart to get initial weight
  const existingItem = items.find(item => 
    item.product.id === product.id && 
    item.unit_of_measure === 'weight'
  );
  
  const [weight, setWeight] = useState(existingItem ? existingItem.quantity : 100);
  
  useEffect(() => {
    // Update weight if the product is already in cart
    if (existingItem) {
      setWeight(existingItem.quantity);
    }
  }, [existingItem]);
  
  const pricePerKg = product.offer_price || product.price || 0;
  const total = (pricePerKg * weight) / 1000; // تحويل الجرامات إلى كيلوجرام لحساب السعر

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "يرجى تسجيل الدخول أولاً لإضافة المنتجات للسلة",
        variant: "destructive"
      });
      onClose();
      return;
    }
    
    addToCart({
      ...product,
      price: product.price, // نحتفظ بالسعر الأصلي للكيلو
      quantity: weight, // تخزين الوزن بالجرام
      unit_of_measure: 'weight' // تحديد أن هذا منتج يباع بالوزن
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>تحديد الوزن</DialogTitle>
          <DialogDescription>
            يرجى اختيار الوزن المطلوب بالجرام
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

          <div className="flex justify-between items-center text-sm">
            <span>الإجمالي:</span>
            <span className="font-bold">{total.toFixed(2)} ج.م</span>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-primary text-white py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            {existingItem ? 'تحديث الكمية' : 'إضافة للسلة'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeightSelector;
