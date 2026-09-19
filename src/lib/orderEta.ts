import { supabase } from '@/lib/supabase';

export type OrderEtaRisk = 'on_track' | 'at_risk' | 'late' | 'completed' | 'cancelled';

export type OrderEtaComponents = {
  queue_wait_minutes?: number;
  picking_minutes?: number;
  substitution_minutes?: number;
  packing_minutes?: number;
  dispatch_wait_minutes?: number;
  driver_to_branch_minutes?: number;
  prior_stops_minutes?: number;
  road_minutes?: number;
  uncertainty_minutes?: number;
  remaining_minutes?: number;
  full_order_minutes?: number;
  ready_remaining_minutes?: number;
  ready_eta?: string | null;
  queue_ahead?: number;
  queue_remaining_lines?: number;
  active_pickers?: number;
  available_drivers?: number;
  busy_drivers?: number;
  item_lines?: number;
  remaining_lines?: number;
  weight_lines?: number;
  bulk_lines?: number;
  progress_ratio?: number;
  complexity_multiplier?: number;
  pending_substitutions?: number;
  pending_customer_substitutions?: number;
  distance_km?: number;
  route_duration_minutes?: number | null;
  route_provider?: string | null;
  route_degraded?: boolean | null;
  branch_prep_samples?: number;
  branch_dispatch_samples?: number;
  branch_road_samples?: number;
  confidence_score?: number;
};

export type OrderEta = {
  order_id: string;
  stage: string;
  promised_at: string | null;
  promised_window_start: string | null;
  promised_window_end: string | null;
  live_eta: string | null;
  live_window_start: string | null;
  live_window_end: string | null;
  confidence: 'high' | 'medium' | 'low' | string;
  risk: OrderEtaRisk | string;
  components: OrderEtaComponents | null;
  model_version: string;
  calculated_at: string;
};

type OrderEtaMap = Record<string, OrderEta>;
type RpcResult = Promise<{ data: unknown; error: { message: string } | null }>;

const callRpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => RpcResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export async function getMyOrderEtas(): Promise<OrderEtaMap> {
  const { data, error } = await callRpc('get_my_order_etas_v1');
  if (error) throw new Error(error.message);
  if (!isRecord(data)) return {};
  return data as OrderEtaMap;
}

export async function getMyOrderEta(orderId: string): Promise<OrderEta | null> {
  const { data, error } = await callRpc('get_my_order_eta_v1', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  if (!isRecord(data)) return null;
  return data as unknown as OrderEta;
}
