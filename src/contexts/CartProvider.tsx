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
      const existingItems = currentItems.filter(item => 
        item.product.id === product.id
      );
      
      const totalExistingQuantity = existingItems.reduce((total, item) => {
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
        !(item.product.id === product.id && item.is_bulk === product.is_bulk)
      );
      
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
        currentItems.filter(item => item.product.id !== productId)
      );
      return;
    }

    setItems(currentItems => {
      const allItemsOfProduct = currentItems.filter(item => item.product.id === productId);
      const otherItems = currentItems.filter(item => item.product.id !== productId);
      
      if (allItemsOfProduct.length === 0) return currentItems;
      
      const product = allItemsOfProduct[0].product;
      
      const totalExistingQuantity = allItemsOfProduct.reduce(
        (total, item) => item.is_bulk ? 
          total + (item.quantity * (item.product.bulk_quantity || 1)) : 
          total + item.quantity, 
        0
      );
      
      let targetQuantity = is_bulk !== undefined && is_bulk ?
        quantity * (product.bulk_quantity || 1) : 
        quantity;
      
      if (targetQuantity > product.quantity) {
        targetQuantity = product.quantity;
      }
      
      const newItems = [];
      
      if (product.bulk_quantity && product.bulk_price && product.bulk_enabled) {
        const bulkUnits = Math.floor(targetQuantity / product.bulk_quantity);
        const remainingQuantity = targetQuantity % product.bulk_quantity;
        
        if (bulkUnits > 0) {
          newItems.push({
            product,
            quantity: bulkUnits,
            is_bulk: true,
            unit_of_measure: product.unit_of_measure
          });
        }
        
        if (remainingQuantity > 0) {
          newItems.push({
            product,
            quantity: remainingQuantity,
            is_bulk: false,
            unit_of_measure: product.unit_of_measure
          });
        }
      } else {
        newItems.push({
          product,
          quantity: targetQuantity,
          is_bulk: false,
          unit_of_measure: product.unit_of_measure
        });
      }
      
      return [...otherItems, ...newItems];
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
