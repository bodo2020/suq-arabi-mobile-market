import type { CartItem as BaseCartItem, Product } from '@/lib/supabase';

export type CommerceSource = 'owned' | 'marketplace';

export type CommerceProductInput = Product & {
  price: number;
  quantity: number;
  is_bulk?: boolean;
  unit_of_measure?: string;
  commerce_source?: CommerceSource;
  marketplace_listing_id?: string | null;
  merchant_id?: string | null;
  merchant_name?: string | null;
  marketplace_branch_id?: string | null;
  marketplace_branch_name?: string | null;
};

export type CartItem = BaseCartItem & {
  is_bulk?: boolean;
  unit_of_measure?: string;
  barcode?: string;
  commerce_source?: CommerceSource;
  marketplace_listing_id?: string | null;
  merchant_id?: string | null;
  merchant_name?: string | null;
  marketplace_branch_id?: string | null;
  marketplace_branch_name?: string | null;
};

export type CartAddResult = 'added' | 'conflict' | 'limit' | 'not_ready';

export const cartSourceIdentity = (item: CartItem) => item.commerce_source === 'marketplace'
  ? `marketplace:${item.merchant_id || ''}:${item.marketplace_branch_id || ''}`
  : 'owned';

export const cartItemIdentity = (item: CartItem) => item.commerce_source === 'marketplace'
  ? `${cartSourceIdentity(item)}:${item.marketplace_listing_id || item.product.id}:${!!item.is_bulk}:${item.unit_of_measure || ''}`
  : `owned:${item.product.id}:${!!item.is_bulk}:${item.unit_of_measure || ''}`;

export const cartSourceIdentities = (items: CartItem[]) => [...new Set(items.map(cartSourceIdentity))];

export const marketplaceBranchIds = (items: CartItem[]) => [...new Set(
  items
    .filter(item => item.commerce_source === 'marketplace')
    .map(item => item.marketplace_branch_id)
    .filter((value): value is string => Boolean(value)),
)];

export const isMarketplaceCart = (items: CartItem[]) =>
  items.length > 0 && items.every(item => item.commerce_source === 'marketplace');

export const isSingleMarketplaceCart = (items: CartItem[]) =>
  isMarketplaceCart(items) && marketplaceBranchIds(items).length === 1;

export const isCombinedCart = (items: CartItem[]) => cartSourceIdentities(items).length > 1;

export type CartContextType = {
  items: CartItem[];
  cart: { items: CartItem[] };
  addToCart: (product: CommerceProductInput) => CartAddResult;
  removeFromCart: (productId: string, is_bulk?: boolean, listingId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, is_bulk?: boolean, listingId?: string | null) => void;
  clearCart: () => void;
  clearCartIfUnchanged: (matches: (current: CartItem[]) => boolean) => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getCartTotal: () => number;
  isInitialized: boolean;
  syncError: string | null;
  isSaving: boolean;
  retrySync: () => void;
};

