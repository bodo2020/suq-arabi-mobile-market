import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

function estimatedRoadMinutes(distanceKm: number) {
  return Math.min(75, Math.max(8, Math.ceil(distanceKm / 22 * 60 + 4)));
}

function decodeGooglePolyline(encoded: string) {
  const points: Array<[number, number]> = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([latitude / 1e5, longitude / 1e5]);
  }
  return points;
}

async function googleRoute(originLat: number, originLng: number, latitude: number, longitude: number) {
  if (!GOOGLE_KEY) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${latitude},${longitude}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("key", GOOGLE_KEY);

    const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    const leg = payload?.routes?.[0]?.legs?.[0];
    const polyline = payload?.routes?.[0]?.overview_polyline?.points;
    if (!response.ok || payload?.status !== "OK" || !leg) {
      console.warn("route-distance google unavailable", response.status, payload?.status ?? "NO_STATUS");
      return null;
    }

    return {
      distanceKm: Number(leg.distance?.value || 0) / 1000,
      durationMinutes: Math.max(1, Math.round(Number(leg.duration?.value || 0) / 60)),
      routePoints: polyline ? decodeGooglePolyline(String(polyline)) : [],
      provider: "google" as const,
    };
  } catch (error) {
    console.warn("route-distance google failed", error instanceof Error ? error.message : error);
    return null;
  }
}

async function osrmRoute(originLat: number, originLng: number, latitude: number, longitude: number) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${longitude},${latitude}?overview=full&geometries=geojson&alternatives=false&steps=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "ElmadawyMarket/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    const route = payload?.routes?.[0];
    if (!response.ok || payload?.code !== "Ok" || !route) {
      console.warn("route-distance osrm unavailable", response.status, payload?.code ?? "NO_CODE");
      return null;
    }

    const routePoints = Array.isArray(route?.geometry?.coordinates)
      ? route.geometry.coordinates.map((point: [number, number]) => [point[1], point[0]])
      : [];

    return {
      distanceKm: Number(route.distance || 0) / 1000,
      durationMinutes: Math.max(1, Math.round(Number(route.duration || 0) / 60)),
      routePoints,
      provider: "osrm" as const,
    };
  } catch (error) {
    console.warn("route-distance osrm failed", error instanceof Error ? error.message : error);
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return json({ error: "SERVER_NOT_CONFIGURED" }, 500);
    }

    const suppliedApiKey = request.headers.get("apikey") ?? "";
    const authHeader = request.headers.get("authorization") ?? "";
    const anonCaller = suppliedApiKey === ANON_KEY || authHeader === `Bearer ${ANON_KEY}`;

    let authenticatedUserId: string | null = null;
    if (!anonCaller && authHeader.startsWith("Bearer ")) {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient.auth.getUser();
      if (!error && data.user) authenticatedUserId = data.user.id;
    }

    if (!anonCaller && !authenticatedUserId) return json({ error: "UNAUTHORIZED" }, 401);

    let isStaff = false;
    if (authenticatedUserId) {
      const { data: staff } = await admin
        .from("users")
        .select("id,active")
        .eq("id", authenticatedUserId)
        .maybeSingle();
      isStaff = Boolean(staff && staff.active !== false);
    }

    const body = await request.json().catch(() => null) as {
      branch_id?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    } | null;

    const branchId = typeof body?.branch_id === "string" ? body.branch_id : "";
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (
      !branchId
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90
      || longitude < -180 || longitude > 180
    ) return json({ error: "INVALID_LOCATION" }, 400);

    const { data: branch, error } = await admin
      .from("branches")
      .select("id,name,latitude,longitude,delivery_radius_km,delivery_enabled,active")
      .eq("id", branchId)
      .maybeSingle();

    if (
      error || !branch || branch.active === false || branch.delivery_enabled === false
      || branch.latitude == null || branch.longitude == null
    ) return json({ error: "BRANCH_UNAVAILABLE" }, 404);

    const originLat = Number(branch.latitude);
    const originLng = Number(branch.longitude);
    const radius = Number(branch.delivery_radius_km || 0);
    const straight = haversineKm(originLat, originLng, latitude, longitude);

    if (radius > 0 && straight > radius) {
      return json({
        branch_id: branch.id,
        branch_name: branch.name,
        road_distance_km: null,
        straight_distance_km: Number(straight.toFixed(3)),
        duration_minutes: null,
        delivery_radius_km: radius,
        deliverable: false,
        distance_method: "straight_line_reject",
        route_points: isStaff ? [] : undefined,
        provider: null,
        degraded: false,
      });
    }

    const route = await googleRoute(originLat, originLng, latitude, longitude)
      ?? await osrmRoute(originLat, originLng, latitude, longitude);

    if (!route) {
      const fallbackMinutes = estimatedRoadMinutes(straight);
      return json({
        branch_id: branch.id,
        branch_name: branch.name,
        road_distance_km: Number(straight.toFixed(3)),
        straight_distance_km: Number(straight.toFixed(3)),
        duration_minutes: fallbackMinutes,
        delivery_radius_km: radius,
        deliverable: radius <= 0 ? true : straight <= radius,
        distance_method: "straight_line_fallback",
        route_points: isStaff ? [] : undefined,
        provider: null,
        degraded: true,
      });
    }

    return json({
      branch_id: branch.id,
      branch_name: branch.name,
      road_distance_km: Number(route.distanceKm.toFixed(3)),
      straight_distance_km: Number(straight.toFixed(3)),
      duration_minutes: route.durationMinutes,
      delivery_radius_km: radius,
      deliverable: radius <= 0 ? true : route.distanceKm <= radius,
      distance_method: "driving",
      route_points: isStaff ? route.routePoints : undefined,
      provider: route.provider,
      degraded: false,
    });
  } catch (error) {
    console.error("route-distance failed", error);
    return json({ error: "ROUTE_DISTANCE_FAILED" }, 500);
  }
});
