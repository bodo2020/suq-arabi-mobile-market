import { supabase } from '@/integrations/supabase/client';
import { getRoadDistance } from '@/lib/roadDistance';

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

// A slow or stalled mobile connection must never leave the address screen "checking" forever.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), ms);
    promise.then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); },
    );
  });
}

export async function resolveDeliveryLocation(latitude: number, longitude: number): Promise<DeliveryMatch | null> {
  const { data, error } = await withTimeout(rpc('find_delivery_branch', {
    p_latitude: latitude,
    p_longitude: longitude,
  }), 15000, 'FIND_BRANCH');
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const candidate = rows[0] as Omit<DeliveryMatch, 'road_distance_km' | 'road_duration_minutes'> | undefined;
  if (!candidate) return null;

  // The branch/zone is already confirmed above. If the road-distance helper is slow or down, keep the
  // straight-line distance instead of blocking the customer (the helper does the same when its map providers fail).
  let route: Awaited<ReturnType<typeof getRoadDistance>> | null = null;
  try {
    route = await withTimeout(getRoadDistance(candidate.branch_id, latitude, longitude), 10000, 'ROAD_DISTANCE');
  } catch (routeError) {
    console.warn('road distance unavailable, using straight-line distance', routeError);
  }
  if (route && (!route.deliverable || route.road_distance_km == null)) return null;

  const km = route ? Number(route.road_distance_km) : Number(candidate.distance_km);
  return {
    ...candidate,
    distance_km: km,
    road_distance_km: km,
    road_duration_minutes: route ? route.duration_minutes : null,
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
