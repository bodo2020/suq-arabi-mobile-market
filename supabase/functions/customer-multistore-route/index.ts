import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LEGACY_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

function parseKeyMap(raw: string | undefined) {
  if (!raw) return {} as Record<string, string>;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

const publishableKeys = parseKeyMap(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
const secretKeys = parseKeyMap(Deno.env.get("SUPABASE_SECRET_KEYS"));
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  ?? secretKeys.default
  ?? Object.values(secretKeys)[0]
  ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
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

type Point = {
  lat: number;
  lng: number;
  branch_id?: string;
  branch_name?: string;
  address?: string | null;
};

type RouteResult = {
  distanceKm: number;
  durationMinutes: number;
  provider: "google" | "osrm" | "straight_line_fallback";
  degraded: boolean;
};

type BranchRow = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  hub_branch_id?: string | null;
  active: boolean | null;
  delivery_enabled?: boolean | null;
};

function publicApiKeys() {
  return new Set(
    [LEGACY_ANON_KEY, ...Object.values(publishableKeys)].filter(Boolean),
  );
}

async function callerAllowed(request: Request) {
  const keys = publicApiKeys();
  const apiKey = request.headers.get("apikey") ?? "";
  if (keys.has(apiKey)) return true;

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;
  if (keys.has(token)) return true;

  const { data, error } = await admin.auth.getUser(token);
  return !error && !!data.user;
}

function haversineKm(a: Point, b: Point) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(x));
}

function straightRoute(points: Point[]): RouteResult {
  let distanceKm = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceKm += haversineKm(points[index - 1], points[index]);
  }
  return {
    distanceKm,
    durationMinutes: Math.max(1, Math.ceil(distanceKm / 25 * 60)),
    provider: "straight_line_fallback",
    degraded: true,
  };
}

async function googleRoute(points: Point[]): Promise<RouteResult | null> {
  if (!GOOGLE_KEY || points.length < 2) return null;
  try {
    const origin = points[0];
    const destination = points[points.length - 1];
    const waypoints = points.slice(1, -1);

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
    url.searchParams.set("destination", `${destination.lat},${destination.lng}`);
    if (waypoints.length) {
      url.searchParams.set(
        "waypoints",
        waypoints.map(point => `${point.lat},${point.lng}`).join("|"),
      );
    }
    url.searchParams.set("mode", "driving");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("key", GOOGLE_KEY);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    const legs = payload?.routes?.[0]?.legs as Array<Record<string, any>> | undefined;
    if (!response.ok || payload?.status !== "OK" || !legs?.length) return null;

    const distanceMeters = legs.reduce(
      (sum, leg) => sum + Number(leg.distance?.value || 0),
      0,
    );
    const durationSeconds = legs.reduce(
      (sum, leg) => sum + Number(leg.duration?.value || 0),
      0,
    );

    if (!(distanceMeters > 0) || !(durationSeconds > 0)) return null;
    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      provider: "google",
      degraded: false,
    };
  } catch (error) {
    console.warn(
      "customer-multistore-route google failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function osrmRoute(points: Point[]): Promise<RouteResult | null> {
  if (points.length < 2) return null;
  try {
    const coordinates = points.map(point => `${point.lng},${point.lat}`).join(";");
    const url =
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`;
    const response = await fetch(url, {
      headers: { "User-Agent": "ElmadawyMarket/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    const route = payload?.routes?.[0];
    if (!response.ok || payload?.code !== "Ok" || !route) return null;

    const distanceMeters = Number(route.distance || 0);
    const durationSeconds = Number(route.duration || 0);
    if (!(distanceMeters > 0) || !(durationSeconds > 0)) return null;

    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      provider: "osrm",
      degraded: false,
    };
  } catch (error) {
    console.warn(
      "customer-multistore-route osrm failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function routesForProvider(
  provider: "google" | "osrm",
  paths: Point[][],
) {
  const fn = provider === "google" ? googleRoute : osrmRoute;
  const values = await Promise.all(paths.map(path => fn(path)));
  if (values.some(value => !value)) return null;
  return values as RouteResult[];
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.filter(item => typeof item === "string" && item.length > 0))];
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: "SERVER_NOT_CONFIGURED" }, 500);
    }
    if (!(await callerAllowed(request))) return json({ error: "UNAUTHORIZED" }, 401);

    const body = await request.json().catch(() => null) as {
      partner_branch_ids?: unknown;
      has_owned?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    } | null;

    const partnerIds = uniqueStrings(body?.partner_branch_ids).sort();
    const hasOwned = body?.has_owned === true;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    const storeCount = (hasOwned ? 1 : 0) + partnerIds.length;

    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90
      || longitude < -180 || longitude > 180
      || partnerIds.length > 2
      || storeCount < 2 || storeCount > 3
      || (!hasOwned && partnerIds.length < 2)
    ) return json({ error: "INVALID_MULTI_STORE_ROUTE" }, 400);

    const { data: hubRows, error: hubError } = await admin.rpc("find_delivery_branch", {
      p_latitude: latitude,
      p_longitude: longitude,
    });
    if (hubError) {
      console.error("customer-multistore-route hub resolve failed", hubError.message);
      return json({ error: "DELIVERY_UNAVAILABLE" }, 400);
    }

    const resolved = Array.isArray(hubRows) ? hubRows[0] : hubRows;
    const hubId = resolved?.branch_id as string | undefined;
    if (!hubId) return json({ error: "DELIVERY_UNAVAILABLE" }, 400);

    const { data: hubData, error: hubDataError } = await admin
      .from("branches")
      .select("id,name,address,latitude,longitude,active,delivery_enabled")
      .eq("id", hubId)
      .maybeSingle();

    const hub = hubData as BranchRow | null;
    if (
      hubDataError || !hub || hub.active === false || hub.delivery_enabled === false
      || hub.latitude == null || hub.longitude == null
    ) return json({ error: "DELIVERY_HUB_UNAVAILABLE" }, 400);

    const partnerBranches: BranchRow[] = [];
    if (partnerIds.length) {
      const { data, error } = await admin
        .from("branches")
        .select("id,name,address,latitude,longitude,hub_branch_id,active")
        .in("id", partnerIds);

      if (error) {
        console.error("customer-multistore-route partner lookup failed", error.message);
        return json({ error: "STORE_HUB_MISMATCH" }, 400);
      }

      const rows = (data || []) as BranchRow[];
      if (
        rows.length !== partnerIds.length
        || rows.some(branch =>
          branch.active === false
          || branch.hub_branch_id !== hub.id
          || branch.latitude == null
          || branch.longitude == null
        )
      ) return json({ error: "STORE_HUB_MISMATCH" }, 400);

      const byId = new Map(rows.map(branch => [branch.id, branch]));
      for (const id of partnerIds) {
        const branch = byId.get(id);
        if (!branch) return json({ error: "STORE_HUB_MISMATCH" }, 400);
        partnerBranches.push(branch);
      }
    }

    const { data: cached, error: cacheError } = await admin.rpc(
      "get_cached_delivery_road_quote_v1",
      {
        p_hub_branch_id: hub.id,
        p_partner_branch_ids: partnerIds,
        p_has_owned: hasOwned,
        p_customer_latitude: latitude,
        p_customer_longitude: longitude,
      },
    );

    if (!cacheError && cached?.route_quote_id) {
      return json({
        ...cached,
        hub_branch_name: hub.name,
        distance_source: "verified_road_route",
      });
    }

    const hubPoint: Point = {
      lat: Number(hub.latitude),
      lng: Number(hub.longitude),
      branch_id: hub.id,
      branch_name: hub.name,
      address: hub.address,
    };
    const customerPoint: Point = { lat: latitude, lng: longitude };
    const partnerPoints = partnerBranches.map(branch => ({
      lat: Number(branch.latitude),
      lng: Number(branch.longitude),
      branch_id: branch.id,
      branch_name: branch.name,
      address: branch.address,
    }));

    const orders: Point[][] = partnerPoints.length === 2
      ? [partnerPoints, [partnerPoints[1], partnerPoints[0]]]
      : [partnerPoints];

    const baselinePath = [hubPoint, customerPoint];
    const candidatePaths = orders.map(order => [hubPoint, ...order, customerPoint]);
    const allPaths = [baselinePath, ...candidatePaths];

    let routeResults = await routesForProvider("google", allPaths);
    let provider: RouteResult["provider"] = "google";
    if (!routeResults) {
      routeResults = await routesForProvider("osrm", allPaths);
      provider = "osrm";
    }
    if (!routeResults) {
      routeResults = allPaths.map(straightRoute);
      provider = "straight_line_fallback";
    }

    const baseline = routeResults[0];
    const candidateResults = routeResults.slice(1);
    let bestIndex = 0;
    for (let index = 1; index < candidateResults.length; index += 1) {
      const current = candidateResults[index];
      const best = candidateResults[bestIndex];
      if (
        current.distanceKm < best.distanceKm
        || (
          Math.abs(current.distanceKm - best.distanceKm) < 0.001
          && current.durationMinutes < best.durationMinutes
        )
      ) bestIndex = index;
    }

    const bestOrder = orders[bestIndex] || [];
    const bestRoute = candidateResults[bestIndex];
    const detour = Math.max(0, bestRoute.distanceKm - baseline.distanceKm);
    const degraded = provider === "straight_line_fallback";

    const stops = [
      ...(hasOwned ? [{
        type: "pickup",
        source_kind: "owned",
        branch_id: hub.id,
        branch_name: hub.name,
        address: hub.address,
        latitude: Number(hub.latitude),
        longitude: Number(hub.longitude),
      }] : []),
      ...bestOrder.map(point => ({
        type: "pickup",
        source_kind: "marketplace",
        branch_id: point.branch_id,
        branch_name: point.branch_name,
        address: point.address,
        latitude: point.lat,
        longitude: point.lng,
      })),
      {
        type: "customer",
        latitude,
        longitude,
      },
    ];

    const orderedPartnerIds = bestOrder
      .map(point => point.branch_id)
      .filter((value): value is string => !!value);

    const { data: stored, error: storeError } = await admin.rpc(
      "store_delivery_road_quote_v1",
      {
        p_hub_branch_id: hub.id,
        p_partner_branch_ids: partnerIds,
        p_ordered_partner_branch_ids: orderedPartnerIds,
        p_has_owned: hasOwned,
        p_customer_latitude: latitude,
        p_customer_longitude: longitude,
        p_baseline_distance_km: Number(baseline.distanceKm.toFixed(3)),
        p_baseline_duration_minutes: baseline.durationMinutes,
        p_route_distance_km: Number(bestRoute.distanceKm.toFixed(3)),
        p_detour_km: Number(detour.toFixed(3)),
        p_route_duration_minutes: bestRoute.durationMinutes,
        p_provider: provider,
        p_degraded: degraded,
        p_stops: stops,
        p_metadata: {
          route_anchor: "hub",
          route_anchor_hub_id: hub.id,
          candidate_count: candidatePaths.length,
          generated_by: "customer-multistore-route",
        },
        p_ttl_seconds: 600,
      },
    );

    if (storeError || !stored?.route_quote_id) {
      console.error(
        "customer-multistore-route store quote failed",
        storeError?.message ?? "NO_ROUTE_QUOTE_ID",
      );
      return json({ error: "ROUTE_QUOTE_STORE_FAILED" }, 500);
    }

    return json({
      route_quote_id: stored.route_quote_id,
      expires_at: stored.expires_at,
      hub_branch_id: hub.id,
      hub_branch_name: hub.name,
      partner_branch_ids: partnerIds,
      ordered_partner_branch_ids: orderedPartnerIds,
      has_owned: hasOwned,
      baseline_distance_km: Number(baseline.distanceKm.toFixed(3)),
      baseline_duration_minutes: baseline.durationMinutes,
      route_distance_km: Number(bestRoute.distanceKm.toFixed(3)),
      detour_km: Number(detour.toFixed(3)),
      route_duration_minutes: bestRoute.durationMinutes,
      provider,
      degraded,
      distance_source: "verified_road_route",
      stops,
      cached: false,
    });
  } catch (error) {
    console.error("customer-multistore-route failed", error);
    return json({ error: "MULTISTORE_ROUTE_FAILED" }, 500);
  }
});
