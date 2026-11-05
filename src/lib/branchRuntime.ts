import { supabase } from '@/integrations/supabase/client';
import { readGuestAddress, resolveDeliveryLocation } from '@/lib/deliveryAddress';

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

type PersistedBranchRuntime = {
  version: 1;
  savedAt: number;
  runtime: BranchRuntimeContext;
};

const RUNTIME_STORAGE_KEY = 'elmadawy_branch_runtime_cache_v1';
const RUNTIME_MAX_AGE_MS = 1000 * 60 * 60 * 48;

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

let cachedRuntime: BranchRuntimeContext | null | undefined;
let pendingRuntime: Promise<BranchRuntimeContext | null> | null = null;
// The branch saved on this device last time. At app start it is served
// immediately (stale-while-revalidate) while the real lookup — delivery
// branch -> road-distance check -> branch runtime, ~1.5s on mobile — runs in
// the background. Cleared whenever the delivery address changes, so an old
// branch is never shown for a new address. Checkout re-prices server-side.
let staleRuntime: BranchRuntimeContext | null | undefined;

function getStaleRuntime(): BranchRuntimeContext | null {
  if (staleRuntime === undefined) staleRuntime = readPersistedBranchRuntime();
  return staleRuntime;
}

/** The best branch known right now without waiting: resolved, else saved. */
export function peekBranchRuntime(): BranchRuntimeContext | null {
  return cachedRuntime ?? getStaleRuntime() ?? null;
}

function readPersistedBranchRuntime(): BranchRuntimeContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as PersistedBranchRuntime;
    if (
      cached.version !== 1 ||
      !cached.runtime?.delivery_branch_id ||
      Date.now() - Number(cached.savedAt || 0) > RUNTIME_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(RUNTIME_STORAGE_KEY);
      return null;
    }

    return cached.runtime;
  } catch {
    return null;
  }
}

function persistBranchRuntime(runtime: BranchRuntimeContext) {
  if (typeof window === 'undefined') return;

  try {
    const payload: PersistedBranchRuntime = {
      version: 1,
      savedAt: Date.now(),
      runtime,
    };
    window.localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Offline cache is best-effort and must never block shopping.
  }
}

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

  const match = await resolveDeliveryLocation(point.latitude, point.longitude);
  return match?.branch_id || null;
}

/** Forget everything, including the saved branch (e.g. the address changed). */
export function resetBranchRuntimeCache() {
  cachedRuntime = undefined;
  pendingRuntime = null;
  staleRuntime = null;
}

export async function loadBranchRuntimeContext(force = false): Promise<BranchRuntimeContext | null> {
  if (!force && cachedRuntime !== undefined) return cachedRuntime;
  if (!force) {
    const stale = getStaleRuntime();
    if (stale) {
      if (!pendingRuntime) void loadBranchRuntimeContext(true).catch(() => {});
      return stale;
    }
  }
  // One lookup at a time: a forced call joins the one already running
  // (resetBranchRuntimeCache() drops it when the address changes).
  if (pendingRuntime) return pendingRuntime;

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const persisted = readPersistedBranchRuntime();
    cachedRuntime = persisted;
    return persisted;
  }

  pendingRuntime = (async () => {
    const branchId = await resolveSelectedBranchId();
    if (!branchId) {
      cachedRuntime = null;
      return null;
    }

    const { data, error } = await rpc('get_customer_branch_runtime', { p_branch_id: branchId });
    if (error) {
      const persisted = readPersistedBranchRuntime();
      cachedRuntime = persisted?.delivery_branch_id === branchId ? persisted : null;
      return cachedRuntime;
    }

    cachedRuntime = data && typeof data === 'object' ? data as BranchRuntimeContext : null;
    if (cachedRuntime) persistBranchRuntime(cachedRuntime);
    return cachedRuntime;
  })();

  try {
    return await pendingRuntime;
  } finally {
    pendingRuntime = null;
  }
}
