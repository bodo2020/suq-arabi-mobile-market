import { supabase } from '@/integrations/supabase/client';

export const RETURN_PATHS = ['/', '/cart', '/payment', '/addresses', '/add-address', '/account'];

export function safeReturnTo(value: string | null | undefined) {
  return value && RETURN_PATHS.includes(value) ? value : '/';
}

export type OnboardingState = { hasName: boolean; hasDefaultAddress: boolean };

export async function loadOnboardingState(userId: string): Promise<OnboardingState> {
  const [customer, address] = await Promise.all([
    supabase.from('customers').select('name').eq('user_id', userId).maybeSingle(),
    supabase.from('customer_addresses').select('id').eq('user_id', userId).eq('is_default', true).limit(1).maybeSingle(),
  ]);
  if (customer.error) throw customer.error;
  if (address.error) throw address.error;
  return {
    hasName: (customer.data?.name?.trim().length || 0) >= 2,
    hasDefaultAddress: Boolean(address.data?.id),
  };
}

export function nextOnboardingPath(state: OnboardingState, returnTo: string) {
  const target = safeReturnTo(returnTo);
  if (!state.hasName) return `/register?returnTo=${encodeURIComponent(target)}`;
  if (!state.hasDefaultAddress) return `/add-address?onboarding=1&returnTo=${encodeURIComponent(target)}`;
  return target;
}
