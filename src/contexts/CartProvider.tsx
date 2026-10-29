import React, { useCallback, useState } from 'react';
import {
  CartContextType,
  CartItem,
  CommerceProductInput,
  cartItemIdentity,
  marketplaceBranchIds,
  type CartAddResult,
  type SmartBundleLine,
} from './cartTypes';
import { useCartSync } from './cartSupabaseSync';

export const CartContext = React.createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const sync = useCartSync(items, setItems, isInitialized, setIsInitialized);

  const addToCart = useCallback((product: CommerceProductInput): CartAddResult => {
    if (!isInitialized) return 'not_ready';

    if (product.commerce_source === 'marketplace') {
      if (!product.marketplace_branch_id || !product.merchant_id || !product.marketplace_listing_id) {
        return 'conflict';
      }
      const partnerBranches = marketplaceBranchIds(items);
      const isExistingPartner = partnerBranches.includes(product.marketplace_branch_id);
      if (!isExistingPartner && partnerBranches.length >= 2) {
        window.dispatchEvent(new CustomEvent('cart-source-conflict', {
          detail: {
            reason: 'partner_limit',
            incomingMerchant: product.merchant_name || 'المتجر الجديد',
            partnerCount: partnerBranches.length,
          },
        }));
        return 'limit';
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
    window.dispatchEvent(new Event('super-marko:cart-added'));
    return 'added';
  }, [isInitialized, items]);

  const addBundleToCart = useCallback((lines: SmartBundleLine[]): 'added' | 'not_ready' | 'conflict' => {
    if (!isInitialized) return 'not_ready';
    if (lines.length === 0 || lines.length > 30) return 'conflict';
    const aggregate = new Map<string, { product: SmartBundleLine['product']; quantity: number }>();
    for (const line of lines) {
      const p = line.product;
      if (!p?.id || (p.commerce_source && p.commerce_source !== 'owned') ||
          !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99 ||
          !Number.isFinite(Number(p.price)) || Number(p.price) < 0) return 'conflict';
      const existing = aggregate.get(p.id);
      aggregate.set(p.id, { product: p, quantity: (existing?.quantity || 0) + line.quantity });
    }
    // All-or-nothing validation, including existing basket quantities.
    for (const { product, quantity } of aggregate.values()) {
      const existing = items.find(i => i.product.id === product.id && !i.is_bulk && i.commerce_source !== 'marketplace');
      const limit = Math.floor(Number(product.quantity || 0));
      if (!Number.isFinite(limit) || limit < quantity + (existing?.quantity || 0)) return 'conflict';
      if (product.unit_of_measure === 'weight') return 'conflict'; // Weighted items need a dedicated gram selector.
    }
    const newLines = [...aggregate.values()];
    setItems(current => {
      const next = [...current];
      for (const { product, quantity } of newLines) {
        const index = next.findIndex(i => i.product.id === product.id && !i.is_bulk && i.commerce_source !== 'marketplace');
        if (index < 0) {
          next.push({
            product: { ...product, bulk_quantity: product.bulk_quantity || 1 },
            quantity, is_bulk: false, commerce_source: 'owned',
          });
        } else next[index] = { ...next[index], quantity: next[index].quantity + quantity };
      }
      return next;
    });
    window.dispatchEvent(new Event('super-marko:cart-added'));
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
      cart: { items },
      addToCart,
      addBundleToCart,
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
