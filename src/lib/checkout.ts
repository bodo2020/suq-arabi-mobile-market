import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/cartTypes';
export type CheckoutLine = { product_id: string; quantity: number; is_bulk: boolean; unit_of_measure: 'weight' | 'piece' };
export type QuoteLine = CheckoutLine & { name: string; price: number; total: number; bulk_quantity?: number };
export type CheckoutQuote = { quote_token: string; items: QuoteLine[]; subtotal: number; shipping_cost: number; total: number; free_delivery: boolean };
export type PendingCheckout = { requestId: string; items: CheckoutLine[]; addressId: string; paymentMethod: 'cash' | 'wallet'; notes: string; quoteToken: string; total: number };
export type PlacedOrder = { id: string; tracking_number: string; total: number };
const rpc = supabase.rpc.bind(supabase) as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
export const checkoutLines = (items: CartItem[]): CheckoutLine[] => items.map(item => ({ product_id: item.product.id, quantity: item.quantity, is_bulk: !!item.is_bulk, unit_of_measure: item.unit_of_measure === 'weight' ? 'weight' as const : 'piece' as const })).sort((a,b) => `${a.product_id}:${a.is_bulk}`.localeCompare(`${b.product_id}:${b.is_bulk}`));
export async function quoteOrder(items: CheckoutLine[], addressId: string) {
  const { data, error } = await rpc('quote_customer_order', { p_items: items, p_address_id: addressId });
  if (error) throw error;
  return data as CheckoutQuote;
}
export async function placeOrder(order: PendingCheckout) {
  const { data, error } = await rpc('place_customer_order', { p_request_id: order.requestId, p_items: order.items, p_address_id: order.addressId, p_payment_method: order.paymentMethod, p_notes: order.notes, p_quote_token: order.quoteToken });
  if (error) throw error;
  return data as PlacedOrder;
}
const key = (userId: string) => `pending-checkout:${userId}`;
export function readPendingCheckout(userId: string): PendingCheckout | null {
  const saved = localStorage.getItem(key(userId));
  if (!saved) return null;
  const value = JSON.parse(saved) as PendingCheckout;
  if (!value.requestId || !Array.isArray(value.items) || !value.addressId || !value.quoteToken) throw new Error('PENDING_STORAGE_INVALID');
  return value;
}
// Persist before dispatch. Storage failure prevents a request that cannot be replayed safely.
export function savePendingCheckout(userId: string, value: PendingCheckout) { localStorage.setItem(key(userId), JSON.stringify(value)); }
export function removePendingCheckout(userId: string) { localStorage.removeItem(key(userId)); }
export async function preparePendingCheckout(userId: string, value: PendingCheckout) {
  const persist = () => {
    const existing = readPendingCheckout(userId);
    if (existing) return existing;
    savePendingCheckout(userId, value);
    return value;
  };
  // Serialize the first persisted request across tabs when Web Locks is supported.
  if (navigator.locks) return navigator.locks.request(key(userId), persist);
  return persist();
}
const messages: Record<string,string> = {
  AUTH_REQUIRED: 'سجّل دخولك لإكمال الطلب.', PROFILE_REQUIRED: 'كمّل اسمك في بيانات الحساب.',
  ADDRESS_REQUIRED: 'اختر عنوان توصيل محفوظًا في حسابك.', DELIVERY_UNAVAILABLE: 'التوصيل غير متاح لهذا العنوان حاليًا.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات غير متاحة في فرع التوصيل. عدّل السلة ثم حاول تاني.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا. راجع سلتك.', PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. احذفه من السلة وأضفه من جديد.',
  BULK_UNAVAILABLE: 'عرض العبوة لم يعد متاحًا. راجع سلتك.', PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  INVALID_QUANTITY: 'راجع كميات المنتجات في السلة.', INVALID_CART: 'راجع المنتجات والكميات في السلة.',
  QUOTE_CHANGED: 'السعر أو بيانات التوصيل اتغيّرت. راجع الملخص المحدّث وأكّد الطلب مرة تانية.',
  CHECKOUT_NOT_READY: 'تأكيد الطلبات الجديد قيد التجهيز. حاول لاحقًا.',
  REQUEST_CONFLICT: 'تعذّر استكمال المحاولة السابقة. راجع طلباتك قبل إنشاء طلب جديد.',
};
export function checkoutError(error: unknown): string { return messages[(error as { message?: string })?.message || ''] || 'لم نقدر نتأكد من نتيجة الطلب. أعد المحاولة بنفس الطلب لتجنّب التكرار.'; }
export const definitelyRejected = (error: unknown) => ['QUOTE_CHANGED','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE','PRODUCT_UNIT_CHANGED','BULK_UNAVAILABLE','PRICE_UNAVAILABLE','INVALID_QUANTITY','INVALID_CART','CHECKOUT_NOT_READY','ADDRESS_REQUIRED','PROFILE_REQUIRED'].includes((error as { message?: string })?.message || '');
