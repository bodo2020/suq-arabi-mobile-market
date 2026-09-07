import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/cartTypes';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';
import { checkoutLines } from '@/lib/checkout';

export type CartQuoteLine = {
  product_id: string;
  name: string;
  quantity: number;
  is_bulk: boolean;
  unit_of_measure: 'weight' | 'piece';
  price: number;
  total: number;
  available_stock: number;
  bulk_quantity: number | null;
};

export type CartQuote = {
  items: CartQuoteLine[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  free_delivery: boolean;
  delivery_branch_id: string;
  inventory_branch_id: string;
  pricing_branch_id: string;
  branch_name: string;
  distance_km: number;
  min_order_amount: number;
  minimum_order_met: boolean;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function quoteCart(items: CartItem[]): Promise<CartQuote> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) throw new Error('DELIVERY_ADDRESS_REQUIRED');

  const { data, error } = await rpc('quote_customer_cart', {
    p_items: checkoutLines(items),
    p_latitude: point.latitude,
    p_longitude: point.longitude,
  });
  if (error) throw error;
  return data as CartQuote;
}

const messages: Record<string, string> = {
  DELIVERY_ADDRESS_REQUIRED: 'حدد عنوان التوصيل عشان نحسب السلة والفرع.',
  DELIVERY_UNAVAILABLE: 'عنوانك خارج نطاق التوصيل الحالي.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات أكبر من المتاح حاليًا في فرع التوصيل.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا في فرع التوصيل.',
  PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. احذفه من السلة وأضفه من جديد.',
  BULK_UNAVAILABLE: 'خيار الجملة لأحد المنتجات لم يعد متاحًا.',
  PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  INVALID_QUANTITY: 'راجع كميات المنتجات في السلة.',
  INVALID_CART: 'راجع محتويات السلة وحاول تاني.',
};

export function cartQuoteError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return messages[message] || 'تعذر تحديث أسعار ومخزون السلة من الفرع. حاول مرة تانية.';
}
