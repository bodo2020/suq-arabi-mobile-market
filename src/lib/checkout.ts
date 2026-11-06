import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/cartTypes';
import { getStoreRoadQuote } from '@/lib/storeRoadRoute';
import { normalizeSubstitutionPolicy, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

export type CheckoutLine = { product_id: string; quantity: number; is_bulk: boolean; unit_of_measure: 'weight' | 'piece' };
export type QuoteLine = CheckoutLine & { name: string; price: number; total: number; bulk_quantity?: number };
export type CheckoutQuote = {
  quote_token: string;
  items: QuoteLine[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  free_delivery: boolean;
  branch_id: string;
  inventory_branch_id?: string;
  pricing_branch_id?: string;
  road_distance_km?: number;
  road_duration_minutes?: number | null;
  distance_source?: 'estimated_haversine' | 'verified_road_route';
  route_quote_id?: string;
  route_provider?: 'google' | 'osrm' | 'straight_line_fallback';
  route_degraded?: boolean;
  road_verified?: boolean;
};
export type PendingCheckout = {
  requestId: string;
  items: CheckoutLine[];
  addressId: string;
  paymentMethod: 'cash' | 'wallet';
  notes: string;
  quoteToken: string;
  total: number;
  voucherCode?: string | null;
  voucherAmount?: number;
  substitutionPolicy: SubstitutionPolicy;
};
export type PlacedOrder = {
  id: string;
  tracking_number: string;
  total: number;
  loyalty_voucher_amount?: number;
  amount_due?: number;
  voucher_remaining_egp?: number | null;
};
export type CheckoutAttemptResolution = {
  exists: boolean;
  request_id?: string;
  id?: string;
  tracking_number?: string;
  total?: number;
  loyalty_voucher_amount?: number;
  amount_due?: number;
  status?: string;
  payment_status?: string;
  created_at?: string;
};
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
export const checkoutLines = (items: CartItem[]): CheckoutLine[] => items.map(item => ({ product_id: item.product.id, quantity: item.quantity, is_bulk: !!item.is_bulk, unit_of_measure: item.unit_of_measure === 'weight' ? 'weight' as const : 'piece' as const })).sort((a,b) => `${a.product_id}:${a.is_bulk}`.localeCompare(`${b.product_id}:${b.is_bulk}`));

export async function quoteOrder(items: CheckoutLine[], addressId: string) {
  const [{ data: address, error: addressError }, initial] = await Promise.all([
    supabase
      .from('customer_addresses')
      .select('latitude,longitude')
      .eq('id', addressId)
      .single(),
    rpc('quote_customer_order', { p_items: items, p_address_id: addressId }),
  ]);
  if (addressError || !address || address.latitude == null || address.longitude == null) {
    throw new Error('ADDRESS_REQUIRED');
  }
  if (initial.error) throw initial.error;

  const initialQuote = initial.data as CheckoutQuote;
  if (!initialQuote?.branch_id) throw new Error('DELIVERY_UNAVAILABLE');

  const road = await getStoreRoadQuote(
    'owned',
    initialQuote.branch_id,
    Number(address.latitude),
    Number(address.longitude),
  );

  const { data, error } = await rpc('quote_customer_order_v2', {
    p_items: items,
    p_address_id: addressId,
    p_route_quote_id: road.route_quote_id,
  });
  if (error) throw error;
  return data as CheckoutQuote;
}

export async function placeOrder(order: PendingCheckout) {
  const freshQuote = await quoteOrder(order.items, order.addressId);
  if (freshQuote.quote_token !== order.quoteToken) throw new Error('QUOTE_CHANGED');

  if (!freshQuote.route_quote_id) throw new Error('ROAD_QUOTE_REQUIRED');

  const { data, error } = await rpc('place_customer_order_with_voucher_v3', {
    p_request_id: order.requestId,
    p_items: order.items,
    p_address_id: order.addressId,
    p_payment_method: order.paymentMethod,
    p_notes: order.notes,
    p_quote_token: order.quoteToken,
    p_voucher_code: order.voucherCode || null,
    p_voucher_amount: Number(order.voucherAmount || 0) > 0 ? Number(order.voucherAmount) : null,
    p_route_quote_id: freshQuote.route_quote_id,
    p_substitution_policy: order.substitutionPolicy,
  });
  if (error) throw error;
  return data as PlacedOrder;
}

export async function reconcilePendingCheckoutAttempt(requestId: string) {
  const { data, error } = await rpc('reconcile_customer_checkout_attempt', { p_request_id: requestId });
  if (error) throw error;
  return data as CheckoutAttemptResolution;
}

const key = (userId: string) => `pending-checkout:${userId}`;
export function readPendingCheckout(userId: string): PendingCheckout | null {
  const saved = localStorage.getItem(key(userId));
  if (!saved) return null;
  const value = JSON.parse(saved) as PendingCheckout;
  if (!value.requestId || !Array.isArray(value.items) || !value.addressId || !value.quoteToken) throw new Error('PENDING_STORAGE_INVALID');
  return { ...value, substitutionPolicy: normalizeSubstitutionPolicy(value.substitutionPolicy) };
}
export function savePendingCheckout(userId: string, value: PendingCheckout) { localStorage.setItem(key(userId), JSON.stringify(value)); }
export function removePendingCheckout(userId: string) { localStorage.removeItem(key(userId)); }
export async function preparePendingCheckout(userId: string, value: PendingCheckout) {
  const persist = () => {
    const existing = readPendingCheckout(userId);
    if (existing) return existing;
    savePendingCheckout(userId, value);
    return value;
  };
  if (navigator.locks) return navigator.locks.request(key(userId), persist);
  return persist();
}
const messages: Record<string,string> = {
  AUTH_REQUIRED: 'سجّل دخولك لإكمال الطلب.', PROFILE_REQUIRED: 'كمّل اسمك في بيانات الحساب.',
  ADDRESS_REQUIRED: 'اختر عنوان توصيل محفوظًا في حسابك.', DELIVERY_UNAVAILABLE: 'العنوان خارج نطاق التوصيل حسب مسافة الطريق الفعلية.',
  ROUTE_DISTANCE_UNAVAILABLE: 'تعذر حساب مسافة الطريق حاليًا. حاول مرة تانية بعد لحظات.',
  ROUTE_PROVIDER_UNAVAILABLE: 'تعذر الاتصال بخدمة الطرق حاليًا. حاول مرة تانية بعد لحظات.',
  ROAD_QUOTE_REQUIRED: 'تعذر تثبيت مسار التوصيل. حاول مرة تانية.',
  ROAD_QUOTE_EXPIRED: 'مسار التوصيل انتهت صلاحيته وتم تحديثه. حاول مرة تانية.',
  ROAD_QUOTE_MISMATCH: 'العنوان أو الفرع اتغير أثناء حساب الطريق. راجع الطلب.',
  ROUTE_QUOTE_STORE_FAILED: 'تعذر تثبيت مسار التوصيل حاليًا. حاول مرة تانية.',
  STORE_ROUTE_FAILED: 'تعذر حساب طريق التوصيل حاليًا. حاول مرة تانية.',
  INVALID_LOCATION: 'عنوان التوصيل غير صالح. راجع العنوان على الخريطة.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات غير متاحة في فرع التوصيل. عدّل الشنطة ثم حاول تاني.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا. راجع شنطتك.', PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. احذفه من الشنطة وأضفه من جديد.',
  BULK_UNAVAILABLE: 'عرض العبوة لم يعد متاحًا. راجع شنطتك.', PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  INVALID_QUANTITY: 'راجع كميات المنتجات في الشنطة.', INVALID_CART: 'راجع المنتجات والكميات في الشنطة.',
  QUOTE_CHANGED: 'السعر أو بيانات التوصيل اتغيّرت. راجع الملخص المحدّث وأكّد الطلب مرة تانية.',
  CHECKOUT_NOT_READY: 'تأكيد الطلبات الجديد قيد التجهيز. حاول لاحقًا.',
  REQUEST_CONFLICT: 'تعذّر استكمال المحاولة السابقة. راجع طلباتك قبل إنشاء طلب جديد.',
  VOUCHER_NOT_FOUND: 'كوبون الخصم غير موجود.',
  VOUCHER_UNAVAILABLE: 'كوبون الخصم مستخدم بالكامل أو غير متاح.',
  VOUCHER_CUSTOMER_MISMATCH: 'كوبون الخصم لا يخص هذا الحساب.',
  INVALID_VOUCHER_AMOUNT: 'قيمة كوبون الخصم المطلوبة غير صالحة.',
  VOUCHER_BALANCE_CHANGED: 'رصيد كوبون الخصم اتغيّر. حدّث الصفحة وحاول مرة تانية.',
};
export function checkoutError(error: unknown): string { return messages[(error as { message?: string })?.message || ''] || 'لم نقدر نتأكد من نتيجة الطلب. أعد المحاولة بنفس الطلب لتجنّب التكرار.'; }
export const definitelyRejected = (error: unknown) => ['QUOTE_CHANGED','ROAD_QUOTE_REQUIRED','ROAD_QUOTE_EXPIRED','ROAD_QUOTE_MISMATCH','ROUTE_QUOTE_STORE_FAILED','STORE_ROUTE_FAILED','INVALID_LOCATION','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE','PRODUCT_UNIT_CHANGED','BULK_UNAVAILABLE','PRICE_UNAVAILABLE','INVALID_QUANTITY','INVALID_CART','CHECKOUT_NOT_READY','ADDRESS_REQUIRED','PROFILE_REQUIRED','DELIVERY_UNAVAILABLE','VOUCHER_NOT_FOUND','VOUCHER_UNAVAILABLE','VOUCHER_CUSTOMER_MISMATCH','INVALID_VOUCHER_AMOUNT','VOUCHER_BALANCE_CHANGED'].includes((error as { message?: string })?.message || '');
