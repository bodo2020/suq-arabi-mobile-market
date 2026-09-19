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
