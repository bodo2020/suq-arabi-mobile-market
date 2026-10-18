import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  CartContextType,
  CartItem,
  CommerceProductInput,
  cartItemIdentity,
  type CartAddResult,
} from './cartTypes';
import { useCartSync } from './cartSupabaseSync';
import { useUser } from './UserContext';
import { canCombineStores, defaultCheckoutStores, storeKey, subtractPurchasedItems, type PurchasedCartSource } from '@/lib/storeCarts';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const sync = useCartSync(items, setItems, isInitialized, setIsInitialized);
  const { user } = useUser();
  const ownerKey = user?.id || 'guest';
  const [selection, setSelection] = useState<Record<string, string[]>>({});
  const completed = useRef(new Set<string>());
  const selectedStoreKeys = useMemo(() => {
    let saved = selection[ownerKey];
    if (!saved) {
      try { const value = JSON.parse(localStorage.getItem(`checkout-stores:${ownerKey}`) || 'null');
        if (Array.isArray(value) && value.every(key => typeof key === 'string') && canCombineStores(value)) saved = value;
      } catch { /* use the current carts */ }
    }
    return (saved || defaultCheckoutStores(items)).filter(key => items.some(item => storeKey(item) === key));
  }, [items, ownerKey, selection]);
  const checkoutItems = useMemo(() => items.filter(item => selectedStoreKeys.includes(storeKey(item))), [items, selectedStoreKeys]);
  const toggleCheckoutStore = useCallback((key: string) => {
    const next = selectedStoreKeys.includes(key) ? selectedStoreKeys.filter(value => value !== key) : [...selectedStoreKeys, key];
    if (!canCombineStores(next)) return false;
    setSelection(current => ({ ...current, [ownerKey]: next }));
    try { localStorage.setItem(`checkout-stores:${ownerKey}`, JSON.stringify(next)); } catch { /* in-memory selection remains */ }
    return true;
  }, [selectedStoreKeys, ownerKey]);
  const completeCheckout = useCallback((requestId: string, sources: PurchasedCartSource[]) => {
    if (!isInitialized) return;
    const key = `cart-completed:${ownerKey}:${requestId}`;
    if (completed.current.has(key)) return;
    try { if (localStorage.getItem(key)) return; } catch { /* memory guard remains */ }
    completed.current.add(key);
    setItems(current => {
      const next = subtractPurchasedItems(current, sources);
      try { localStorage.setItem(ownerKey === 'guest' ? 'guest_cart' : 'pending_cart:' + ownerKey, JSON.stringify(next)); } catch { /* normal cart sync retries persistence */ }
      return next;
    });
    try { localStorage.setItem(key, '1'); } catch { /* guarded in memory */ }
  }, [isInitialized, ownerKey]);


  const addToCart = useCallback((product: CommerceProductInput): CartAddResult => {
    if (!isInitialized) return 'not_ready';

    if (product.commerce_source === 'marketplace') {
      if (!product.marketplace_branch_id || !product.merchant_id || !product.marketplace_listing_id) {
        return 'conflict';
      }

    }

    const nextItem: CartItem = {
      product: {
        ...product,
        bulk_quantity: product.bulk_quantity || 1,
        barcode: product.is_bulk ? product.bulk_barcode : product.barcode,
      },
      quantity: product.quantity,
      is_bulk: product.is_bulk || false,
      unit_of_measure: product.unit_of_measure,
      commerce_source: product.commerce_source || 'owned',
      marketplace_listing_id: product.marketplace_listing_id || null,
      merchant_id: product.merchant_id || null,
      merchant_name: product.merchant_name || null,
      marketplace_branch_id: product.marketplace_branch_id || null,
      marketplace_branch_name: product.marketplace_branch_name || null,
    };

    setItems(currentItems => {
      const identity = cartItemIdentity(nextItem);
      const existingItem = currentItems.find(item => cartItemIdentity(item) === identity);
      if (!existingItem) return [...currentItems, nextItem];
      return currentItems.map(item => cartItemIdentity(item) === identity
        ? { ...item, quantity: item.quantity + product.quantity }
        : item);
    });
    return 'added';
  }, [isInitialized, items]);

  const removeFromCart = useCallback((productId: string, is_bulk?: boolean, listingId?: string | null) => {
    if (!isInitialized) return;
    setItems(currentItems => currentItems.filter(item => {
      if (item.product.id !== productId) return true;
      if (listingId !== undefined && (item.marketplace_listing_id || null) !== listingId) return true;
      if (is_bulk === undefined) return false;
      return item.is_bulk !== is_bulk;
    }));
  }, [isInitialized]);

  const clearCart = useCallback(() => {
    if (!isInitialized) return;
    setItems([]);
  }, [isInitialized]);

  const getTotalItems = useCallback(() => items.length, [items]);

  const updateQuantity = useCallback((productId: string, quantity: number, is_bulk?: boolean, listingId?: string | null) => {
    if (quantity <= 0) {
      removeFromCart(productId, is_bulk, listingId);
      return;
    }
    if (!isInitialized) return;
    setItems(currentItems => currentItems.map(item => (
      item.product.id === productId && item.is_bulk === (is_bulk || false) && (listingId === undefined || (item.marketplace_listing_id || null) === listingId)
        ? { ...item, quantity }
        : item
    )));
  }, [removeFromCart, isInitialized]);

  const getTotalPrice = useCallback(() => items.reduce((total, item) => {
    if (item.is_bulk) return total + (item.product.bulk_price || 0) * item.quantity;
    if (item.unit_of_measure === 'weight') {
      const pricePerKg = item.product.offer_price || item.product.price || 0;
      return total + pricePerKg * (item.quantity / 1000);
    }
    const price = item.product.offer_price || item.product.price || 0;
    return total + price * item.quantity;
  }, 0), [items]);

  return (
    <CartContext.Provider value={{
      items,
      checkoutItems,
      selectedStoreKeys,
      toggleCheckoutStore,
      completeCheckout,
      cart: { items },
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      getCartTotal: getTotalPrice,
      isInitialized,
      ...sync,
    }}>
      {children}
    </CartContext.Provider>
  );
};
