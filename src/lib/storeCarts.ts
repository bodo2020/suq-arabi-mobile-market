import type { CartItem } from '@/contexts/cartTypes';

export const storeKey = (item: CartItem) => item.commerce_source === 'marketplace'
  ? `marketplace:${item.marketplace_branch_id || ''}` : 'owned';

export function groupStoreCarts(items: CartItem[]) {
  const groups = new Map<string, { key: string; name: string; branchId?: string; items: CartItem[] }>();
  for (const item of items) {
    const key = storeKey(item);
    const group = groups.get(key) || {
      key,
      name: key === 'owned' ? 'ســــــوبـرمــــاركو' : item.merchant_name || item.marketplace_branch_name || 'متجر',
      branchId: item.marketplace_branch_id || undefined,
      items: [],
    };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

// Saved baskets are independent. The existing dispatch capacity applies only to checkout.
export function defaultCheckoutStores(items: CartItem[]) {
  let partners = 0;
  return groupStoreCarts(items).filter(group => group.key === 'owned' || partners++ < 2).map(group => group.key);
}

export function canCombineStores(keys: string[]) {
  return keys.length <= 3 && keys.filter(key => key !== 'owned').length <= 2;
}

export const cartLinePrice = (item: CartItem) => {
  if (item.is_bulk) return Number(item.product.bulk_price || 0);
  const price = Number(item.product.price || 0);
  const offer = Number(item.product.offer_price || 0);
  return offer > 0 && offer < price ? offer : price;
};
export const cartLineTotal = (item: CartItem) => cartLinePrice(item) * item.quantity
  / (item.unit_of_measure === 'weight' && !item.is_bulk ? 1000 : 1);

type QuoteIdentity = { product_id: string; listing_id?: string | null; is_bulk?: boolean; unit_of_measure?: string };
export const quoteIdentity = (line: QuoteIdentity) =>
  `${line.listing_id || 'owned'}:${line.product_id}:${!!line.is_bulk}:${line.unit_of_measure === 'weight' ? 'weight' : 'piece'}`;
export const itemQuoteIdentity = (item: CartItem) => quoteIdentity({
  product_id: item.product.id, listing_id: item.marketplace_listing_id,
  is_bulk: item.is_bulk, unit_of_measure: item.unit_of_measure,
});

export type PurchasedCartSource = {
  source_kind: 'owned' | 'marketplace';
  branch_id?: string;
  items: Array<QuoteIdentity & { quantity: number }>;
};

export function subtractPurchasedItems(items: CartItem[], sources: PurchasedCartSource[]) {
  const purchased = new Map<string, number>();
  for (const source of sources) for (const line of source.items) {
    const key = `${source.source_kind === 'owned' ? 'owned' : `marketplace:${source.branch_id}`}:${quoteIdentity(line)}`;
    purchased.set(key, (purchased.get(key) || 0) + line.quantity);
  }
  return items.flatMap(item => {
    const key = `${storeKey(item)}:${itemQuoteIdentity(item)}`;
    // Consume each purchased quantity once, even if a legacy/synced cart
    // contains duplicate lines with the same identity.
    const deduction = Math.min(item.quantity, purchased.get(key) || 0);
    if (deduction > 0) purchased.set(key, (purchased.get(key) || 0) - deduction);
    const quantity = item.quantity - deduction;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}
