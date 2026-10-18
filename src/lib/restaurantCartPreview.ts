import { supabase } from '@/lib/supabase';
import type { MarketplaceCheckoutLine } from '@/lib/marketplaceCheckout';
import type { CombinedCheckoutSource } from '@/lib/combinedCheckout';
import type { RestaurantModifierPick } from '@/lib/restaurantModifiers';

/**
 * Preview-only restaurant cart contracts. They do NOT return payable quote
 * tokens and must not be consumed by marketplace/combined place-order methods.
 */
export type RestaurantCartLineSelection = {
  line_index: number; // original cart line position, never listing identity
  picks: RestaurantModifierPick[];
};

export type CombinedRestaurantSourceSelection = {
  source_index: number; // index in the combined sources array
  selections: RestaurantCartLineSelection[];
};

export type RestaurantCartPreviewLine = {
  line_index: number;
  listing_id: string;
  product_id: string;
  quantity: number;
  base_unit_price: number;
  option_unit_price: number;
  unit_price_with_options: number;
  line_total: number;
  selection_key: string;
  modifiers_snapshot: Array<{
    group_id: string; group_name: string;
    option_id: string; option_name: string;
    quantity: number; unit_price_delta: number; line_price_delta: number;
  }>;
};

export type RestaurantStoreCartPreview = {
  source_kind: 'marketplace';
  branch_id: string;
  line_count: number;
  lines: RestaurantCartPreviewLine[];
  currency: 'EGP';
  base_subtotal: number;
  modifiers_subtotal: number;
  preview_subtotal: number;
  base_shipping_cost: number;
  preview_total_before_delivery_repricing: number;
  delivery_may_reprice: true;
  road_verified: boolean;
  preview_fingerprint: string;
  checkout_enabled: false;
  not_payable: true;
};

export type CombinedRestaurantCartPreview = {
  source_kind: 'combined';
  restaurant_sources: Array<{
    source_index: number;
    branch_id: string;
    cart_preview: RestaurantStoreCartPreview;
  }>;
  currency: 'EGP';
  base_subtotal: number;
  modifiers_subtotal: number;
  preview_subtotal: number;
  base_shipping_cost: number;
  preview_total_before_delivery_repricing: number;
  delivery_may_reprice: true;
  road_verified: boolean;
  preview_fingerprint: string;
  checkout_enabled: false;
  not_payable: true;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string, args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

const validMoney = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const validLineSelections = (length: number, selections: RestaurantCartLineSelection[]) =>
  Array.isArray(selections) && selections.length === length
  && selections.every(entry =>
    Number.isSafeInteger(entry?.line_index)
    && entry.line_index >= 0 && entry.line_index < length
    && Array.isArray(entry.picks)
    && entry.picks.every(pick =>
      typeof pick?.group_id === 'string' && typeof pick?.option_id === 'string'
      && Number.isSafeInteger(pick.quantity) && pick.quantity > 0
    )
  ) && new Set(selections.map(value => value.line_index)).size === length;

function assertNeverPayable(raw: unknown, expectedKind: 'marketplace' | 'combined') {
  const value = raw as Record<string, unknown> | null;
  if (!value || typeof value !== 'object' || value.source_kind !== expectedKind
    || value.checkout_enabled !== false || value.not_payable !== true
    || value.delivery_may_reprice !== true || value.currency !== 'EGP'
    || !validMoney(value.base_subtotal) || !validMoney(value.modifiers_subtotal)
    || !validMoney(value.preview_subtotal)
    || typeof value.preview_fingerprint !== 'string'
    || !/^[0-9a-f]{32}$/.test(value.preview_fingerprint)) {
    throw new Error('RESTAURANT_CART_PREVIEW_INVALID');
  }
}

export async function previewRestaurantStoreCart(
  branchId: string, items: MarketplaceCheckoutLine[],
  selections: RestaurantCartLineSelection[],
  point: { latitude: number; longitude: number; routeQuoteId?: string | null },
): Promise<RestaurantStoreCartPreview> {
  if (!branchId || !items.length || !validLineSelections(items.length, selections)
    || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    throw new Error('RESTAURANT_CART_SELECTIONS_INVALID');
  }
  const { data, error } = await rpc('preview_restaurant_cart_modifiers_v1', {
    p_branch_id: branchId,
    p_items: items,
    p_selections: selections,
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_route_quote_id: point.routeQuoteId || null,
  });
  if (error) throw new Error(error.message || 'RESTAURANT_CART_PREVIEW_UNAVAILABLE');
  assertNeverPayable(data, 'marketplace');
  const preview = data as RestaurantStoreCartPreview;
  if (preview.branch_id !== branchId || preview.line_count !== items.length
    || !Array.isArray(preview.lines) || preview.lines.length !== items.length
    || preview.lines.some(line =>
      !Number.isSafeInteger(line.line_index)
      || !items[line.line_index]
      || line.listing_id !== items[line.line_index].listing_id
      || line.product_id !== items[line.line_index].product_id
      || line.quantity !== items[line.line_index].quantity
      || !validMoney(line.base_unit_price) || !validMoney(line.option_unit_price)
      || !validMoney(line.line_total) || !Array.isArray(line.modifiers_snapshot)
    )
    || new Set(preview.lines.map(line => line.line_index)).size !== items.length) {
    throw new Error('RESTAURANT_CART_PREVIEW_INVALID');
  }
  return preview;
}

export async function previewCombinedRestaurantCarts(
  sources: CombinedCheckoutSource[],
  restaurantSelections: CombinedRestaurantSourceSelection[],
  point: { latitude: number; longitude: number; routeQuoteId?: string | null },
): Promise<CombinedRestaurantCartPreview> {
  const validSources = Array.isArray(sources) && sources.length >= 1 && sources.length <= 3;
  if (!validSources || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)
    || !Array.isArray(restaurantSelections)
    || restaurantSelections.some(x =>
      !Number.isSafeInteger(x?.source_index)
      || x.source_index < 0 || x.source_index >= sources.length
      || sources[x.source_index].source_kind !== 'marketplace'
      || !validLineSelections(sources[x.source_index].items.length, x.selections)
    )
    || new Set(restaurantSelections.map(x => x.source_index)).size !== restaurantSelections.length) {
    throw new Error('RESTAURANT_COMBINED_SELECTIONS_INVALID');
  }
  const { data, error } = await rpc('preview_combined_restaurant_modifiers_v1', {
    p_sources: sources,
    p_restaurant_selections: restaurantSelections,
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_route_quote_id: point.routeQuoteId || null,
  });
  if (error) throw new Error(error.message || 'RESTAURANT_COMBINED_PREVIEW_UNAVAILABLE');
  assertNeverPayable(data, 'combined');
  const preview = data as CombinedRestaurantCartPreview;
  if (!Array.isArray(preview.restaurant_sources)
    || preview.restaurant_sources.length !== restaurantSelections.length
    || preview.restaurant_sources.some(source => {
      const original = sources[source.source_index];
      const expected = restaurantSelections.find(value => value.source_index === source.source_index);
      return !original || original.source_kind !== 'marketplace'
        || original.branch_id !== source.branch_id || !expected
        || source.cart_preview.checkout_enabled !== false
        || source.cart_preview.not_payable !== true
        || source.cart_preview.line_count !== original.items.length;
    })) {
    throw new Error('RESTAURANT_COMBINED_PREVIEW_INVALID');
  }
  return preview;
}
