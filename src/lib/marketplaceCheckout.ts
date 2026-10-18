import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/cartTypes';
import { getStoreRoadQuote } from '@/lib/storeRoadRoute';
import { normalizeSubstitutionPolicy, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

export type MarketplaceCheckoutLine = {
  listing_id: string;
  product_id: string;
  quantity: number;
  is_bulk: false;
  unit_of_measure: 'weight' | 'piece';
};

export type MarketplaceQuote = {
  source_kind: 'marketplace';
  quote_token: string;
  merchant_id: string;
  merchant_name: string;
  branch_id: string;
  branch_name: string;
  zone_id: string;
  zone_name: string;
  items: Array<{
    listing_id: string;
    product_id: string;
    name: string;
    requested_quantity: number;
    quantity: number;
    unit_of_measure: 'weight' | 'piece';
    price: number;
    total: number;
    available_stock: number;
  }>;
  subtotal: number;
  shipping_cost: number;
  total: number;
  free_delivery: false;
  min_order_amount: number;
  minimum_order_met: boolean;
  estimated_time: string | null;
  estimated_delivery_minutes: number | null;
  road_distance_km?: number;
  road_duration_minutes?: number | null;
  distance_source?: 'estimated_haversine' | 'verified_road_route';
  route_quote_id?: string;
  route_provider?: 'google' | 'osrm' | 'straight_line_fallback';
  route_degraded?: boolean;
  road_verified?: boolean;
};

export type PendingMarketplaceCheckout = {
  requestId: string;
  branchId: string;
  items: MarketplaceCheckoutLine[];
  addressId: string;
  paymentMethod: 'cash' | 'wallet';
  notes: string;
  quoteToken: string;
  routeQuoteId?: string;
  total: number;
  substitutionPolicy: SubstitutionPolicy;
};

export type PlacedMarketplaceOrder = {
  id: string;
  tracking_number: string;
  total: number;
  amount_due: number;
  merchant_id: string;
  merchant_name: string;
  source_kind: 'marketplace';
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

// Future customized lines MUST NOT silently fall back to base-item billing.
// The old RPCs cannot validate or snapshot these picks yet.
export function assertNoUnverifiedRestaurantOptions(lines: unknown[]) {
  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;
    const value = line as Record<string, unknown>;
    for (const field of ['restaurant_modifier_picks', 'modifier_picks', 'modifiers']) {
      if (!(field in value)) continue;
      const picks = value[field];
      if (picks != null && (!Array.isArray(picks) || picks.length > 0)) {
        throw new Error('RESTAURANT_MODIFIERS_NOT_READY');
      }
    }
  }
}

export function marketplaceCheckoutLines(items: CartItem[]) {
  if (!items.length || items.some(item => item.commerce_source !== 'marketplace')) throw new Error('INVALID_CART');
  assertNoUnverifiedRestaurantOptions(items);
  const branches = new Set(items.map(item => item.marketplace_branch_id).filter(Boolean));
  const merchants = new Set(items.map(item => item.merchant_id).filter(Boolean));
  if (branches.size !== 1 || merchants.size !== 1) throw new Error('MIXED_MERCHANT_CART');

  return items.map(item => {
    if (!item.marketplace_listing_id) throw new Error('INVALID_CART');
    return {
      listing_id: item.marketplace_listing_id,
      product_id: item.product.id,
      quantity: item.quantity,
      is_bulk: false as const,
      unit_of_measure: item.unit_of_measure === 'weight' ? 'weight' as const : 'piece' as const,
    };
  }).sort((a, b) => a.listing_id.localeCompare(b.listing_id));
}

export async function quoteMarketplaceOrder(items: MarketplaceCheckoutLine[], addressId: string, branchId: string) {
  const { data: address, error: addressError } = await supabase
    .from('customer_addresses')
    .select('latitude,longitude')
    .eq('id', addressId)
    .single();
  if (addressError || !address || address.latitude == null || address.longitude == null) throw new Error('ADDRESS_REQUIRED');

  const road = await getStoreRoadQuote(
    'marketplace',
    branchId,
    Number(address.latitude),
    Number(address.longitude),
  );

  const { data, error } = await rpc('quote_marketplace_cart_v2', {
    p_branch_id: branchId,
    p_items: items,
    p_latitude: Number(address.latitude),
    p_longitude: Number(address.longitude),
    p_route_quote_id: road.route_quote_id,
  });
  if (error) throw error;
  return data as MarketplaceQuote;
}

export async function placeMarketplaceOrder(order: PendingMarketplaceCheckout) {
  assertNoUnverifiedRestaurantOptions(order.items);
  // Preserve the original route for retries; the server returns a committed
  // request before checking stock or route expiry again.
  let routeQuoteId = order.routeQuoteId;
  if (!routeQuoteId) {
    const freshQuote = await quoteMarketplaceOrder(order.items, order.addressId, order.branchId);
    if (freshQuote.quote_token !== order.quoteToken) throw new Error('QUOTE_CHANGED');
    routeQuoteId = freshQuote.route_quote_id;
  }
  if (!routeQuoteId) throw new Error('ROAD_QUOTE_REQUIRED');

  const { data, error } = await rpc('place_marketplace_order_v3', {
    p_request_id: order.requestId,
    p_branch_id: order.branchId,
    p_items: order.items,
    p_address_id: order.addressId,
    p_payment_method: order.paymentMethod,
    p_notes: order.notes,
    p_quote_token: order.quoteToken,
    p_route_quote_id: routeQuoteId,
    p_substitution_policy: order.substitutionPolicy,
  });
  if (error) throw error;
  return data as PlacedMarketplaceOrder;
}

const pendingKey = (userId: string) => `pending-marketplace-checkout:${userId}`;
export function readPendingMarketplaceCheckout(userId: string): PendingMarketplaceCheckout | null {
  const raw = localStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingMarketplaceCheckout;
  if (!value.requestId || !value.branchId || !value.addressId || !value.quoteToken || !Array.isArray(value.items)) throw new Error('PENDING_STORAGE_INVALID');
  return { ...value, substitutionPolicy: normalizeSubstitutionPolicy(value.substitutionPolicy) };
}
export function savePendingMarketplaceCheckout(userId: string, value: PendingMarketplaceCheckout) {
  localStorage.setItem(pendingKey(userId), JSON.stringify(value));
}
export function removePendingMarketplaceCheckout(userId: string) {
  localStorage.removeItem(pendingKey(userId));
}

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'سجّل دخولك لإكمال الطلب.',
  PROFILE_REQUIRED: 'كمّل بيانات حسابك قبل تأكيد الطلب.',
  ADDRESS_REQUIRED: 'اختر عنوان توصيل محفوظًا في حسابك.',
  DELIVERY_ADDRESS_REQUIRED: 'حدد عنوان التوصيل على الخريطة.',
  DELIVERY_UNAVAILABLE: 'المتجر لا يوصل للعنوان المختار.',
  MARKETPLACE_STORE_UNAVAILABLE: 'المتجر غير متاح للطلب حاليًا.',
  MIXED_MERCHANT_CART: 'كل طلب لازم يكون من متجر واحد فقط.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات لم تعد متاحة.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا من هذا المتجر.',
  PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. أضفه للسلة من جديد.',
  BULK_UNAVAILABLE: 'بيع الجملة غير متاح حاليًا في متاجر الشركاء.',
  PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  MIN_ORDER_NOT_MET: 'قيمة الطلب أقل من الحد الأدنى لهذا المتجر.',
  QUOTE_CHANGED: 'السعر أو المخزون أو التوصيل اتغيّر. راجع الملخص وحاول تاني.',
  INVALID_QUANTITY: 'راجع كميات المنتجات.',
  INVALID_CART: 'راجع محتويات السلة.',
  RESTAURANT_MODIFIERS_NOT_READY: 'إضافات المطاعم لسه للمعاينة فقط؛ احذف التخصيص واطلب الصنف الأساسي.',
  INVALID_ORDER: 'راجع بيانات الطلب.',
  REQUEST_CONFLICT: 'تعذر استكمال المحاولة السابقة. راجع طلباتك.',
  ROAD_QUOTE_REQUIRED: 'تعذر تثبيت مسار التوصيل. حاول مرة تانية.',
  ROAD_QUOTE_EXPIRED: 'مسار التوصيل انتهت صلاحيته. راجع الملخص وحاول تاني.',
  ROAD_QUOTE_MISMATCH: 'العنوان أو المتجر اتغير أثناء حساب الطريق.',
  ROUTE_QUOTE_STORE_FAILED: 'تعذر تثبيت مسار الطريق حاليًا.',
  STORE_ROUTE_FAILED: 'تعذر حساب طريق المتجر حاليًا.',
  ROUTE_DISTANCE_UNAVAILABLE: 'تعذر حساب مسافة الطريق حاليًا.',
  INVALID_LOCATION: 'عنوان التوصيل غير صالح. راجع العنوان على الخريطة.',
  SAAS_APP_SUSPENDED: 'الخدمة متوقفة مؤقتًا بواسطة إدارة المنصة.',
  SAAS_CAPABILITY_DISABLED: 'الطلبات الأونلاين متوقفة مؤقتًا بواسطة إدارة المنصة.',
};

export function marketplaceCheckoutError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return messages[message] || 'تعذر تأكيد الطلب حاليًا. أعد المحاولة بنفس الطلب لتجنب التكرار.';
}

export function marketplaceDefinitelyRejected(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return ['PROFILE_REQUIRED','ADDRESS_REQUIRED','DELIVERY_ADDRESS_REQUIRED','DELIVERY_UNAVAILABLE','MARKETPLACE_STORE_UNAVAILABLE','MIXED_MERCHANT_CART','ROAD_QUOTE_REQUIRED','ROAD_QUOTE_EXPIRED','ROAD_QUOTE_MISMATCH','ROUTE_QUOTE_STORE_FAILED','STORE_ROUTE_FAILED','ROUTE_DISTANCE_UNAVAILABLE','INVALID_LOCATION','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE','PRODUCT_UNIT_CHANGED','BULK_UNAVAILABLE','PRICE_UNAVAILABLE','MIN_ORDER_NOT_MET','QUOTE_CHANGED','INVALID_QUANTITY','INVALID_CART','RESTAURANT_MODIFIERS_NOT_READY','INVALID_ORDER','SAAS_APP_SUSPENDED','SAAS_CAPABILITY_DISABLED'].includes(message);
}
