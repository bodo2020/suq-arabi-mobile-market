import { supabase } from '@/lib/supabase';

export type MultiStoreRouteSource = {
  source_kind: 'owned' | 'marketplace';
  branch_id?: string;
};

export type MultiStoreRoadQuote = {
  route_quote_id: string;
  expires_at: string;
  hub_branch_id: string;
  hub_branch_name?: string;
  partner_branch_ids: string[];
  ordered_partner_branch_ids: string[];
  has_owned: boolean;
  baseline_distance_km: number;
  route_distance_km: number;
  detour_km: number;
  route_duration_minutes: number;
  provider: 'google' | 'osrm' | 'straight_line_fallback';
  degraded: boolean;
  distance_source: 'verified_road_route';
  cached?: boolean;
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

const knownErrors = new Set([
  'INVALID_MULTI_STORE_ROUTE',
  'DELIVERY_UNAVAILABLE',
  'DELIVERY_HUB_UNAVAILABLE',
  'STORE_HUB_MISMATCH',
  'ROUTE_QUOTE_STORE_FAILED',
  'MULTISTORE_ROUTE_FAILED',
]);

async function functionErrorCode(error: unknown, data: unknown) {
  const direct = (data as { error?: unknown } | null)?.error;
  if (typeof direct === 'string' && direct) return direct;

  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const payload = await context.clone().json() as { error?: unknown };
      if (typeof payload?.error === 'string' && payload.error) return payload.error;
    } catch {
      // Fall through to a stable app error below.
    }
  }

  const message = (error as { message?: string } | null)?.message || '';
  return knownErrors.has(message) ? message : 'ROUTE_DISTANCE_UNAVAILABLE';
}

export async function getMultiStoreRoadQuote(
  sources: MultiStoreRouteSource[],
  latitude: number,
  longitude: number,
): Promise<MultiStoreRoadQuote> {
  const hasOwned = sources.some(source => source.source_kind === 'owned');
  const partnerBranchIds = [...new Set(
    sources
      .filter(source => source.source_kind === 'marketplace')
      .map(source => source.branch_id)
      .filter((value): value is string => Boolean(value)),
  )].sort();

  const storesCount = (hasOwned ? 1 : 0) + partnerBranchIds.length;
  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || storesCount < 2
    || storesCount > 3
    || partnerBranchIds.length > 2
    || (!hasOwned && partnerBranchIds.length < 2)
  ) {
    throw new Error('INVALID_MULTI_STORE_ROUTE');
  }

  const { data, error } = await supabase.functions.invoke('customer-multistore-route', {
    body: {
      partner_branch_ids: partnerBranchIds,
      has_owned: hasOwned,
      latitude,
      longitude,
    },
  });

  if (error) throw new Error(await functionErrorCode(error, data));
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  const quote = data as MultiStoreRoadQuote | null;
  if (
    !quote?.route_quote_id
    || quote.distance_source !== 'verified_road_route'
    || !Number.isFinite(Number(quote.route_distance_km))
    || !Number.isFinite(Number(quote.route_duration_minutes))
  ) {
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  return quote;
}
