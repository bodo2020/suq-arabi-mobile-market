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
  merchant_id?: string | null;
  active: boolean | null;
  delivery_enabled?: boolean | null;
  marketplace_customer_enabled?: boolean | null;
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

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const radius = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function googleRoute(
  originLat: number,
  originLng: number,
  latitude: number,
  longitude: number,
): Promise<RouteResult | null> {
  if (!GOOGLE_KEY) return null;
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", `${originLat},${originLng}`);
    url.searchParams.set("destination", `${latitude},${longitude}`);
    url.searchParams.set("mode", "driving");
    url.searchParams.set("alternatives", "false");
    url.searchParams.set("key", GOOGLE_KEY);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => null) as Record<string, any> | null;
    const leg = payload?.routes?.[0]?.legs?.[0];
    if (!response.ok || payload?.status !== "OK" || !leg) return null;

    const distanceMeters = Number(leg.distance?.value || 0);
    const durationSeconds = Number(leg.duration?.value || 0);
    if (!(distanceMeters > 0) || !(durationSeconds > 0)) return null;

    return {
      distanceKm: distanceMeters / 1000,
      durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
      provider: "google",
      degraded: false,
    };
  } catch (error) {
    console.warn(
      "customer-store-route-distance google failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

async function osrmRoute(
  originLat: number,
  originLng: number,
  latitude: number,
  longitude: number,
): Promise<RouteResult | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${longitude},${latitude}?overview=false&alternatives=false&steps=false`;
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
      "customer-store-route-distance osrm failed",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
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
      source_kind?: unknown;
      branch_id?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    } | null;

    const sourceKind = body?.source_kind === "marketplace" ? "marketplace" : "owned";
    const requestedBranchId = typeof body?.branch_id === "string" ? body.branch_id : "";
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (
      !requestedBranchId
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90
      || longitude < -180 || longitude > 180
    ) return json({ error: "INVALID_LOCATION" }, 400);

    const { data: hubRows, error: hubError } = await admin.rpc("find_delivery_branch", {
      p_latitude: latitude,
      p_longitude: longitude,
    });
    if (hubError) {
      console.error("customer-store-route hub resolve failed", hubError.message);
      return json({ error: "DELIVERY_UNAVAILABLE" }, 400);
    }
    const resolved = Array.isArray(hubRows) ? hubRows[0] : hubRows;
    const hubId = resolved?.branch_id as string | undefined;
    if (!hubId) return json({ error: "DELIVERY_UNAVAILABLE" }, 400);

    let origin: BranchRow | null = null;

    if (sourceKind === "owned") {
      if (requestedBranchId !== hubId) return json({ error: "STORE_HUB_MISMATCH" }, 400);

      const { data, error } = await admin
        .from("branches")
        .select("id,name,address,latitude,longitude,active,delivery_enabled")
        .eq("id", hubId)
        .maybeSingle();

      origin = data as BranchRow | null;
      if (
        error || !origin || origin.active === false || origin.delivery_enabled === false
        || origin.latitude == null || origin.longitude == null
      ) return json({ error: "DELIVERY_HUB_UNAVAILABLE" }, 400);
    } else {
      const { data, error } = await admin
        .from("branches")
        .select("id,name,address,latitude,longitude,hub_branch_id,merchant_id,active,marketplace_customer_enabled")
        .eq("id", requestedBranchId)
        .maybeSingle();

      origin = data as BranchRow | null;
      if (
        error || !origin || origin.active === false || origin.marketplace_customer_enabled !== true
        || origin.hub_branch_id !== hubId
        || origin.latitude == null || origin.longitude == null
        || !origin.merchant_id
      ) return json({ error: "MARKETPLACE_STORE_UNAVAILABLE" }, 400);

      const { data: merchant, error: merchantError } = await admin
        .from("merchants")
        .select("id,merchant_type,status,customer_published_at")
        .eq("id", origin.merchant_id)
        .maybeSingle();

      if (
        merchantError || !merchant
        || !["partner", "franchise"].includes(String(merchant.merchant_type))
        || merchant.status !== "active"
        || !merchant.customer_published_at
      ) return json({ error: "MARKETPLACE_STORE_UNAVAILABLE" }, 400);
    }

    const { data: cached, error: cacheError } = await admin.rpc(
      "get_cached_single_delivery_road_quote_v1",
      {
        p_source_kind: sourceKind,
        p_hub_branch_id: hubId,
        p_origin_branch_id: origin.id,
        p_customer_latitude: latitude,
        p_customer_longitude: longitude,
      },
    );

    if (!cacheError && cached?.route_quote_id) {
      return json({
        ...cached,
        branch_id: origin.id,
        branch_name: origin.name,
        distance_method: cached.degraded ? "straight_line_fallback" : "driving",
        distance_source: "verified_road_route",
      });
    }

    const originLat = Number(origin.latitude);
    const originLng = Number(origin.longitude);
    const straight = haversineKm(originLat, originLng, latitude, longitude);

    const route =
      await googleRoute(originLat, originLng, latitude, longitude)
      ?? await osrmRoute(originLat, originLng, latitude, longitude)
      ?? {
        distanceKm: straight,
        durationMinutes: Math.max(1, Math.ceil(straight / 25 * 60)),
        provider: "straight_line_fallback" as const,
        degraded: true,
      };

    const partnerIds = sourceKind === "marketplace" ? [origin.id] : [];
    const hasOwned = sourceKind === "owned";
    const stops = [
      {
        type: "pickup",
        source_kind: sourceKind,
        branch_id: origin.id,
        branch_name: origin.name,
        address: origin.address,
        latitude: originLat,
        longitude: originLng,
      },
      { type: "customer", latitude, longitude },
    ];

    const { data: stored, error: storeError } = await admin.rpc(
      "store_delivery_road_quote_v1",
      {
        p_hub_branch_id: hubId,
        p_partner_branch_ids: partnerIds,
        p_ordered_partner_branch_ids: partnerIds,
        p_has_owned: hasOwned,
        p_customer_latitude: latitude,
        p_customer_longitude: longitude,
        p_baseline_distance_km: Number(straight.toFixed(3)),
        p_baseline_duration_minutes: route.durationMinutes,
        p_route_distance_km: Number(route.distanceKm.toFixed(3)),
        p_detour_km: 0,
        p_route_duration_minutes: route.durationMinutes,
        p_provider: route.provider,
        p_degraded: route.degraded,
        p_stops: stops,
        p_metadata: {
          route_kind: "single",
          source_kind: sourceKind,
          origin_branch_id: origin.id,
          generated_by: "customer-store-route-distance",
        },
        p_ttl_seconds: 600,
      },
    );

    if (storeError || !stored?.route_quote_id) {
      console.error(
        "customer-store-route store quote failed",
        storeError?.message ?? "NO_ROUTE_QUOTE_ID",
      );
      return json({ error: "ROUTE_QUOTE_STORE_FAILED" }, 500);
    }

    return json({
      route_quote_id: stored.route_quote_id,
      expires_at: stored.expires_at,
      hub_branch_id: hubId,
      branch_id: origin.id,
      branch_name: origin.name,
      source_kind: sourceKind,
      road_distance_km: Number(route.distanceKm.toFixed(3)),
      straight_distance_km: Number(straight.toFixed(3)),
      road_duration_minutes: route.durationMinutes,
      provider: route.provider,
      degraded: route.degraded,
      distance_method: route.degraded ? "straight_line_fallback" : "driving",
      distance_source: "verified_road_route",
      cached: false,
    });
  } catch (error) {
    console.error("customer-store-route-distance failed", error);
    return json({ error: "STORE_ROUTE_FAILED" }, 500);
  }
});
