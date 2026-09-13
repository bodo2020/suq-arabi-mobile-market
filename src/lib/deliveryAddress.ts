import { supabase } from '@/integrations/supabase/client';

export const DEFAULT_DELIVERY_CENTER = { lat: 31.256622, lng: 31.168264 } as const;
export const DELIVERY_RADIUS_KM = 10;
export const GUEST_ADDRESS_KEY = 'selectedAddress';

export type DeliveryMatch = {
  branch_id: string;
  branch_name: string;
  distance_km: number;
  road_distance_km: number;
  road_duration_minutes: number | null;
  delivery_radius_km: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_minutes: number | null;
};

export type GuestDeliveryAddress = {
  address: string;
  full_address: string;
  latitude: number;
  longitude: number;
  assigned_branch_id: string;
  branch_name: string;
  distance_km: number;
  road_distance_km?: number;
  road_duration_minutes?: number | null;
  delivery_price: number;
  estimated_time: number | null;
  is_deliverable: true;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function resolveDeliveryLocation(latitude: number, longitude: number): Promise<DeliveryMatch | null> {
  // Customer delivery verification intentionally uses the database delivery-radius check for now.
  // The shared route-distance Edge Function is reserved for authenticated staff/delivery workflows,
  // so customer/guest address selection must not depend on it. Road routing can be reintroduced later
  // through a dedicated customer-safe endpoint without blocking address creation today.
  const { data, error } = await rpc('find_delivery_branch', {
    p_latitude: latitude,
    p_longitude: longitude,
  });
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const candidate = rows[0] as Omit<DeliveryMatch, 'road_distance_km' | 'road_duration_minutes'> | undefined;
  if (!candidate) return null;

  const straightDistanceKm = Number(candidate.distance_km);
  return {
    ...candidate,
    distance_km: straightDistanceKm,
    // Temporary compatibility values until customer road-distance routing is enabled again.
    road_distance_km: straightDistanceKm,
    road_duration_minutes: null,
  };
}

export function readGuestAddress(): GuestDeliveryAddress | null {
  try {
    const raw = localStorage.getItem(GUEST_ADDRESS_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as GuestDeliveryAddress;
    if (!value?.latitude || !value?.longitude || !value?.is_deliverable || !value?.assigned_branch_id) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveGuestAddress(address: GuestDeliveryAddress) {
  localStorage.setItem(GUEST_ADDRESS_KEY, JSON.stringify(address));
  localStorage.setItem('userAddress', address.address);
  localStorage.setItem('userArea', address.branch_name);
  window.dispatchEvent(new CustomEvent('guest-address-changed', { detail: address }));
  window.dispatchEvent(new Event('delivery-address-changed'));
}
