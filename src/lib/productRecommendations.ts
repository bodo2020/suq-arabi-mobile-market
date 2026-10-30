import type { Product } from '@/lib/supabase';
import { getBranchCatalog } from '@/lib/supabase';
import {
  recommendationKeywords,
  rankRecommendationCandidates,
  type RecommendationContext,
} from '@/lib/recommendationEngineV2';

export { recommendationKeywords, classifyRecommendation, rankRecommendationCandidates } from '@/lib/recommendationEngineV2';

/**
 * All recommendations are validated against the actual address-scoped catalog.
 * The shared Marko AI gateway is the future source of bounded learned scores,
 * not a source of invented product details, prices or stock information.
 */
export function rankProductRecommendations(
  product: Product,
  candidates: readonly Product[],
  limit = 16,
  context: RecommendationContext = {},
): Product[] {
  return rankRecommendationCandidates(product, candidates, limit, context).map(row => row.product);
}

export async function fetchSmartRecommendations(product: Product): Promise<Product[]> {
  const keywordTerms = recommendationKeywords(product);
  if (product.commerce_source === 'marketplace') {
    if (!product.marketplace_branch_id) return [];
    const { getMarketplaceStoreCatalog } = await import('@/lib/marketplace');
    const catalogs = await Promise.allSettled([
      getMarketplaceStoreCatalog(product.marketplace_branch_id, null, 180),
      ...keywordTerms.map(term => getMarketplaceStoreCatalog(product.marketplace_branch_id!, term, 24)),
    ]);
    if (catalogs.every(result => result.status === 'rejected')) throw new Error('RECOMMENDATIONS_UNAVAILABLE');
    return rankProductRecommendations(product, catalogs.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []));
  }

  const catalogs = await Promise.allSettled([
    getBranchCatalog({ mainCategoryId: product.main_category_id, limit: 160 }),
    ...keywordTerms.map(term => getBranchCatalog({ search: term, limit: 24 })),
  ]);
  if (catalogs.every(result => result.status === 'rejected')) throw new Error('RECOMMENDATIONS_UNAVAILABLE');
  return rankProductRecommendations(product, catalogs.flatMap(result =>
    result.status === 'fulfilled' ? result.value : []));
}
