
import React, { useState, useCallback } from 'react';
import { CartContextType } from './cartTypes';
import { CartItem, Product } from '@/lib/supabase';
import { useCartSync } from './cartSupabaseSync';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Use the useCartSync hook for syncing with Supabase & localStorage
  useCartSync(items, setItems);

  const addToCart = useCallback((product: Product) => {
    setItems(currentItems => {
      const idx = currentItems.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const updated = [...currentItems];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...currentItems, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
      return;
    }
    setItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalPrice = useCallback(() => {
    return items.reduce((total, item) => {
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
