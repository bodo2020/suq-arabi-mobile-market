import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const LEGACY_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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
const PUBLIC_KEY =
  LEGACY_ANON_KEY
  || publishableKeys.default
  || Object.values(publishableKeys)[0]
  || "";
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

type RepriceContext = {
  request_id: string;
  group_id: string;
  hub_branch_id: string;
  active_store_count: number;
  has_owned: boolean;
  partner_branch_ids: string[];
  single_source_kind: "owned" | "marketplace" | null;
  single_branch_id: string | null;
  latitude: number;
  longitude: number;
  subtotal: number;
  old_total: number;
  payment_method: string | null;
  payment_status: string | null;
  request_status: string;
};

async function edgeRoute(
  slug: string,
  authorization: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: PUBLIC_KEY,
      authorization,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload || typeof payload.route_quote_id !== "string") {
    const code = typeof payload?.error === "string" ? payload.error : "ROUTE_REPRICE_FAILED";
    throw new Error(code);
  }
  return payload;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    if (!SUPABASE_URL || !SERVICE_KEY || !PUBLIC_KEY) {
      return json({ error: "SERVER_NOT_CONFIGURED" }, 500);
    }

    const authorization = request.headers.get("authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);

    const token = authorization.slice(7).trim();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "AUTH_REQUIRED" }, 401);

    const body = await request.json().catch(() => null) as { group_id?: unknown } | null;
    const groupId = typeof body?.group_id === "string" ? body.group_id : "";
    if (!groupId) return json({ error: "ORDER_GROUP_REQUIRED" }, 400);

    const caller = createClient(SUPABASE_URL, PUBLIC_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });

    const { data: contextData, error: contextError } = await caller.rpc(
      "get_order_group_reprice_context_v1",
      { p_group_id: groupId },
    );
    if (contextError || !contextData) {
      console.error("order-group-reprice context failed", contextError?.message);
      return json({ error: contextError?.message || "ORDER_GROUP_REPRICE_CONTEXT_FAILED" }, 400);
    }

    const context = contextData as RepriceContext;
    let routeQuoteId: string | null = null;
    let route: Record<string, unknown> | null = null;

    try {
      if (Number(context.active_store_count) === 1) {
        if (!context.single_source_kind || !context.single_branch_id) {
          throw new Error("ORDER_GROUP_SINGLE_SOURCE_INVALID");
        }
        route = await edgeRoute(
          "customer-store-route-distance",
          authorization,
          {
            source_kind: context.single_source_kind,
            branch_id: context.single_branch_id,
            latitude: Number(context.latitude),
            longitude: Number(context.longitude),
          },
        );
        routeQuoteId = String(route.route_quote_id);
      } else if (Number(context.active_store_count) >= 2) {
        route = await edgeRoute(
          "customer-multistore-route",
          authorization,
          {
            partner_branch_ids: Array.isArray(context.partner_branch_ids)
              ? context.partner_branch_ids
              : [],
            has_owned: context.has_owned === true,
            latitude: Number(context.latitude),
            longitude: Number(context.longitude),
          },
        );
        routeQuoteId = String(route.route_quote_id);
      }

      const { data: applied, error: applyError } = await caller.rpc(
        "apply_order_group_reprice_v1",
        {
          p_group_id: groupId,
          p_request_id: context.request_id,
          p_route_quote_id: routeQuoteId,
        },
      );
      if (applyError) throw new Error(applyError.message || "ORDER_GROUP_REPRICE_APPLY_FAILED");

      return json({
        ok: true,
        group_id: groupId,
        request_id: context.request_id,
        route,
        result: applied,
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "ORDER_GROUP_REPRICE_FAILED";
      console.error("order-group-reprice route/apply failed", code);
      await caller.rpc("mark_order_group_reprice_failed_v1", {
        p_group_id: groupId,
        p_request_id: context.request_id,
        p_error: code,
      }).catch(() => null);
      return json({ error: code, request_id: context.request_id }, 400);
    }
  } catch (error) {
    console.error("order-group-reprice failed", error);
    return json({ error: "ORDER_GROUP_REPRICE_FAILED" }, 500);
  }
});
