import { supabase } from '@/lib/supabase';

export type LoyaltyCard = {
  customer_id: string;
  name: string | null;
  phone: string | null;
  membership_number: string;
  barcode_token: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  status: 'active' | 'suspended';
  points_per_egp: number;
  redemption_points: number;
  redemption_value_egp: number;
  redeemable_credit_egp: number;
};

export type LoyaltyEntry = {
  id: string;
  entry_type: 'earn' | 'redeem' | 'reversal' | 'adjustment' | 'bonus';
  points_delta: number;
  value_egp: number | null;
  source_type: string;
  source_id: string | null;
  branch_id: string | null;
  reference: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export async function getMyLoyaltyCard(): Promise<LoyaltyCard> {
  const { data, error } = await rpc('get_my_loyalty_card');
  if (error) throw error;
  return data as LoyaltyCard;
}

export async function getMyLoyaltyHistory(limit = 50): Promise<LoyaltyEntry[]> {
  const { data, error } = await rpc('get_my_loyalty_history', { p_limit: limit });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as LoyaltyEntry[];
}
