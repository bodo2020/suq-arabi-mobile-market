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
      
      const totalExistingQuantity = existingItems.reduce((total, item) => total + item.quantity, 0);
      const newTotalQuantity = totalExistingQuantity + product.quantity;
      
      // Remove existing items with the same product ID
      const otherItems = currentItems.filter(item => item.product.id !== product.id);
      
      const bulkItems = [];
      const regularItems = [];
      let remainingQuantity = newTotalQuantity;
      
      // If bulk pricing is available and we have enough items
      if (product.bulk_quantity && product.bulk_price) {
        while (remainingQuantity >= product.bulk_quantity) {
          bulkItems.push({
            product: {
              ...product,
              bulk_quantity: product.bulk_quantity || 1,
            },
            quantity: 1, // One bulk unit
            is_bulk: true,
            unit_of_measure: product.unit_of_measure
          });
          remainingQuantity -= product.bulk_quantity;
        }
      }
      
      // Add remaining items at regular price if any
      if (remainingQuantity > 0) {
        regularItems.push({
          product: {
            ...product,
            bulk_quantity: product.bulk_quantity || 1,
          },
          quantity: remainingQuantity,
          is_bulk: false,
          unit_of_measure: product.unit_of_measure
        });
      }
      
      return [...otherItems, ...bulkItems, ...regularItems];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalItems = useCallback(() => {
    return items.length;
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
      const newItems = [];
      
      // If product has bulk pricing
      if (product.bulk_quantity && product.bulk_price) {
        const bulkUnits = Math.floor(quantity / product.bulk_quantity);
        const remainingQuantity = quantity % product.bulk_quantity;
        
        // Add bulk items
        if (bulkUnits > 0) {
          newItems.push({
            product,
            quantity: bulkUnits,
            is_bulk: true,
            unit_of_measure: product.unit_of_measure
          });
        }
        
        // Add remaining items at regular price
        if (remainingQuantity > 0) {
          newItems.push({
            product,
            quantity: remainingQuantity,
            is_bulk: false,
            unit_of_measure: product.unit_of_measure
          });
        }
      } else {
        // If no bulk pricing, just update quantity
        newItems.push({
          product,
          quantity,
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
        return total + (item.product.bulk_price || 0) * item.quantity * item.product.bulk_quantity;
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
