import React, { useState, useCallback } from 'react';
import { CartContextType, CartItem } from './cartTypes';
import { Product } from '@/lib/supabase';
import { useCartSync } from './cartSupabaseSync';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useCartSync(items, setItems, isInitialized, setIsInitialized);

  const addToCart = useCallback((product: Product & { 
    price: number; 
    quantity: number; 
    is_bulk?: boolean;
    unit_of_measure?: string;
  }) => {
    setItems(currentItems => {
      console.log('Adding to cart:', { productId: product.id, is_bulk: product.is_bulk, unit_of_measure: product.unit_of_measure });
      
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && 
        item.is_bulk === (product.is_bulk || false) && 
        item.unit_of_measure === product.unit_of_measure
      );
      
      if (existingItem) {
        console.log('Item exists, updating quantity from', existingItem.quantity, 'to', existingItem.quantity + product.quantity);
        
        const otherItems = currentItems.filter(item => 
          !(item.product.id === product.id && 
            item.is_bulk === (product.is_bulk || false) &&
            item.unit_of_measure === product.unit_of_measure)
        );
        
        return [
          ...otherItems,
          {
            ...existingItem,
            quantity: existingItem.quantity + product.quantity
          }
        ];
      }
      
      console.log('Adding new item to cart');
      return [...currentItems, {
        product: {
          ...product,
          bulk_quantity: product.bulk_quantity || 1,
          barcode: product.is_bulk ? product.bulk_barcode : product.barcode
        },
        quantity: product.quantity,
        is_bulk: product.is_bulk || false,
        unit_of_measure: product.unit_of_measure
      }];
    });
  }, []);

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
    return items.length;
  }, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number, is_bulk?: boolean) => {
    if (quantity <= 0) {
      removeFromCart(productId, is_bulk);
      return;
    }

    setItems(currentItems => {
      const targetItem = currentItems.find(item => 
        item.product.id === productId && item.is_bulk === (is_bulk || false)
      );
      
      if (!targetItem) return currentItems;
      
      const otherItems = currentItems.filter(item => 
        !(item.product.id === productId && item.is_bulk === (is_bulk || false))
      );
      
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

  const getCartTotal = useCallback(() => {
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
      cart: { items }, // Adding the cart property
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      getCartTotal, // Adding the getCartTotal function
      isInitialized
    }}>
      {children}
    </CartContext.Provider>
  );
};
