import { getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';

/**
 * Optional Marko AI co-purchase signals. The default is OFF until backend
 * migration, authenticated Edge functions and release QA are all complete.
 * This never supplies products: only bounded scores for existing catalog IDs.
 */
export const coPurchaseSignalsEnabled =
  import.meta.env.VITE_MARKO_COPURCHASE_V1 === 'true';

export type LearnedRecommendationScores = Record<string, number>;

export async function fetchLearnedRecommendationScores(
  product: Product,
  signal?: AbortSignal,
): Promise<LearnedRecommendationScores> {
  if (!coPurchaseSignalsEnabled || product.commerce_source === 'marketplace' || signal?.aborted) return {};
  try {
    const branchId = await getCurrentDeliveryBranchId();
    if (!branchId || signal?.aborted) return {};
    if (product.delivery_branch_id && product.delivery_branch_id !== branchId) return {};
    const { data, error } = await supabase.functions.invoke('marko-ai-engine', {
      body: { mode: 'customer_recommendations', branch_id: branchId, product_id: product.id },
      signal,
    });
    if (error || signal?.aborted || !data || !Array.isArray(data.signals)) return {};
    const scores: LearnedRecommendationScores = {};
    for (const row of data.signals.slice(0, 16)) {
      if (!row || typeof row.id !== 'string' || typeof row.score !== 'number') continue;
      if (!Number.isFinite(row.score) || row.score < 0 || row.score > 1) continue;
      scores[row.id] = row.score;
    }
    return scores;
  } catch {
    // Hard fallback: never let a recommendation signal failure hide product details.
    return {};
  }
}
