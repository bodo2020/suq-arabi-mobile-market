import { supabase, type Product } from '@/lib/supabase';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';

export type MarketplaceStore = {
  merchant_id: string;
  merchant_name: string;
  merchant_type: 'partner' | 'franchise';
  branch_id: string;
  branch_name: string;
  address: string | null;
  zone_id: string;
  zone_name: string;
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
  address: row.address ? String(row.address) : null,
  zone_id: String(row.zone_id || ''),
  zone_name: String(row.zone_name || ''),
  delivery_fee: Number(row.delivery_fee || 0),
  estimated_time: row.estimated_time ? String(row.estimated_time) : null,
  estimated_delivery_minutes: row.estimated_delivery_minutes == null ? null : Number(row.estimated_delivery_minutes),
  min_order_amount: Number(row.min_order_amount || 0),
  distance_km: Number(row.distance_km || 0),
  available_products: Number(row.available_products || 0),
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

export async function getMarketplaceStoreCatalog(branchId: string, search?: string | null, limit = 200): Promise<MarketplaceProduct[]> {
  const { data, error } = await rpc('get_customer_marketplace_store_catalog_v1', {
    p_branch_id: branchId,
    p_search: search?.trim() || null,
    p_limit: limit,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(row => ({
    ...(row as Product),
    price: Number((row as Record<string, unknown>).price || 0),
    offer_price: (row as Record<string, unknown>).offer_price == null ? undefined : Number((row as Record<string, unknown>).offer_price),
    quantity: Number((row as Record<string, unknown>).quantity || 0),
    marketplace_listing_id: String((row as Record<string, unknown>).marketplace_listing_id || ''),
    merchant_id: String((row as Record<string, unknown>).merchant_id || ''),
    merchant_name: String((row as Record<string, unknown>).merchant_name || ''),
    marketplace_branch_id: String((row as Record<string, unknown>).marketplace_branch_id || ''),
    marketplace_branch_name: String((row as Record<string, unknown>).marketplace_branch_name || ''),
    preparation_minutes: (row as Record<string, unknown>).preparation_minutes == null ? null : Number((row as Record<string, unknown>).preparation_minutes),
    commerce_source: 'marketplace' as const,
  }));
}
