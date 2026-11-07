import { supabase } from '@/integrations/supabase/client';
import { loadMyAddresses, loadMyCustomer } from '@/lib/customerProfileCache';

export const RETURN_PATHS = ['/', '/cart', '/payment', '/addresses', '/add-address', '/account'];

export function safeReturnTo(value: string | null | undefined) {
  return value && RETURN_PATHS.includes(value) ? value : '/';
}

export type OnboardingState = { hasName: boolean; hasDefaultAddress: boolean };

export async function loadOnboardingState(userId: string): Promise<OnboardingState> {
  const [customer, list] = await Promise.all([loadMyCustomer(userId), loadMyAddresses(userId)]);
  return {
    hasName: (customer?.name?.trim().length || 0) >= 2,
    hasDefaultAddress: list.some(item => item.is_default),
  };
}

export function nextOnboardingPath(state: OnboardingState, returnTo: string) {
  const target = safeReturnTo(returnTo);
  if (!state.hasName) return `/register?returnTo=${encodeURIComponent(target)}`;
  if (!state.hasDefaultAddress) return `/add-address?onboarding=1&returnTo=${encodeURIComponent(target)}`;
  return target;
}
