import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/contexts/cartTypes';
import { checkoutLines } from '@/lib/checkout';
import { marketplaceCheckoutLines } from '@/lib/marketplaceCheckout';
import { getMultiStoreRoadQuote } from '@/lib/multistoreRoadRoute';
import { normalizeSubstitutionPolicy, type SubstitutionPolicy } from '@/lib/substitutionPolicy';

export type CombinedCheckoutSource =
  | { source_kind: 'owned'; items: ReturnType<typeof checkoutLines> }
  | { source_kind: 'marketplace'; branch_id: string; items: ReturnType<typeof marketplaceCheckoutLines> };

export type CombinedSourcePlan = {
  source_kind: 'owned' | 'marketplace';
  branch_id: string;
  merchant_id: string;
  input_items: unknown[];
  plan: {
    quote_token: string;
    merchant_name?: string;
    branch_name?: string;
    subtotal: number;
    items: Array<{ product_id: string; name?: string; product_name?: string; total: number }>;
  };
};

export type CombinedOrderQuote = {
  source_kind: 'combined';
  quote_token: string;
  customer_id: string;
  address_id: string;
  hub_branch_id: string;
  hub_branch_name: string;
  stores_count: number;
  partner_stores_count: number;
  sources: CombinedSourcePlan[];
  subtotal: number;
  shipping_cost: number;
  delivery_cost: number;
  merchant_delivery_subsidy: number;
  elmadawy_delivery_subsidy: number;
  total: number;
  route_quote_id: string;
  road_verified: boolean;
  delivery: {
    route_distance_km: number;
    estimated_route_minutes: number;
    detour_km: number;
    distance_source?: 'estimated_haversine' | 'verified_road_route';
    route_quote_id?: string;
    route_quote_expires_at?: string;
    route_provider?: 'google' | 'osrm' | 'straight_line_fallback';
    route_degraded?: boolean;
    customer_delivery_fee: number;
    extra_pickup_fee: number;
    stops: Array<{
      type: 'pickup' | 'customer';
      source_kind?: 'owned' | 'marketplace';
      branch_id?: string;
      branch_name?: string;
      address?: string | null;
    }>;
  };
};

export type PendingCombinedCheckout = {
  groupId: string;
  sources: CombinedCheckoutSource[];
  addressId: string;
  paymentMethod: 'cash' | 'wallet';
  notes: string;
  quoteToken: string;
  total: number;
  substitutionPolicy: SubstitutionPolicy;
};

export type PlacedCombinedOrder = {
  id: string;
  order_group_id: string;
  tracking_number: string;
  subtotal: number;
  shipping_cost: number;
  delivery_cost: number;
  total: number;
  amount_due: number;
  stores_count: number;
  partner_stores_count: number;
  source_kind: 'combined';
  orders: Array<{
    order_id: string;
    source_kind: 'owned' | 'marketplace';
    branch_id: string;
    merchant_id: string;
    subtotal?: number;
  }>;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

export function combinedCheckoutSources(items: CartItem[]): CombinedCheckoutSource[] {
  if (!items.length) throw new Error('INVALID_MULTI_STORE_CART');

  const sources: CombinedCheckoutSource[] = [];
  const owned = items.filter(item => item.commerce_source !== 'marketplace');
  if (owned.length) {
    sources.push({ source_kind: 'owned', items: checkoutLines(owned) });
  }

  const partnerGroups = new Map<string, CartItem[]>();
  for (const item of items.filter(value => value.commerce_source === 'marketplace')) {
    if (!item.marketplace_branch_id) throw new Error('INVALID_CART');
    const group = partnerGroups.get(item.marketplace_branch_id) || [];
    group.push(item);
    partnerGroups.set(item.marketplace_branch_id, group);
  }

  if (partnerGroups.size > 2) throw new Error('MULTISTORE_LIMIT_EXCEEDED');
  for (const [branchId, group] of partnerGroups) {
    sources.push({
      source_kind: 'marketplace',
      branch_id: branchId,
      items: marketplaceCheckoutLines(group),
    });
  }

  if (sources.length < 2 || sources.length > 3) throw new Error('INVALID_MULTI_STORE_CART');
  return sources;
}

async function loadAddressPoint(addressId: string) {
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('latitude,longitude')
    .eq('id', addressId)
    .maybeSingle();
  if (error) throw error;
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('DELIVERY_ADDRESS_REQUIRED');
  }
  return { latitude, longitude };
}

export async function quoteCombinedOrder(sources: CombinedCheckoutSource[], addressId: string) {
  const point = await loadAddressPoint(addressId);
  const road = await getMultiStoreRoadQuote(sources, point.latitude, point.longitude);
  const { data, error } = await rpc('quote_combined_order_v2', {
    p_sources: sources,
    p_address_id: addressId,
    p_route_quote_id: road.route_quote_id,
  });
  if (error) throw error;
  return data as CombinedOrderQuote;
}

export async function placeCombinedOrder(order: PendingCombinedCheckout) {
  const freshQuote = await quoteCombinedOrder(order.sources, order.addressId);
  if (freshQuote.quote_token !== order.quoteToken) throw new Error('QUOTE_CHANGED');

  const { data, error } = await rpc('place_combined_order_group_v3', {
    p_group_id: order.groupId,
    p_sources: order.sources,
    p_address_id: order.addressId,
    p_payment_method: order.paymentMethod,
    p_notes: order.notes,
    p_quote_token: order.quoteToken,
    p_route_quote_id: freshQuote.route_quote_id,
    p_substitution_policy: order.substitutionPolicy,
  });
  if (error) throw error;
  return data as PlacedCombinedOrder;
}

const pendingKey = (userId: string) => `pending-combined-checkout:${userId}`;

export function readPendingCombinedCheckout(userId: string): PendingCombinedCheckout | null {
  const raw = localStorage.getItem(pendingKey(userId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingCombinedCheckout;
  if (!value.groupId || !value.addressId || !value.quoteToken || !Array.isArray(value.sources)) {
    throw new Error('PENDING_STORAGE_INVALID');
  }
  return { ...value, substitutionPolicy: normalizeSubstitutionPolicy(value.substitutionPolicy) };
}

export function savePendingCombinedCheckout(userId: string, value: PendingCombinedCheckout) {
  localStorage.setItem(pendingKey(userId), JSON.stringify(value));
}

export function removePendingCombinedCheckout(userId: string) {
  localStorage.removeItem(pendingKey(userId));
}

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'سجّل دخولك لإكمال الطلب.',
  PROFILE_REQUIRED: 'كمّل بيانات حسابك قبل تأكيد الطلب.',
  ADDRESS_REQUIRED: 'اختر عنوان توصيل محفوظًا في حسابك.',
  DELIVERY_ADDRESS_REQUIRED: 'حدد عنوان التوصيل على الخريطة.',
  DELIVERY_UNAVAILABLE: 'عنوانك خارج نطاق التوصيل المتاح.',
  DELIVERY_HUB_UNAVAILABLE: 'فرع ســــــوبـرمــــاركو المسؤول عن التوصيل غير متاح حاليًا.',
  MARKETPLACE_STORE_UNAVAILABLE: 'أحد المتاجر غير متاح للطلب حاليًا.',
  MULTISTORE_LIMIT_EXCEEDED: 'تقدر تجمع فرع ســــــوبـرمــــاركو مع محلين شركاء بحد أقصى.',
  MULTISTORE_DETOUR_TOO_HIGH: 'أحد المتاجر بعيد عن مسار التوصيل الحالي.',
  STORE_DETOUR_LIMIT_EXCEEDED: 'أحد المتاجر يتجاوز مسافة الدمج المسموحة.',
  STORE_NOT_MULTISTORE_ELIGIBLE: 'أحد المتاجر محتاج طلب منفصل حسب إعدادات التوصيل.',
  STORE_HUB_MISMATCH: 'المتاجر لازم تكون ضمن نفس فرع ســــــوبـرمــــاركو المسؤول عن التوصيل.',
  DUPLICATE_STORE: 'راجع المتاجر الموجودة في السلة.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات لم تعد متاحة.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا.',
  PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. أضفه للسلة من جديد.',
  BULK_UNAVAILABLE: 'خيار الجملة غير متاح لأحد المنتجات.',
  PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  MIN_ORDER_NOT_MET: 'قيمة الطلب أقل من الحد الأدنى لأحد المتاجر.',
  QUOTE_CHANGED: 'السعر أو المخزون أو مسار التوصيل اتغيّر. راجع الملخص وحاول تاني.',
  INVALID_MULTI_STORE_ROUTE: 'راجع المتاجر الموجودة في السلة قبل حساب الطريق.',
  ROAD_QUOTE_REQUIRED: 'تعذر تثبيت مسار التوصيل. حاول مرة تانية.',
  ROAD_QUOTE_EXPIRED: 'مسار التوصيل انتهت صلاحيته. راجع الملخص وحاول تاني.',
  ROAD_QUOTE_MISMATCH: 'العنوان أو المتاجر اتغيروا أثناء حساب الطريق.',
  ROUTE_QUOTE_STORE_FAILED: 'تعذر تثبيت مسار الطريق حاليًا.',
  MULTISTORE_ROUTE_FAILED: 'تعذر حساب مسار المتاجر المجمّع حاليًا.',
  ROUTE_DISTANCE_UNAVAILABLE: 'تعذر حساب طريق التوصيل حاليًا. حاول مرة تانية.',
  INVALID_QUANTITY: 'راجع كميات المنتجات.',
  INVALID_CART: 'راجع محتويات السلة.',
  INVALID_MULTI_STORE_CART: 'السلة المجمعة لازم تحتوي على مصدرين إلى ثلاثة بحد أقصى.',
  INVALID_ORDER: 'راجع بيانات الطلب.',
  REQUEST_CONFLICT: 'تعذر استكمال المحاولة السابقة. راجع طلباتك.',
  SAAS_APP_SUSPENDED: 'الخدمة متوقفة مؤقتًا بواسطة إدارة المنصة.',
  SAAS_CAPABILITY_DISABLED: 'الطلبات الأونلاين متوقفة مؤقتًا بواسطة إدارة المنصة.',
};

export function combinedCheckoutError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return messages[message] || 'تعذر تأكيد الطلب المجمّع حاليًا. حاول مرة تانية بنفس الطلب.';
}

export function combinedDefinitelyRejected(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return [
    'PROFILE_REQUIRED','ADDRESS_REQUIRED','DELIVERY_ADDRESS_REQUIRED','DELIVERY_UNAVAILABLE',
    'DELIVERY_HUB_UNAVAILABLE','MARKETPLACE_STORE_UNAVAILABLE','MULTISTORE_LIMIT_EXCEEDED',
    'MULTISTORE_DETOUR_TOO_HIGH','STORE_DETOUR_LIMIT_EXCEEDED','STORE_NOT_MULTISTORE_ELIGIBLE',
    'STORE_HUB_MISMATCH','DUPLICATE_STORE','INSUFFICIENT_STOCK','PRODUCT_UNAVAILABLE',
    'PRODUCT_UNIT_CHANGED','BULK_UNAVAILABLE','PRICE_UNAVAILABLE','MIN_ORDER_NOT_MET',
    'QUOTE_CHANGED','INVALID_MULTI_STORE_ROUTE','ROAD_QUOTE_REQUIRED','ROAD_QUOTE_EXPIRED',
    'ROAD_QUOTE_MISMATCH','ROUTE_QUOTE_STORE_FAILED','MULTISTORE_ROUTE_FAILED','ROUTE_DISTANCE_UNAVAILABLE',
    'INVALID_QUANTITY','INVALID_CART','INVALID_MULTI_STORE_CART','INVALID_ORDER',
    'SAAS_APP_SUSPENDED','SAAS_CAPABILITY_DISABLED',
  ].includes(message);
}
