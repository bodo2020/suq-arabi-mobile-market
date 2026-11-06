import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/contexts/cartTypes';
import { cartSourceIdentities, isSingleMarketplaceCart } from '@/contexts/cartTypes';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';
import { checkoutLines } from '@/lib/checkout';
import { marketplaceCheckoutLines, type MarketplaceQuote } from '@/lib/marketplaceCheckout';
import { getStoreRoadQuote } from '@/lib/storeRoadRoute';
import { getMultiStoreRoadQuote } from '@/lib/multistoreRoadRoute';

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

export type DeliveryCampaign = {
  id: string;
  name: string;
  type: 'free_delivery' | 'delivery_credit' | 'free_extra_pickup';
  target_kind?: 'hub' | 'merchant' | 'branch';
  target_id?: string;
  discount: number;
  merchant_contribution?: number;
  elmadawy_contribution?: number;
  starts_at?: string;
  ends_at?: string;
};

export type CombinedDeliveryQuote = {
  hub_branch_id: string;
  hub_branch_name: string;
  pickup_count: number;
  partner_store_count: number;
  max_pickups: number;
  max_partner_stores: number;
  route_distance_km: number;
  baseline_distance_km: number;
  detour_km: number;
  estimated_route_minutes: number;
  delivery_cost: number;
  customer_delivery_fee: number;
  merchant_delivery_subsidy: number;
  elmadawy_delivery_subsidy: number;
  extra_pickup_fee: number;
  distance_fee: number;
  free_delivery: boolean;
  distance_source?: 'estimated_haversine' | 'verified_road_route';
  route_quote_id?: string;
  route_quote_expires_at?: string;
  route_provider?: 'google' | 'osrm' | 'straight_line_fallback';
  route_degraded?: boolean;
  delivery_campaign?: DeliveryCampaign | null;
  stops: Array<{
    type: 'pickup' | 'customer';
    source_kind?: 'owned' | 'marketplace';
    branch_id?: string;
    branch_name?: string;
    address?: string | null;
    latitude: number;
    longitude: number;
  }>;
};

export type CartQuote = {
  source_kind?: 'owned' | 'marketplace' | 'combined';
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
  stores_count?: number;
  partner_stores_count?: number;
  delivery_cost?: number;
  merchant_delivery_subsidy?: number;
  elmadawy_delivery_subsidy?: number;
  delivery_campaign?: DeliveryCampaign | null;
  delivery?: CombinedDeliveryQuote;
};

type CombinedSourceQuote = {
  source_kind: 'owned' | 'marketplace';
  merchant_id?: string;
  merchant_name?: string;
  branch_id?: string;
  branch_name?: string;
  items: CartQuoteLine[];
  subtotal: number;
  minimum_order_met?: boolean;
};

type CombinedQuoteRpc = {
  source_kind: 'combined';
  hub_branch_id: string;
  hub_branch_name: string;
  stores_count: number;
  partner_stores_count: number;
  source_quotes: CombinedSourceQuote[];
  subtotal: number;
  shipping_cost: number;
  delivery_cost: number;
  merchant_delivery_subsidy: number;
  elmadawy_delivery_subsidy: number;
  total: number;
  delivery: CombinedDeliveryQuote;
  quote_token: string;
  route_quote_id?: string;
  road_verified?: boolean;
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

function combinedSources(items: CartItem[]) {
  const sources: Array<Record<string, unknown>> = [];
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

  for (const [branchId, group] of partnerGroups) {
    sources.push({
      source_kind: 'marketplace',
      branch_id: branchId,
      items: marketplaceCheckoutLines(group),
    });
  }
  return sources;
}

export async function quoteCart(items: CartItem[]): Promise<CartQuote> {
  const point = await loadSelectedDeliveryPoint();
  if (!point) throw new Error('DELIVERY_ADDRESS_REQUIRED');

  const sourceCount = cartSourceIdentities(items).length;
  if (sourceCount > 1) {
    const sources = combinedSources(items);
    const road = await getMultiStoreRoadQuote(
      sources as Array<{ source_kind: 'owned' | 'marketplace'; branch_id?: string }>,
      point.latitude,
      point.longitude,
    );
    const { data, error } = await rpc('quote_combined_cart_v2', {
      p_sources: sources,
      p_latitude: point.latitude,
      p_longitude: point.longitude,
      p_route_quote_id: road.route_quote_id,
    });
    if (error) throw error;
    const quote = data as CombinedQuoteRpc;
    const lines = (quote.source_quotes || []).flatMap(source =>
      (source.items || []).map(line => ({
        ...line,
        is_bulk: Boolean(line.is_bulk),
        bulk_quantity: line.bulk_quantity ?? null,
      })),
    );
    return {
      source_kind: 'combined',
      items: lines,
      subtotal: Number(quote.subtotal || 0),
      shipping_cost: Number(quote.shipping_cost || 0),
      total: Number(quote.total || 0),
      free_delivery: Boolean(quote.delivery?.free_delivery),
      delivery_branch_id: quote.hub_branch_id,
      inventory_branch_id: quote.hub_branch_id,
      pricing_branch_id: quote.hub_branch_id,
      branch_name: quote.hub_branch_name,
      distance_km: Number(quote.delivery?.route_distance_km || 0),
      road_distance_km: Number(quote.delivery?.route_distance_km || 0),
      road_duration_minutes: Number(quote.delivery?.estimated_route_minutes || 0) || null,
      estimated_delivery_minutes: Number(quote.delivery?.estimated_route_minutes || 0) || null,
      min_order_amount: 0,
      minimum_order_met: true,
      stores_count: quote.stores_count,
      partner_stores_count: quote.partner_stores_count,
      delivery_cost: Number(quote.delivery_cost || 0),
      merchant_delivery_subsidy: Number(quote.merchant_delivery_subsidy || 0),
      elmadawy_delivery_subsidy: Number(quote.elmadawy_delivery_subsidy || 0),
      delivery_campaign: quote.delivery?.delivery_campaign || null,
      delivery: quote.delivery,
    };
  }

  if (isSingleMarketplaceCart(items)) {
    const branchId = items[0]?.marketplace_branch_id;
    if (!branchId) throw new Error('INVALID_CART');

    const road = await getStoreRoadQuote(
      'marketplace',
      branchId,
      point.latitude,
      point.longitude,
    );
    const { data, error } = await rpc('quote_marketplace_cart_v2', {
      p_branch_id: branchId,
      p_items: marketplaceCheckoutLines(items),
      p_latitude: point.latitude,
      p_longitude: point.longitude,
      p_route_quote_id: road.route_quote_id,
    });
    if (error) throw error;
    const quote = data as MarketplaceQuote & { delivery_campaign?: DeliveryCampaign | null };
    return {
      ...quote,
      delivery_campaign: quote.delivery_campaign || null,
      items: quote.items.map(line => ({ ...line, is_bulk: false, bulk_quantity: null })),
      delivery_branch_id: quote.branch_id,
      inventory_branch_id: quote.branch_id,
      pricing_branch_id: quote.branch_id,
      branch_name: quote.branch_name,
      distance_km: Number(quote.road_distance_km || road.road_distance_km),
      road_distance_km: Number(quote.road_distance_km || road.road_distance_km),
      road_duration_minutes: Number(quote.road_duration_minutes || road.road_duration_minutes) || null,
      estimated_delivery_minutes: Number(quote.road_duration_minutes || road.road_duration_minutes) || null,
    };
  }

  const initial = await rpc('quote_customer_cart_v3', {
    p_items: checkoutLines(items),
    p_latitude: point.latitude,
    p_longitude: point.longitude,
  });
  if (initial.error) throw initial.error;

  const initialQuote = initial.data as Omit<CartQuote, 'road_distance_km' | 'road_duration_minutes'>;
  if (!initialQuote?.delivery_branch_id) throw new Error('DELIVERY_UNAVAILABLE');

  const road = await getStoreRoadQuote(
    'owned',
    initialQuote.delivery_branch_id,
    point.latitude,
    point.longitude,
  );

  const { data, error } = await rpc('quote_customer_cart_v4', {
    p_items: checkoutLines(items),
    p_latitude: point.latitude,
    p_longitude: point.longitude,
    p_route_quote_id: road.route_quote_id,
  });
  if (error) throw error;

  const quote = data as CartQuote;
  return {
    ...quote,
    source_kind: 'owned',
    distance_km: Number(quote.road_distance_km || road.road_distance_km),
    road_distance_km: Number(quote.road_distance_km || road.road_distance_km),
    road_duration_minutes: Number(quote.road_duration_minutes || road.road_duration_minutes) || null,
    estimated_delivery_minutes: Number(quote.road_duration_minutes || road.road_duration_minutes) || null,
  };
}

const messages: Record<string, string> = {
  DELIVERY_ADDRESS_REQUIRED: 'حدد عنوان التوصيل عشان نحسب الشنطة والفرع.',
  DELIVERY_UNAVAILABLE: 'عنوانك خارج نطاق التوصيل المتاح.',
  DELIVERY_HUB_UNAVAILABLE: 'فرع المعداوي المسؤول عن التوصيل غير متاح حاليًا.',
  MARKETPLACE_STORE_UNAVAILABLE: 'المتجر غير متاح للطلب حاليًا.',
  MULTISTORE_LIMIT_EXCEEDED: 'تقدر تجمع فرع المعداوي مع محلين شركاء بحد أقصى.',
  MULTISTORE_DETOUR_TOO_HIGH: 'المتجر الإضافي بعيد عن مسار التوصيل الحالي.',
  STORE_DETOUR_LIMIT_EXCEEDED: 'المتجر الإضافي يتجاوز حد المسافة المسموح للدمج.',
  STORE_NOT_MULTISTORE_ELIGIBLE: 'أحد المتاجر محتاج طلب منفصل حسب إعدادات التوصيل.',
  STORE_HUB_MISMATCH: 'المتاجر المجمعة لازم تكون ضمن نفس فرع المعداوي المسؤول عن التوصيل.',
  DUPLICATE_STORE: 'راجع المتاجر الموجودة في الشنطة.',
  MIN_ORDER_NOT_MET: 'قيمة الشنطة أقل من الحد الأدنى لأحد المتاجر.',
  INVALID_MULTI_STORE_ROUTE: 'راجع المتاجر الموجودة في الشنطة قبل حساب الطريق.',
  ROAD_QUOTE_REQUIRED: 'تعذر تثبيت مسار التوصيل. حاول مرة تانية.',
  ROAD_QUOTE_EXPIRED: 'مسار التوصيل انتهت صلاحيته وتم تحديثه. حاول مرة تانية.',
  ROAD_QUOTE_MISMATCH: 'العنوان أو المتاجر اتغيروا أثناء حساب الطريق. راجع الشنطة.',
  ROUTE_QUOTE_STORE_FAILED: 'تعذر تثبيت مسار التوصيل حاليًا. حاول مرة تانية.',
  STORE_ROUTE_FAILED: 'تعذر حساب طريق التوصيل حاليًا. حاول مرة تانية.',
  INVALID_LOCATION: 'عنوان التوصيل غير صالح. راجع العنوان على الخريطة.',
  MULTISTORE_ROUTE_FAILED: 'تعذر حساب مسار المتاجر المجمّع حاليًا.',
  ROUTE_DISTANCE_UNAVAILABLE: 'تعذر حساب مسافة الطريق حاليًا. حاول مرة تانية بعد لحظات.',
  ROUTE_PROVIDER_UNAVAILABLE: 'تعذر الاتصال بخدمة الطرق حاليًا. حاول مرة تانية بعد لحظات.',
  INSUFFICIENT_STOCK: 'كمية أحد المنتجات أكبر من المتاح حاليًا.',
  PRODUCT_UNAVAILABLE: 'أحد المنتجات لم يعد متاحًا.',
  PRODUCT_UNIT_CHANGED: 'طريقة بيع أحد المنتجات اتغيّرت. احذفه من الشنطة وأضفه من جديد.',
  BULK_UNAVAILABLE: 'خيار الجملة غير متاح لهذا الطلب.',
  PRICE_UNAVAILABLE: 'سعر أحد المنتجات غير متاح حاليًا.',
  INVALID_QUANTITY: 'راجع كميات المنتجات في الشنطة.',
  INVALID_MULTI_STORE_CART: 'راجع المحلات والمنتجات في الشنطة.',
  INVALID_CART: 'راجع محتويات الشنطة وحاول تاني.',
  SAAS_APP_SUSPENDED: 'الخدمة متوقفة مؤقتًا بواسطة إدارة المنصة.',
  SAAS_CAPABILITY_DISABLED: 'الطلبات الأونلاين متوقفة مؤقتًا بواسطة إدارة المنصة.',
};
export function cartQuoteError(error: unknown) {
  const message = (error as { message?: string })?.message || '';
  return messages[message] || 'تعذر تحديث السعر والمخزون والتوصيل. حاول مرة تانية.';
}
