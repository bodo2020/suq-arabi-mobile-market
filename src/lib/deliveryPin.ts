import { supabase } from '@/integrations/supabase/client';

export type DeliveryPin = {
  order_id: string;
  pin: string;
  expires_at: string;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

export async function getMyOrderDeliveryPin(orderId: string): Promise<DeliveryPin | null> {
  const { data, error } = await rpc('get_my_order_delivery_pin_v1', {
    p_order_id: orderId,
  });

  if (error) {
    const message = error.message || '';
    if (
      message.includes('delivery_pin_unavailable')
      || message.includes('order_access_denied')
      || message.includes('authentication_required')
    ) {
      return null;
    }
    throw new Error(message || 'DELIVERY_PIN_FAILED');
  }

  const value = data as DeliveryPin | null;
  if (!value?.pin) return null;
  return value;
}
