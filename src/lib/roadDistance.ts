import { supabase } from '@/integrations/supabase/client';

export type RoadDistanceResult = {
  branch_id: string;
  branch_name: string;
  road_distance_km: number | null;
  straight_distance_km: number;
  duration_minutes: number | null;
  delivery_radius_km: number;
  deliverable: boolean;
  distance_method: 'driving' | 'straight_line_reject';
};

export async function getRoadDistance(
  branchId: string,
  latitude: number,
  longitude: number,
): Promise<RoadDistanceResult> {
  const { data, error } = await supabase.functions.invoke('route-distance', {
    body: {
      branch_id: branchId,
      latitude,
      longitude,
    },
  });

  if (error) {
    console.error('route-distance edge function failed', error);
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  const result = data as RoadDistanceResult | { error?: string } | null;
  if (!result || 'error' in result || !('deliverable' in result)) {
    throw new Error((result as { error?: string } | null)?.error || 'ROUTE_DISTANCE_UNAVAILABLE');
  }

  if (result.distance_method === 'driving' && result.road_distance_km == null) {
    throw new Error('ROUTE_DISTANCE_UNAVAILABLE');
  }

  return result;
}
