import { getCurrentDeliveryBranchId, supabase, type Product } from '@/lib/supabase';

export type RecommendationEventType = 'impression' | 'click' | 'add_to_cart';
const SESSION_KEY = 'marko_recommendation_session_v1';

const getSessionId = () => {
  try {
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;
    const next = globalThis.crypto?.randomUUID?.();
    if (!next) return null;
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return null;
  }
};

/**
 * Fire-and-forget privacy-preserving telemetry. Logged-in owned-branch shoppers
 * only; no user IDs, cart contents, prices, or customer profile are sent.
 */
export async function trackProductRecommendationEvent(
  source: Product,
  recommended: Product,
  eventType: RecommendationEventType,
): Promise<void> {
  if (source.id === recommended.id || source.commerce_source === 'marketplace'
    || recommended.commerce_source === 'marketplace') return;
  try {
    const [branchId, sessionId] = await Promise.all([
      getCurrentDeliveryBranchId(),
      Promise.resolve(getSessionId()),
    ]);
    if (!branchId || !sessionId) return;
    const { error } = await supabase.functions.invoke('marko-ai-engine', {
      body: {
        mode: 'customer_recommendation_event',
        branch_id: branchId,
        source_product_id: source.id,
        recommended_product_id: recommended.id,
        event_type: eventType,
        session_id: sessionId,
      },
    });
    if (error) {
      // Analytics must never affect navigation, product detail or cart.
      return;
    }
  } catch {
    // Best-effort only.
  }
}
