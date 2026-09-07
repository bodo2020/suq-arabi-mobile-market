import { supabase } from '@/integrations/supabase/client';
import { readGuestAddress } from '@/lib/deliveryAddress';

export type BranchRuntimeContext = {
  delivery_branch_id: string;
  branch_name: string;
  branch_code: string;
  inventory_branch_id: string;
  pricing_branch_id: string;
  delivery_radius_km: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_minutes: number | null;
  opens_at: string | null;
  closes_at: string | null;
  delivery_enabled: boolean;
  latitude: number;
  longitude: number;
};

export type SelectedDeliveryPoint = {
  address_id: string | null;
  latitude: number;
  longitude: number;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

let cachedRuntime: BranchRuntimeContext | null | undefined;
let pendingRuntime: Promise<BranchRuntimeContext | null> | null = null;

export async function loadSelectedDeliveryPoint(): Promise<SelectedDeliveryPoint | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) {
    const guest = readGuestAddress();
    if (!guest) return null;
    return {
      address_id: null,
      latitude: Number(guest.latitude),
      longitude: Number(guest.longitude),
    };
  }

  const client = supabase as any;
  const { data, error } = await client
    .from('customer_addresses')
    .select('id,latitude,longitude,is_deliverable,is_default,updated_at')
    .eq('user_id', userId)
    .eq('is_deliverable', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;

  const address = data?.[0];
  if (!address) return null;
  return {
    address_id: address.id,
    latitude: Number(address.latitude),
    longitude: Number(address.longitude),
  };
}

async function resolveSelectedBranchId(): Promise<string | null> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) return null;

  const { data, error } = await rpc('find_delivery_branch', {
    p_latitude: point.latitude,
    p_longitude: point.longitude,
  });
  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const match = rows[0] as { branch_id?: string } | undefined;
  return match?.branch_id || null;
}

export function resetBranchRuntimeCache() {
  cachedRuntime = undefined;
  pendingRuntime = null;
}

export async function loadBranchRuntimeContext(force = false): Promise<BranchRuntimeContext | null> {
  if (!force && cachedRuntime !== undefined) return cachedRuntime;
  if (!force && pendingRuntime) return pendingRuntime;

  pendingRuntime = (async () => {
    const branchId = await resolveSelectedBranchId();
    if (!branchId) {
      cachedRuntime = null;
      return null;
    }

    const { data, error } = await rpc('get_customer_branch_runtime', { p_branch_id: branchId });
    if (error) {
      cachedRuntime = null;
      return null;
    }

    cachedRuntime = data && typeof data === 'object' ? data as BranchRuntimeContext : null;
    return cachedRuntime;
  })();

  try {
    return await pendingRuntime;
  } finally {
    pendingRuntime = null;
  }
}
