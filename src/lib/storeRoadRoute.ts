import { supabase } from '@/integrations/supabase/client';

export type StoreRoadSource = 'owned' | 'marketplace';

export type StoreRoadQuote = {
  route_quote_id: string;
  expires_at: string;
  hub_branch_id: string;
  branch_id: string;
  branch_name: string;
  source_kind: StoreRoadSource;
  road_distance_km: number;
  straight_distance_km: number;
  road_duration_minutes: number;
  provider: 'google' | 'osrm' | 'straight_line_fallback';
  degraded: boolean;
  distance_method: 'driving' | 'straight_line_fallback';
  distance_source: 'verified_road_route';
  cached?: boolean;
};

async function edgeErrorCode(error: unknown, data: unknown) {
  const direct = (data as { error?: unknown } | null)?.error;
  if (typeof direct === 'string' && direct) return direct;

  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.clone === 'function') {
    try {
      const payload = await context.clone().json() as { error?: unknown };
      if (typeof payload?.error === 'string' && payload.error) return payload.error;
    } catch {
      // Keep a stable app-level error below.
    }
  }
  return 'ROUTE_DISTANCE_UNAVAILABLE';
}

export async function getStoreRoadQuote(
  sourceKind: StoreRoadSource,
  branchId: string,
  latitude: number,
  longitude: number,
): Promise<StoreRoadQuote> {
  if (!branchId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('INVALID_LOCATION');
  }

  const { data, error } = await supabase.functions.invoke('customer-store-route-distance', {
    body: {
      source_kind: sourceKind,
      branch_id: branchId,
      latitude,
      longitude,
    },
  });

  if (error) throw new Error(await edgeErrorCode(error, data));
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  const quote = data as StoreRoadQuote | null;
  if (
    !quote?.route_quote_id
    || quote.distance_source !== 'verified_road_route'
    || !Number.isFinite(Number(quote.road_distance_km))
    || !Number.isFinite(Number(quote.road_duration_minutes))
  ) {
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  return quote;
}
