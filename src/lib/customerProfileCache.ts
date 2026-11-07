import { supabase } from '@/integrations/supabase/client';

/**
 * One request for the signed-in customer's row and one for their addresses,
 * shared by everything that needs them while the app opens (header, branch
 * lookup, cart, favourites, onboarding). Before this, opening the home page sent
 * the same customer/address queries 7 times.
 *
 * Results live for a short time and are dropped whenever an address or the
 * profile changes, so screens never show stale data for long.
 */

const TTL_MS = 20_000;

type Entry<T> = { at: number; promise: Promise<T> };

export type MyCustomer = { id: string; name: string | null; phone: string | null } | null;
export type MyAddress = {
  id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean | null;
  is_deliverable: boolean | null;
  updated_at: string | null;
  [key: string]: unknown;
};

const customers = new Map<string, Entry<MyCustomer>>();
const addresses = new Map<string, Entry<MyAddress[]>>();

function cached<T>(map: Map<string, Entry<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const hit = map.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = load();
  map.set(key, { at: Date.now(), promise });
  // A failed request is never reused.
  promise.catch(() => { if (map.get(key)?.promise === promise) map.delete(key); });
  return promise;
}

export function loadMyCustomer(userId: string): Promise<MyCustomer> {
  return cached(customers, userId, async () => {
    const { data, error } = await supabase.from('customers').select('id,name,phone').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return (data as MyCustomer) ?? null;
  });
}

export function loadMyAddresses(userId: string): Promise<MyAddress[]> {
  return cached(addresses, userId, async () => {
    const { data, error } = await (supabase as any)
      .from('customer_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []) as MyAddress[];
  });
}

export function invalidateMyCustomer() { customers.clear(); }
export function invalidateMyAddresses() { addresses.clear(); }

if (typeof window !== 'undefined') {
  // Any address save/switch already announces itself with this event.
  window.addEventListener('delivery-address-changed', invalidateMyAddresses, { capture: true });
}
