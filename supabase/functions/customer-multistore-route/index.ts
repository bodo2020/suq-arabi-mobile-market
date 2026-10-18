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
  legDistancesKm: number[];
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
    if (!response.ok || payload?.status !== "OK" || !legs?.length || legs.length !== points.length - 1) return null;

    const distanceMeters = legs.reduce(
      (sum, leg) => sum + Number(leg.distance?.value || 0),
      0,
    );
    const durationSeconds = legs.reduce(
      (sum, leg) => sum + Number(leg.duration?.value || 0),
      0,
    );

    if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds) || distanceMeters < 0 || durationSeconds < 0) return null;
    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      legDistancesKm: legs.map(leg => Number(leg.distance?.value || 0) / 1000),
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

    if (!Array.isArray(route.legs) || route.legs.length !== points.length - 1) return null;
    const distanceMeters = Number(route.distance || 0);
    const durationSeconds = Number(route.duration || 0);
    if (!(distanceMeters > 0) || !(durationSeconds > 0)) return null;

    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      legDistancesKm: route.legs.map((leg: { distance: number }) => Number(leg.distance) / 1000),
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
      body?.latitude == null || body?.longitude == null
      || !Number.isFinite(latitude)
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

    if (!cacheError && cached?.route_quote_id && !cached.degraded) {
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

    const candidatePaths = orders.map(order => [...(hasOwned ? [hubPoint] : []), ...order, customerPoint]);
    const baselinePaths = candidatePaths.map(path => [path[0], customerPoint]);
    const allPaths = [...baselinePaths, ...candidatePaths];

    let routeResults = await routesForProvider("google", allPaths);
    let provider: RouteResult["provider"] = "google";
    if (!routeResults) {
      routeResults = await routesForProvider("osrm", allPaths);
      provider = "osrm";
    }
    if (!routeResults) {
      return json({ error: "ROUTE_DISTANCE_UNAVAILABLE" }, 503);
    }

    const candidateResults = routeResults.slice(candidatePaths.length);
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

    const baseline = routeResults[bestIndex];
    const bestOrder = orders[bestIndex] || [];
    const bestRoute = candidateResults[bestIndex];
    const detour = Math.max(0, bestRoute.distanceKm - baseline.distanceKm);
    const degraded = false;

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
    ].map((stop, index) => ({
      ...stop,
      distance_from_previous_km: index === 0 ? 0 : Number(bestRoute.legDistancesKm[index - 1].toFixed(3)),
    }));

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
          route_version: "store-origin-v2",
          route_anchor: hasOwned ? "hub" : "first_pickup",
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
