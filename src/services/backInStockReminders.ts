import { supabase } from '@/lib/supabase';

export type BackInStockReminderRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  delivery_branch_id: string;
  created_at: string;
};

export type BackInStockReminderResult = {
  active: boolean;
  available: boolean;
  reminder_id?: string;
};

export const backInStockReminderKey = (productId: string, variantId?: string | null) =>
  variantId ? `variant:${variantId}` : `product:${productId}`;

export async function getMyBackInStockReminders(deliveryBranchId: string): Promise<BackInStockReminderRow[]> {
  const { data, error } = await (supabase as any).rpc('get_my_back_in_stock_reminders_v1', {
    p_delivery_branch_id: deliveryBranchId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data as BackInStockReminderRow[] : [];
}

export async function setBackInStockReminder(input: {
  productId: string;
  variantId?: string | null;
  deliveryBranchId: string;
  enabled: boolean;
}): Promise<BackInStockReminderResult> {
  const { data, error } = await (supabase as any).rpc('set_back_in_stock_reminder_v1', {
    p_product_id: input.productId,
    p_variant_id: input.variantId || null,
    p_delivery_branch_id: input.deliveryBranchId,
    p_enabled: input.enabled,
  });
  if (error) throw error;
  return (data || { active: false, available: false }) as BackInStockReminderResult;
}
