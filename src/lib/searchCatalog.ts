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

/** Curated synonyms live in Supabase and are expanded for every eligible search,
 * including autocomplete, even when the direct query already matched products.
 * The existing branch-scoped RPCs remain the only source of catalog records. */
async function expandedQueries(query: string, maxAlternates: number): Promise<string[]> {
  if (query.length < 3 || /^\\d+$/.test(query.trim())) return [];
  const fallback = searchAlternates(query);
  const result = await rpc('customer_search_expand_query_v2', {
    p_search: query, p_country_code: 'EG', p_limit: maxAlternates,
  });
  const remote = !result.error && Array.isArray(result.data)
    ? (result.data as Array<{ alternative?: unknown }>).map(row => row.alternative).filter((q): q is string => typeof q === 'string')
    : [];
  const unique = new Set<string>();
  for (const term of [...remote, ...fallback]) {
    const normalized = term.trim();
    if (normalized && normalized !== query.trim() && normalized.length <= 120) unique.add(normalized);
  }
  return [...unique].slice(0, maxAlternates);
}

/** Blend available marketplace products and all-stock owned catalog results.
 * Preserve branch prices, availability, and product IDs; never synthesize SKUs. */
export async function searchBranchProductsIncludingUnavailable(
  query: string,
  limit = 150,
  includeSynonyms = true,
): Promise<Product[]> {
  const cleaned = query.trim().slice(0, 120);
  if (!cleaned) return [];
  const branchId = await requireDeliveryBranchId();
  const count = Math.min(300, Math.max(1, limit));
  const aliasPromise = includeSynonyms
    ? expandedQueries(cleaned, count <= 10 ? 2 : 4).catch(() => searchAlternates(cleaned).slice(0, 2))
    : Promise.resolve([] as string[]);
  const [owned, discovery, alternates] = await Promise.all([
    searchOwnedProducts(branchId, cleaned, count),
    getBranchCatalog({ search: cleaned, limit: count }),
    aliasPromise,
  ]);
  const merged = new Map<string, Product>();
  for (const row of owned) merged.set(row.id, row);
  for (const row of discovery) if (!merged.has(row.id)) merged.set(row.id, row);

  // Bounded parallel discovery: keep autocomplete responsive and protect RPC load.
  // Unlike v1, synonyms are *not* conditional on getting fewer than four hits.
  if (alternates.length) {
    const cap = Math.min(60, count);
    const fetched = await Promise.allSettled(alternates.map(async alternate => {
      const results = await Promise.allSettled([
        searchOwnedProducts(branchId, alternate, cap),
        getBranchCatalog({ search: alternate, limit: cap }),
      ]);
      return results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    }));
    for (const item of fetched) {
      if (item.status !== 'fulfilled') continue;
      for (const product of item.value) {
        if (!merged.has(product.id)) merged.set(product.id, product);
      }
    }
  }
  return rankSearchProducts([...merged.values()], cleaned, alternates).slice(0, count);
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
