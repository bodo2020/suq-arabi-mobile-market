import { supabase } from '@/lib/supabase';

export async function customerPhoneIsRegistered(phone: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('customer-auth-route', {
    body: { phone },
  });

  if (error) throw error;
  if (!data || typeof data.registered !== 'boolean') {
    throw new Error('INVALID_AUTH_ROUTE_RESPONSE');
  }

  return data.registered;
}
