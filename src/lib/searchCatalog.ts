import { getBranchCatalog, getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';
import { rankSearchProducts, searchAlternates } from '@/lib/arabicSearch';

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function requireDeliveryBranchId() {
  const branchId = await getCurrentDeliveryBranchId();
  if (!branchId) throw new Error('DELIVERY_ADDRESS_REQUIRED');
  return branchId;
}

async function searchOwnedProducts(branchId: string, query: string, limit: number): Promise<Product[]> {
  const result = await rpc('search_customer_smart_catalog_v1', {
    p_branch_id: branchId,
    p_search: query.trim(),
    p_limit: Math.min(300, Math.max(1, limit)),
  });
  if (!result.error) return (Array.isArray(result.data) ? result.data : []) as Product[];

  // The mobile app must remain compatible with an older database until the
  // new migration has been applied. Preserve existing stock-aware fallback.
  console.warn('Smart search RPC unavailable; falling back to legacy branch search', result.error.message);
  const legacy = await rpc('search_customer_branch_catalog_v1', {
    p_branch_id: branchId,
    p_search: query.trim() || null,
    p_barcode: null,
    p_limit: Math.min(300, Math.max(1, limit)),
  });
  if (legacy.error) throw legacy.error;
  return (Array.isArray(legacy.data) ? legacy.data : []) as Product[];
}

/** Merge the shop's full-stock search with the address-scoped marketplace
 * discovery, without dropping out-of-stock items or overriding their rank. */
export async function searchBranchProductsIncludingUnavailable(
  query: string,
  limit = 150,
  includeSynonyms = true,
): Promise<Product[]> {
  const cleaned = query.trim().slice(0, 120);
  if (!cleaned) return [];
  const branchId = await requireDeliveryBranchId();
  const count = Math.min(300, Math.max(1, limit));
  const [owned, discovery] = await Promise.all([
    searchOwnedProducts(branchId, cleaned, count),
    getBranchCatalog({ search: cleaned, limit: count }),
  ]);
  const merged = new Map<string, Product>();
  for (const row of owned) merged.set(row.id, row);
  for (const row of discovery) if (!merged.has(row.id)) merged.set(row.id, row);

  // Only expand curated Egyptian aliases for weak result sets. Avoid fan-out
  // and traffic spikes while the shopper is still typing a partial word.
  if (includeSynonyms && merged.size < 4 && cleaned.length >= 3) {
    const alternates = searchAlternates(cleaned);
    for (const alternate of alternates) {
      const [moreOwned, moreDiscovery] = await Promise.all([
        searchOwnedProducts(branchId, alternate, Math.min(30,count)),
        getBranchCatalog({ search: alternate, limit: Math.min(30,count) }),
      ]);
      for (const row of [...moreOwned, ...moreDiscovery]) {
        if (!merged.has(row.id)) merged.set(row.id, { ...row, search_rank: 10 } as Product);
      }
    }
  }
  return rankSearchProducts([...merged.values()], cleaned).slice(0,count);
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
