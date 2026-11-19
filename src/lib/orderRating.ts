import { supabase } from '@/lib/supabase';

type RpcResult = Promise<{ data: unknown; error: { message?: string } | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args?: Record<string, unknown>) => RpcResult;

export type MyOrderRating = {
  order_stars: number;
  driver_stars: number | null;
  comment: string | null;
  created_at: string;
};

export const ORDER_TAGS = ['التغليف كان كويس', 'المنتجات طازة', 'الطلب كامل', 'السعر مناسب'];
export const ORDER_TAGS_LOW = ['منتج ناقص', 'منتج مش طازة', 'تغليف سيء', 'الطلب اتأخر'];
export const DRIVER_TAGS = ['محترم', 'سريع', 'التزم بالموعد', 'اتصل قبل ما يوصل'];
export const DRIVER_TAGS_LOW = ['اتأخر', 'تعامل مش كويس', 'مكلمنيش', 'الطلب وصل متضرر'];

export async function getMyOrderRating(orderId: string): Promise<MyOrderRating | null> {
  const { data, error } = await rpc('get_my_order_rating_v1', { p_order_id: orderId });
  if (error) throw new Error(error.message || 'rating_load_failed');
  return (data as MyOrderRating | null) ?? null;
}

export async function submitMyOrderRating(input: {
  orderId: string;
  orderStars: number;
  driverStars: number | null;
  comment: string;
  orderTags: string[];
  driverTags: string[];
}): Promise<{ ok: boolean; already_rated: boolean }> {
  const { data, error } = await rpc('submit_my_order_rating_v1', {
    p_order_id: input.orderId,
    p_order_stars: input.orderStars,
    p_driver_stars: input.driverStars,
    p_comment: input.comment.trim() || null,
    p_order_tags: input.orderTags,
    p_driver_tags: input.driverTags,
  });
  if (error) throw new Error(error.message || 'rating_submit_failed');
  return data as { ok: boolean; already_rated: boolean };
}

export function ratingErrorMessage(message: string): string {
  if (message.includes('rating_window_closed')) return 'انتهت مدة تقييم الطلب (7 أيام).';
  if (message.includes('order_not_delivered')) return 'تقدر تقيّم الطلب بعد ما يتسلّم.';
  if (message.includes('order_not_found')) return 'مش لاقيين الطلب ده في حسابك.';
  return 'تعذر إرسال التقييم. حاول تاني.';
}
