import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/lib/supabase';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';

export type MarketplaceStore = {
  merchant_id: string;
  merchant_name: string;
  merchant_type: 'partner' | 'franchise';
  branch_id: string;
  branch_name: string;
  address: string | null;
  pickup_address: string | null;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  zone_id: string | null;
  zone_name: string;
  coverage_source_branch_id: string | null;
  coverage_source_branch_name: string | null;
  delivery_fee: number;
  estimated_time: string | null;
  estimated_delivery_minutes: number | null;
  min_order_amount: number;
  distance_km: number;
  available_products: number;
};

export type MarketplaceProduct = Product & {
  marketplace_listing_id: string;
  merchant_id: string;
  merchant_name: string;
  marketplace_branch_id: string;
  marketplace_branch_name: string;
  preparation_minutes?: number | null;
  commerce_source: 'marketplace';
  catalog_scope?: 'partner';
  fallback_reason?: 'elmadawy_out_of_stock' | 'partner_unique_product' | string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const normalizeStore = (row: Record<string, unknown>): MarketplaceStore => ({
  merchant_id: String(row.merchant_id || ''),
  merchant_name: String(row.merchant_name || ''),
  merchant_type: row.merchant_type === 'franchise' ? 'franchise' : 'partner',
  branch_id: String(row.branch_id || ''),
  branch_name: String(row.branch_name || ''),
  address: row.address ? String(row.address) : row.pickup_address ? String(row.pickup_address) : null,
  pickup_address: row.pickup_address ? String(row.pickup_address) : row.address ? String(row.address) : null,
  pickup_latitude: row.pickup_latitude == null ? null : Number(row.pickup_latitude),
  pickup_longitude: row.pickup_longitude == null ? null : Number(row.pickup_longitude),
  zone_id: row.zone_id ? String(row.zone_id) : null,
  zone_name: String(row.zone_name || ''),
  coverage_source_branch_id: row.coverage_source_branch_id ? String(row.coverage_source_branch_id) : null,
  coverage_source_branch_name: row.coverage_source_branch_name ? String(row.coverage_source_branch_name) : null,
  delivery_fee: Number(row.delivery_fee || 0),
  estimated_time: row.estimated_time ? String(row.estimated_time) : null,
  estimated_delivery_minutes: row.estimated_delivery_minutes == null ? null : Number(row.estimated_delivery_minutes),
  min_order_amount: Number(row.min_order_amount || 0),
  distance_km: Number(row.distance_km || 0),
  available_products: Number(row.available_products || 0),
});

const normalizeProduct = (row: Record<string, unknown>): MarketplaceProduct => ({
  ...(row as Product),
  price: Number(row.price || 0),
  offer_price: row.offer_price == null ? undefined : Number(row.offer_price),
  quantity: Number(row.quantity || 0),
  marketplace_listing_id: String(row.marketplace_listing_id || ''),
  merchant_id: String(row.merchant_id || ''),
  merchant_name: String(row.merchant_name || ''),
  marketplace_branch_id: String(row.marketplace_branch_id || ''),
  marketplace_branch_name: String(row.marketplace_branch_name || ''),
  preparation_minutes: row.preparation_minutes == null ? null : Number(row.preparation_minutes),
  commerce_source: 'marketplace' as const,
  catalog_scope: 'partner',
  fallback_reason: row.fallback_reason ? String(row.fallback_reason) : undefined,
});

export async function getNearbyMarketplaceStores(limit = 20): Promise<MarketplaceStore[]> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) return [];
  const { data, error } = await rpc('get_customer_marketplace_stores_v1', {
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_branch_id: null,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(row => normalizeStore(row as Record<string, unknown>));
}

export async function getMarketplaceStore(branchId: string): Promise<MarketplaceStore | null> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) return null;
  const { data, error } = await rpc('get_customer_marketplace_stores_v1', {
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_branch_id: branchId,
    p_limit: 1,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row ? normalizeStore(row as Record<string, unknown>) : null;
}

export async function getMarketplaceStoreCatalog(
  branchId: string,
  search?: string | null,
  limit = 200,
): Promise<MarketplaceProduct[]> {
  const { data, error } = await rpc('get_customer_marketplace_store_catalog_v1', {
    p_branch_id: branchId,
    p_search: search?.trim() || null,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(row => normalizeProduct(row as Record<string, unknown>));
}

export async function getMarketplaceStoreProduct(
  branchId: string,
  productId: string,
): Promise<MarketplaceProduct | null> {
  const { data, error } = await rpc('get_customer_marketplace_store_catalog_v2', {
    p_branch_id: branchId,
    p_product_id: productId,
    p_search: null,
    p_limit: 1,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  return row ? normalizeProduct(row as Record<string, unknown>) : null;
}

export async function findMarketplaceProductForCurrentAddress(
  productId: string,
): Promise<MarketplaceProduct | null> {
  const stores = await getNearbyMarketplaceStores(50);
  for (const store of stores) {
    const product = await getMarketplaceStoreProduct(store.branch_id, productId);
    if (product) return product;
  }
  return null;
}


/** Resolve saved products directly; catalogue pagination must never delete a cart line. */
export async function getMarketplaceProductsByIds(branchId: string, productIds: string[]): Promise<MarketplaceProduct[]> {
  const ids = [...new Set(productIds.filter(Boolean))];
  const products: MarketplaceProduct[] = [];
  for (let index = 0; index < ids.length; index += 6) {
    const batch = await Promise.all(ids.slice(index, index + 6).map(id => getMarketplaceStoreProduct(branchId, id)));
    products.push(...batch.filter((product): product is MarketplaceProduct => product !== null));
  }
  return products;
}
