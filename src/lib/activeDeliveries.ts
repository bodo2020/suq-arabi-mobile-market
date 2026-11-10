import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

export type ActiveDelivery = {
  /** order id, or the group id of a combined order */
  order_id: string;
  order_number: string;
  shipped_at: string;
  driver_name: string | null;
  /** delivery confirmation code; null until a rider is assigned */
  pin: string | null;
};

type Rpc = (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

export async function getMyActiveDeliveries(): Promise<ActiveDelivery[]> {
  const { data, error } = await rpc('get_my_active_deliveries_v1');
  if (error) throw new Error(error.message || 'ACTIVE_DELIVERIES_FAILED');
  return Array.isArray(data) ? (data as ActiveDelivery[]) : [];
}

/** Orders that left the store and are on their way, with the confirmation code. */
export function useActiveDeliveries() {
  const { user, session } = useUser();
  return useQuery({
    queryKey: ['active-deliveries', user?.id],
    queryFn: getMyActiveDeliveries,
    enabled: Boolean(user?.id && session),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Cancel an order (or combined order) that has not left the store yet. */
export async function cancelMyOrder(orderId: string): Promise<void> {
  const { error } = await rpc('cancel_my_online_order_v1', { p_order_id: orderId });
  if (!error) return;
  const message = error.message || '';
  if (message.includes('ORDER_ALREADY_LEFT')) throw new Error('الطلب خرج من المحل خلاص، ومينفعش يتلغي دلوقتي.');
  if (message.includes('PAID_ORDER_CONTACT_STORE')) throw new Error('الطلب ده مدفوع أونلاين. كلّم المحل عشان نلغيه ونرجعلك فلوسك.');
  if (message.includes('ORDER_NOT_CANCELLABLE')) throw new Error('الطلب ده اتلغى أو مش موجود.');
  throw new Error('معرفناش نلغي الطلب. جرّب تاني.');
}
