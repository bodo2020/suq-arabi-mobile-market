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

export type LoyaltyVoucher = {
  id: string;
  voucher_code: string;
  barcode_token: string;
  initial_value_egp: number;
  remaining_value_egp: number;
  points_spent: number;
  status: 'active' | 'redeemed' | 'cancelled';
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at?: string;
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

export async function getMyLoyaltyVouchers(status?: LoyaltyVoucher['status']): Promise<LoyaltyVoucher[]> {
  const { data, error } = await rpc('get_my_loyalty_vouchers', { p_status: status || null });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as LoyaltyVoucher[];
}

export async function createLoyaltyVoucher(points: number): Promise<LoyaltyVoucher> {
  const safePoints = Math.trunc(Number(points));
  if (!Number.isFinite(safePoints) || safePoints <= 0) throw new Error('INVALID_VOUCHER_POINTS');
  const { data, error } = await rpc('create_loyalty_voucher', { p_points: safePoints });
  if (error) throw error;
  return data as LoyaltyVoucher;
}

export function loyaltyVoucherError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  if (message.includes('INSUFFICIENT_LOYALTY_POINTS')) return 'رصيد النقاط غير كافٍ لإنشاء الفاوچر.';
  if (message.includes('INVALID_VOUCHER_POINTS')) return 'اختار عدد نقاط صحيح بمضاعفات 1000 نقطة.';
  if (message.includes('LOYALTY_ACCOUNT_SUSPENDED')) return 'حساب الولاء موقوف حاليًا.';
  if (message.includes('LOYALTY_DISABLED')) return 'تحويل النقاط متوقف مؤقتًا.';
  if (message.includes('VOUCHER_UNAVAILABLE')) return 'الفاوچر غير متاح للاستخدام.';
  if (message.includes('VOUCHER_CUSTOMER_MISMATCH')) return 'الفاوچر لا يخص هذا الحساب.';
  return 'تعذر تنفيذ العملية. حاول مرة تانية.';
}
