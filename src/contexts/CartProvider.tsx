
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
      const existingItem = currentItems.find(item => 
        item.product.id === product.id && item.is_bulk === (product.is_bulk || false)
      );
      
      const allProductItems = currentItems.filter(item => 
        item.product.id === product.id
      );
      
      const totalExistingQuantity = allProductItems.reduce((total, item) => {
        if (item.is_bulk) {
          return total + (item.quantity * (item.product.bulk_quantity || 1));
        }
        return total + item.quantity;
      }, 0);

      let newQuantity = product.is_bulk ? 
        product.bulk_quantity || 1 : // If bulk, add full bulk quantity
        1; // If regular, add one item
      
      if (totalExistingQuantity + newQuantity > product.quantity) {
        newQuantity = Math.max(0, product.quantity - totalExistingQuantity);
        
        if (newQuantity <= 0) {
          return currentItems;
        }
      }

      const otherItems = currentItems.filter(item => 
        !(item.product.id === product.id && item.is_bulk === (product.is_bulk || false))
      );
      
      if (existingItem) {
        return [
          ...otherItems,
          {
            ...existingItem,
            quantity: existingItem.quantity + (product.is_bulk ? 1 : newQuantity)
          }
        ];
      }
      
      return [...otherItems, {
        product: {
          ...product,
          bulk_quantity: product.bulk_quantity || 1,
        },
        quantity: product.is_bulk ? 1 : newQuantity,
        is_bulk: product.is_bulk || false,
        unit_of_measure: product.unit_of_measure
      }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
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
      setItems(currentItems => 
        currentItems.filter(item => 
          !(item.product.id === productId && item.is_bulk === (is_bulk || false))
        )
      );
      return;
    }

    setItems(currentItems => {
      const allItemsOfProduct = currentItems.filter(item => item.product.id === productId);
      
      const targetItem = currentItems.find(item => 
        item.product.id === productId && item.is_bulk === (is_bulk || false)
      );
      
      const otherItems = currentItems.filter(item => 
        !(item.product.id === productId && item.is_bulk === (is_bulk || false))
      );
      
      if (allItemsOfProduct.length === 0 || !targetItem) return currentItems;
      
      const product = targetItem.product;
      
      const otherQuantity = allItemsOfProduct
        .filter(item => !(item.is_bulk === (is_bulk || false)))
        .reduce((total, item) => {
          if (item.is_bulk) {
            return total + (item.quantity * (item.product.bulk_quantity || 1));
          }
          return total + item.quantity;
        }, 0);
      
      let targetQuantity = is_bulk ? 
        quantity * (product.bulk_quantity || 1) : 
        quantity;
      
      const maxAvailable = Math.max(0, product.quantity - otherQuantity);
      if (targetQuantity > maxAvailable) {
        targetQuantity = maxAvailable;
      }
      
      if (targetQuantity <= 0) {
        return currentItems;
      }
      
      return [
        ...otherItems,
        {
          product,
          quantity: is_bulk ? quantity : targetQuantity,
          is_bulk: is_bulk || false,
          unit_of_measure: targetItem.unit_of_measure
        }
      ];
    });
  }, []);

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
