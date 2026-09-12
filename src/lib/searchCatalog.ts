import { getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function requireDeliveryBranchId() {
  const branchId = await getCurrentDeliveryBranchId();
  if (!branchId) throw new Error('DELIVERY_ADDRESS_REQUIRED');
  return branchId;
}

export async function searchBranchProductsIncludingUnavailable(query: string): Promise<Product[]> {
  const branchId = await requireDeliveryBranchId();
  const { data, error } = await rpc('search_customer_branch_catalog_v1', {
    p_branch_id: branchId,
    p_search: query.trim() || null,
    p_barcode: null,
    p_limit: 300,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Product[];
}

export async function searchBranchProductByBarcodeIncludingUnavailable(barcode: string): Promise<Product | null> {
  const branchId = await requireDeliveryBranchId();
  const { data, error } = await rpc('search_customer_branch_catalog_v1', {
    p_branch_id: branchId,
    p_search: null,
    p_barcode: barcode.trim() || null,
    p_limit: 2,
  });
  if (error) throw error;
  const rows = (Array.isArray(data) ? data : []) as Product[];
  return rows[0] || null;
}

export async function getBranchProductIncludingUnavailable(productId: string): Promise<Product | null> {
  const branchId = await requireDeliveryBranchId();
  const { data, error } = await rpc('get_customer_branch_product_any_stock_v1', {
    p_branch_id: branchId,
    p_product_id: productId,
  });
  if (error) throw error;
  return data && typeof data === 'object' ? data as Product : null;
}
