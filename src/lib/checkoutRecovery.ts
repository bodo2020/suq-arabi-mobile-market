import { supabase } from '@/lib/supabase';

export type CheckoutKind = 'owned' | 'marketplace' | 'combined';

/** Resolve a lost response before doing anything dependent on today's price/stock. */
export async function recoverCheckout<T>(kind: CheckoutKind, requestId: string): Promise<T | null> {
  if (!navigator.onLine) throw new Error('CHECKOUT_OFFLINE');
  const { data, error } = await (supabase as any).rpc('recover_customer_checkout_v1', {
    p_kind: kind,
    p_request_id: requestId,
  });
  // An unavailable recovery service is an unknown outcome, never a rejected order.
  if (error || typeof data?.exists !== 'boolean' || (data.exists && !data.order?.id)) {
    throw new Error('CHECKOUT_RECOVERY_UNAVAILABLE');
  }
  return data.exists ? data.order as T : null;
}

export async function recoverOrPlace<T>(kind: CheckoutKind, requestId: string, place: () => Promise<T>): Promise<T> {
  const existing = await recoverCheckout<T>(kind, requestId);
  if (existing) return existing;
  try {
    return await place();
  } catch (error) {
    // The request may have committed even when its response was lost. If this
    // check fails, keep the original pending ID rather than unlock a new attempt.
    const committed = await recoverCheckout<T>(kind, requestId);
    if (committed) return committed;
    throw error;
  }
}
