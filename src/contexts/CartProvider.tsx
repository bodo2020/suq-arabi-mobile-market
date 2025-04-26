
import React, { useState, useCallback } from 'react';
import { CartContextType, CartItem } from './cartTypes';
import { Product } from '@/lib/supabase';
import { useCartSync } from './cartSupabaseSync';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useCartSync(items, setItems);

  const addToCart = useCallback((product: Product & { 
    price: number; 
    quantity: number; 
    is_bulk?: boolean;
    unit_of_measure?: string;
  }) => {
    setItems(currentItems => {
      // تحسين البحث عن المنتجات في السلة مع مراعاة نوع المنتج (جملة/عادي)
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && 
        item.is_bulk === (product.is_bulk || false) && 
        item.unit_of_measure === product.unit_of_measure
      );
      
      // حساب الكمية المتوفرة لنفس المنتج من نفس النوع فقط (جملة أو عادي)
      const sameTypeItems = currentItems.filter(item => 
        item.product.id === product.id && 
        item.is_bulk === (product.is_bulk || false) &&
        item.unit_of_measure === product.unit_of_measure
      );
      
      const totalExistingQuantity = sameTypeItems.reduce((total, item) => {
        return total + item.quantity;
      }, 0);

      // حساب الكمية الجديدة التي سيتم إضافتها
      let newQuantity = product.quantity;
      
      // التأكد من أن الكمية المطلوبة متوفرة
      if (product.quantity + totalExistingQuantity > product.quantity) {
        newQuantity = Math.max(0, product.quantity - totalExistingQuantity);
        
        if (newQuantity <= 0) {
          return currentItems;
        }
      }

      // استبعاد المنتج الموجود من القائمة للتحديث لاحقًا
      const otherItems = currentItems.filter(item => 
        !(item.product.id === product.id && 
          item.is_bulk === (product.is_bulk || false) &&
          item.unit_of_measure === product.unit_of_measure)
      );
      
      // إذا كان المنتج موجود بالفعل، قم بتحديث الكمية
      if (existingItem) {
        return [
          ...otherItems,
          {
            ...existingItem,
            quantity: existingItem.quantity + product.quantity
          }
        ];
      }
      
      // إذا لم يكن المنتج موجودًا، أضفه كعنصر جديد
      return [...currentItems, {
        product: {
          ...product,
          bulk_quantity: product.bulk_quantity || 1,
        },
        quantity: product.quantity,
        is_bulk: product.is_bulk || false,
        unit_of_measure: product.unit_of_measure
      }];
    });
  }, []);

  // تحديث دالة removeFromCart لتأخذ في الاعتبار نوع المنتج (عادي/جملة)
  const removeFromCart = useCallback((productId: string, is_bulk?: boolean) => {
    setItems(currentItems => {
      if (is_bulk !== undefined) {
        return currentItems.filter(item => 
          !(item.product.id === productId && item.is_bulk === is_bulk)
        );
      }
      return currentItems.filter(item => item.product.id !== productId);
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.is_bulk) {
        return total + (item.quantity * (item.product.bulk_quantity || 1));
      }
      return total + item.quantity;
    }, 0);
  }, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number, is_bulk?: boolean) => {
    if (quantity <= 0) {
      removeFromCart(productId, is_bulk);
      return;
    }

    setItems(currentItems => {
      // أولاً، نجد العنصر المراد تحديثه بناءً على معرف المنتج ونوعه (جملة/عادي)
      const targetItem = currentItems.find(item => 
        item.product.id === productId && item.is_bulk === (is_bulk || false)
      );
      
      // إذا لم يتم العثور على العنصر، لا نقوم بأي تغيير
      if (!targetItem) return currentItems;
      
      // نحذف العنصر القديم من القائمة
      const otherItems = currentItems.filter(item => 
        !(item.product.id === productId && item.is_bulk === (is_bulk || false))
      );
      
      // نضيف العنصر بعد تحديث الكمية
      return [
        ...otherItems,
        {
          ...targetItem,
          quantity: quantity
        }
      ];
    });
  }, [removeFromCart]);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.is_bulk) {
        return total + (item.product.bulk_price || 0) * item.quantity;
      }
      
      if (item.unit_of_measure === 'weight') {
        const pricePerKg = item.product.offer_price || item.product.price || 0;
        return total + (pricePerKg * (item.quantity / 1000));
      }
      
      const price = item.product.offer_price || item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  }, [items]);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};
