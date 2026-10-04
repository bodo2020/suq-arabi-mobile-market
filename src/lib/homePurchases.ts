import { supabase } from './supabase';
import type { HomePurchase } from './homeMerchandising';

// Existing owner-scoped RPC covers online and grouped marketplace orders.
export async function getHomePurchases(): Promise<HomePurchase[]> {
  const { data, error } = await supabase.rpc('get_my_purchase_history', { p_limit: 100 });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as unknown as HomePurchase[];
}
