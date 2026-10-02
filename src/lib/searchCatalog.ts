import { getBranchCatalog, getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';
import { buildProductSearchQueries, rankProductSearchResults } from '@/lib/smartProductSearch';

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
  const variants = buildProductSearchQueries(query);
  if (!variants.length) return [];

  // The catalog RPCs still use literal matching. Search a small set of Arabic
  // spelling variants and familiar product aliases, then merge and rank once.
  const searches = await Promise.all(variants.map(async variant => {
    const [owned, discovery] = await Promise.allSettled([
      rpc('search_customer_branch_catalog_v1', {
        p_branch_id: branchId,
        p_search: variant,
        p_barcode: null,
        p_limit: 300,
      }),
      getBranchCatalog({ search: variant, limit: 300 }),
    ]);
    return {
      owned: owned.status === 'fulfilled' && !owned.value.error
        ? (Array.isArray(owned.value.data) ? owned.value.data : []) as Product[]
        : null,
      discovery: discovery.status === 'fulfilled' ? discovery.value : null,
      error: owned.status === 'fulfilled' ? owned.value.error : owned.reason,
    };
  }));

  if (searches.every(result => result.owned === null && result.discovery === null)) {
    throw searches[0].error || new Error('SEARCH_UNAVAILABLE');
  }

  const merged = new Map<string, Product>();
  for (const result of searches) {
    for (const row of result.owned || []) if (!merged.has(row.id)) merged.set(row.id, row);
    for (const row of result.discovery || []) merged.set(row.id, row);
  }
  return rankProductSearchResults([...merged.values()], query, variants);
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
  if (rows[0] && Number(rows[0].quantity)>0) return rows[0];
  const available = await getBranchCatalog({barcode,limit:1});
  return available[0] || rows[0] || null;
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
