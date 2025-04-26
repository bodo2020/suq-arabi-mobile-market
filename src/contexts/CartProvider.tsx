import React, { useState, useCallback } from 'react';
import { CartContextType, CartItem } from './cartTypes';
import { Product } from '@/lib/supabase';
import { useCartSync } from './cartSupabaseSync';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useCartSync(items, setItems);

  const addToCart = useCallback((product: Product & { price: number; quantity: number; is_bulk?: boolean }) => {
    setItems(currentItems => {
      const idx = currentItems.findIndex(item => 
        item.product.id === product.id && item.is_bulk === product.is_bulk
      );
      
      if (idx > -1) {
        const updated = [...currentItems];
        if (product.is_bulk) {
          updated[idx] = { 
            ...updated[idx],
            is_bulk: true,
            quantity: 1
          };
        } else {
          updated[idx] = { 
            ...updated[idx], 
            quantity: updated[idx].quantity + (product.quantity || 1),
            is_bulk: false
          };
        }
        return updated;
      }
      
      return [...currentItems, { 
        product, 
        quantity: product.is_bulk ? 1 : (product.quantity || 1),
        is_bulk: product.is_bulk
      }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, is_bulk?: boolean) => {
    if (quantity <= 0) {
      setItems(currentItems => 
        currentItems.filter(item => !(item.product.id === productId && item.is_bulk === is_bulk))
      );
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId && item.is_bulk === is_bulk
          ? { ...item, quantity: item.is_bulk ? 1 : quantity }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
      if (item.is_bulk) {
        return total + (item.product.bulk_price || 0);
      }
      const price = item.product.offer_price || item.product.price;
      return total + price * item.quantity;
    }, 0);
  }, [items]);

  const getTotalItems = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
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
