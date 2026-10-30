import { getBranchCatalog, getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';
import { rankSearchProducts, searchAlternates, matchesSearchWords, normalizeArabicSearch, type SearchMatchProduct } from '@/lib/arabicSearch';

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

// Terms come from the database so stores can add thousands of safe regional aliases
// without publishing a new Android/web build. Small in-memory cache limits typing traffic.
const queryAliasCache = new Map<string, { at: number; terms: string[] }>();

async function getSearchSynonyms(query: string, max: number): Promise<string[]> {
  const local = searchAlternates(query);
  const cached = queryAliasCache.get(query);
  if (cached && Date.now() - cached.at < 300000) return cached.terms.slice(0, max);
  let remote: string[] = [];
  try {
    const result = await rpc('customer_search_expand_query_v2', {
      p_search: query, p_country_code: 'EG', p_limit: 7,
    });
    if (!result.error && Array.isArray(result.data)) {
      remote = (result.data as Array<{ alternative?: unknown }>)
        .map(row => row.alternative).filter((term): term is string => typeof term === 'string');
    }
  } catch {
    // Older DBs still have the comprehensive bundled Egyptian vocabulary.
  }
  const terms = [...new Set([...local, ...remote].map(t => t.trim()))]
    .filter(t => t.length >= 2 && t !== query && t.length <= 120)
    .slice(0, 7);
  if (queryAliasCache.size >= 120) queryAliasCache.clear();
  queryAliasCache.set(query, { at: Date.now(), terms });
  return terms.slice(0, max);
}

/** Match exact products first, safe Egyptian synonyms next and labelled related
 * categories last. All three passes use the actual branch-scoped catalog. */
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
  const merged = new Map<string, SearchMatchProduct>();
  // Some legacy/marketplace RPCs match substrings (e.g. "رز" inside "سنيكرز").
  // Keep typo-tolerant results for longer direct searches, but short words and
  // all synonym expansions must match complete product-name/brand tokens.
  const accepted = (row: Product, term: string, kind: 'direct' | 'synonym') =>
    matchesSearchWords(row, term) ||
    (kind === 'direct' && normalizeArabicSearch(term).split(' ').every(t => t.length >= 4));

  // A product may have marketplace offers; preserve the original source row.
  const keyFor = (product: Product) => product.commerce_source === 'marketplace'
    ? product.id + ':' + (product.marketplace_listing_id || product.marketplace_branch_id || 'marketplace')
    : product.id;
  for (const row of [...owned, ...discovery]) {
    if (!accepted(row, cleaned, 'direct')) continue;
    const key = keyFor(row);
    if (!merged.has(key)) merged.set(key, { ...row, search_match_type: 'direct' });
  }

  // Unlike the previous implementation, aliases are searched even when
  // the primary term returned 4+ items (e.g. "حليب" also finds "لبن").
  // Two-character *known* words like "رز" also need "أرز" results.
  // Avoid remote dictionary round trips on every 2-letter autocomplete input.
  if (includeSynonyms && cleaned.length >= 2 && !/^\d+$/.test(cleaned)) {
    const addSecondary = async (alternate: string, perSourceLimit: number) => {
      try {
        const [moreOwned, moreDiscovery] = await Promise.all([
          searchOwnedProducts(branchId, alternate, perSourceLimit),
          getBranchCatalog({ search: alternate, limit: perSourceLimit }),
        ]);
        for (const row of [...moreOwned, ...moreDiscovery]) {
          if (!accepted(row, alternate, 'synonym')) continue;
          const key = keyFor(row);
          if (!merged.has(key)) merged.set(key, { ...row, search_match_type: 'synonym' });
        }
      } catch (error) {
        // Alias discovery must never break the original exact results.
        console.warn('Supplemental synonym search skipped', error);
      }
    };

    const alternates = cleaned.length < 3
      ? searchAlternates(cleaned).slice(0, 2)
      : await getSearchSynonyms(cleaned, count <= 10 ? 2 : 5);
    await Promise.all(alternates.map(term =>
      addSecondary(term, Math.min(count, 45))));
    // Related categories (e.g. pasta for rice) must NOT pollute core results.
    // They can be offered in a separately labelled discovery section later.
  }

  return rankSearchProducts([...merged.values()], cleaned).slice(0, count);
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
