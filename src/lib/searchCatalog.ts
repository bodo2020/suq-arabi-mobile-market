import { getBranchCatalog, getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';
import { rankSearchProducts, searchAlternates, relatedSearches, type SearchMatchProduct } from '@/lib/arabicSearch';

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
  // A product may have marketplace offers; preserve the original source row.
  const keyFor = (product: Product) => product.commerce_source === 'marketplace'
    ? product.id + ':' + (product.marketplace_listing_id || product.marketplace_branch_id || 'marketplace')
    : product.id;
  for (const row of [...owned, ...discovery]) {
    const key = keyFor(row);
    if (!merged.has(key)) merged.set(key, { ...row, search_match_type: 'direct' });
  }

  // Unlike the previous implementation, aliases are searched even when
  // the primary term returned 4+ items (e.g. "حليب" also finds "لبن").
  // Do not expand barcode searches or the live, rapidly-typed 2-letter query.
  if (includeSynonyms && cleaned.length >= 3 && !/^\d+$/.test(cleaned)) {
    const addSecondary = async (alternate: string, kind: 'synonym' | 'related', perSourceLimit: number) => {
      try {
        const [moreOwned, moreDiscovery] = await Promise.all([
          searchOwnedProducts(branchId, alternate, perSourceLimit),
          getBranchCatalog({ search: alternate, limit: perSourceLimit }),
        ]);
        for (const row of [...moreOwned, ...moreDiscovery]) {
          const key = keyFor(row);
          if (!merged.has(key)) merged.set(key, { ...row, search_match_type: kind });
        }
      } catch (error) {
        // Alias discovery must never break the original exact results.
        console.warn('Supplemental search skipped', kind, error);
      }
    };

    // Bounded searches, with a little more room for terms inside a phrase.
    const alternates = searchAlternates(cleaned).slice(0, 3);
    await Promise.all(alternates.map(term =>
      addSecondary(term, 'synonym', Math.min(count, 45))));

    // Distinct categories are NOT interchangeable. Only discover them for
    // broad terms and only after exact/synonym candidates are in hand.
    if (count >= 12 && merged.size < 70) {
      const related = relatedSearches(cleaned);
      await Promise.all(related.map(term =>
        addSecondary(term, 'related', Math.min(count, 12))));
    }
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
