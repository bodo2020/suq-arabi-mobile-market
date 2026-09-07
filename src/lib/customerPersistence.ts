import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

type CustomerFunctions = {
  replace_customer_cart: { p_items: Json; p_expected_user_id: string };
  set_customer_favorite: { p_product_id: string; p_favorite: boolean };
  set_default_customer_address: { p_address_id: string };
};
export function customerRpc<K extends keyof CustomerFunctions>(name: K, args: CustomerFunctions[K]) {
  // Bound, narrowly typed bridge for RPCs added by this rollout.
  const rpc = supabase.rpc.bind(supabase) as unknown as
    (name: K, args: CustomerFunctions[K]) => ReturnType<typeof supabase.rpc>;
  return rpc(name, args);
}
