import { supabase } from '@/lib/supabase';

export type OrderGroupStoreOperation = {
  order_id: string;
  source_kind: 'owned' | 'marketplace';
  branch_id: string;
  branch_name: string;
  merchant_id: string;
  merchant_name: string;
  pickup_sequence: number | null;
  status: string;
  fulfillment_state: string | null;
  predicted_ready_at: string | null;
  ready_at: string | null;
  updated_at: string | null;
};

export type OrderGroupRouteStop = {
  stop_order: number;
  stop_type: 'pickup' | 'customer';
  display_name: string;
  status: string;
  eta: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  ready: boolean;
  has_issue: boolean;
};

export type OrderGroupRouteProgress = {
  pickups_total: number;
  pickups_completed: number;
  pickups_arrived: number;
  pickup_issues_open: number;
  all_pickups_completed: boolean;
  delivery_phase:
    | 'waiting_dispatch'
    | 'driver_assigned'
    | 'heading_to_pickups'
    | 'collecting_pickups'
    | 'all_pickups_collected'
    | 'on_the_way'
    | 'arrived_customer'
    | 'delivered'
    | 'delivery_issue'
    | 'return_to_branch'
    | string;
  next_pickup: {
    stop_order: number;
    display_name: string;
    status: string;
    eta: string | null;
    has_issue: boolean;
  } | null;
};

export type OrderGroupRoute = {
  status: string;
  driver_name: string | null;
  distance_km: number | null;
  estimated_minutes: number | null;
  updated_at: string | null;
};

export type OrderGroupOperations = {
  group_id: string;
  status: string;
  stores_count: number;
  partner_stores_count: number;
  route_distance_km: number | null;
  route_duration_minutes: number | null;
  operations: {
    status?: string;
    stores_total?: number;
    stores_active?: number;
    pending?: number;
    confirmed?: number;
    preparing?: number;
    ready?: number;
    shipped?: number;
    delivered?: number;
    cancelled?: number;
    all_active_ready?: boolean;
    partially_cancelled?: boolean;
    updated_at?: string;
  };
  stores: OrderGroupStoreOperation[];
  route: OrderGroupRoute | null;
  route_progress: OrderGroupRouteProgress;
  route_stops: OrderGroupRouteStop[];
  updated_at: string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

export async function getCustomerOrderGroupOperations(groupId: string) {
  const { data, error } = await rpc('get_customer_order_group_operations_v1', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data as OrderGroupOperations;
}

export async function getCustomerOrderGroupsOperations(groupIds: string[]) {
  const unique = [...new Set(groupIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async groupId => {
      try {
        const value = await getCustomerOrderGroupOperations(groupId);
        return [groupId, value] as const;
      } catch {
        return [groupId, null] as const;
      }
    }),
  );

  return Object.fromEntries(entries) as Record<string, OrderGroupOperations | null>;
}
