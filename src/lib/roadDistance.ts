import { supabase } from '@/integrations/supabase/client';

export type RoadDistanceResult = {
  branch_id: string;
  branch_name: string;
  road_distance_km: number | null;
  straight_distance_km: number;
  duration_minutes: number | null;
  delivery_radius_km: number;
  deliverable: boolean;
  distance_method: 'driving' | 'straight_line_reject' | 'straight_line_fallback';
  provider?: 'google' | 'osrm' | null;
  degraded?: boolean;
};

export async function getRoadDistance(branchId: string, latitude: number, longitude: number): Promise<RoadDistanceResult> {
  const response = await supabase.functions.invoke('customer-route-distance', {
    body: { branch_id: branchId, latitude, longitude },
  });

  if (response.error) {
    console.error('customer-route-distance invocation failed', response.error);
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  const result = response.data as RoadDistanceResult | { error?: string } | null;
  if (!result || 'error' in result || !('deliverable' in result)) {
    console.error('customer-route-distance returned invalid payload', result);
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  return result;
}
