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

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

let cachedRuntime: BranchRuntimeContext | null | undefined;
let pendingRuntime: Promise<BranchRuntimeContext | null> | null = null;

async function resolveSelectedBranchId(): Promise<string | null> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) return readGuestAddress()?.assigned_branch_id || null;

  const client = supabase as any;
  const { data, error } = await client
    .from('customer_addresses')
    .select('assigned_branch_id,is_deliverable,latitude,longitude,is_default,updated_at')
    .eq('user_id', userId)
    .eq('is_deliverable', true)
    .not('assigned_branch_id', 'is', null)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.assigned_branch_id || null;
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
