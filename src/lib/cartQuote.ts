import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/cartTypes';
import { isMarketplaceCart } from '@/contexts/cartTypes';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';
import { checkoutLines } from '@/lib/checkout';
import { marketplaceCheckoutLines, type MarketplaceQuote } from '@/lib/marketplaceCheckout';
import { getRoadDistance } from '@/lib/roadDistance';

export type CartQuoteLine = {
  listing_id?: string;
  product_id: string;
  name: string;
  quantity: number;
  requested_quantity?: number;
  is_bulk: boolean;
  unit_of_measure: 'weight' | 'piece';
  price: number;
  total: number;
  available_stock: number;
  bulk_quantity: number | null;
};

export type CartQuote = {
  source_kind?: 'owned' | 'marketplace';
  merchant_id?: string;
  merchant_name?: string;
  zone_id?: string;
  zone_name?: string;
  estimated_time?: string | null;
  estimated_delivery_minutes?: number | null;
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
  road_distance_km: number;
  road_duration_minutes: number | null;
  min_order_amount: number;
  minimum_order_met: boolean;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export async function quoteCart(items: CartItem[]): Promise<CartQuote> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) throw new Error('DELIVERY_ADDRESS_REQUIRED');

  if (isMarketplaceCart(items)) {
    const branchId = items[0]?.marketplace_branch_id;
    if (!branchId) throw new Error('INVALID_CART');
    const { data, error } = await rpc('quote_marketplace_cart_v1', {
      p_branch_id: branchId,
      p_items: marketplaceCheckoutLines(items),
      p_latitude: point.latitude,
      p_longitude: point.longitude,
    });
    if (error) throw error;
    const quote = data as MarketplaceQuote;
    return {
      ...quote,
      items: quote.items.map(line => ({ ...line, is_bulk: false, bulk_quantity: null })),
      delivery_branch_id: quote.branch_id,
      inventory_branch_id: quote.branch_id,
      pricing_branch_id: quote.branch_id,
      branch_name: quote.branch_name,
      distance_km: 0,
      road_distance_km: 0,
      road_duration_minutes: null,
    };
  }

  const { data, error } = await rpc('quote_customer_cart', {
    p_items: checkoutLines(items),
    p_latitude: point.latitude,
    p_longitude: point.longitude,
  });
  if (error) throw error;

  const base = data as Omit<CartQuote, 'road_distance_km' | 'road_duration_minutes'>;
  if (!base?.delivery_branch_id) throw new Error('DELIVERY_UNAVAILABLE');
  const route = await getRoadDistance(base.delivery_branch_id, point.latitude, point.longitude);
  if (!route.deliverable) throw new Error('DELIVERY_UNAVAILABLE');
  if (route.road_distance_km == null) throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  return { ...base, source_kind: 'owned', distance_km: Number(route.road_distance_km), road_distance_km: Number(route.road_distance_km), road_duration_minutes: route.duration_minutes };
}

const messages: Record<string, string> = {
  DELIVERY_ADDRESS_REQUIRED: 'حدد عنوان التوصيل عشان نحسب السلة والفرع.',
  DELIVERY_UNAVAILABLE: 'عنوانك خارج نطاق التوصيل المتاح.',
  MARKETPLACE_STORE_UNAVAILABLE: 'المتجر غير متاح للطلب حاليًا.',
  MIXED_MERCHANT_CART: 'السلة لازم تكون من متجر واحد فقط.',
  MIN_ORDER_NOT_MET: 'قيمة السلة أقل من الحد الأدنى للمتجر.',
  ROUTE_DISTANCE_UNAVAILABLE: 'تعذر حساب مسافة الطريق حاليًا. حاول مرة تانية بعد لحظات.',
  ROUTE_PROVIDER_UNAVAILABLE: 'تعذر الاتصال بخدمة الطرق حاليًا. حاول مرة تانية بعد لحظات.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات أكبر من المتاح حاليًا.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا.',
  PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. احذفه من السلة وأضفه من جديد.',
  BULK_UNAVAILABLE: 'خيار الجملة غير متاح لهذا الطلب.',
  PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  INVALID_QUANTITY: 'راجع كميات المنتجات في السلة.',
  INVALID_CART: 'راجع محتويات السلة وحاول تاني.',
  SAAS_APP_SUSPENDED: 'الخدمة متوقفة مؤقتًا بواسطة إدارة المنصة.',
  SAAS_CAPABILITY_DISABLED: 'الطلبات الأونلاين متوقفة مؤقتًا بواسطة إدارة المنصة.',
};
export function cartQuoteError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return messages[message] || 'تعذر تحديث السعر والمخزون والتوصيل. حاول مرة تانية.';
}
