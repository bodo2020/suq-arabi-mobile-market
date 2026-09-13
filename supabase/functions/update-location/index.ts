import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);

    const raw = await req.text();
    if (!raw || raw.length > 4096) return json({ error: "INVALID_REQUEST" }, 400);
    const body = JSON.parse(raw) as { latitude?: unknown; longitude?: unknown; addressId?: unknown };
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const addressId = typeof body.addressId === "string" ? body.addressId.trim() : "";

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return json({ error: "INVALID_COORDINATES" }, 400);
    }
    if (addressId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(addressId)) {
      return json({ error: "INVALID_ADDRESS_ID" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !anonKey) return json({ error: "SERVER_CONFIG_MISSING" }, 500);

    const userSupabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });

    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData.user) return json({ error: "AUTH_REQUIRED" }, 401);
    const userId = userData.user.id;
    const updatePayload = { latitude, longitude, updated_at: new Date().toISOString() };

    if (addressId) {
      const { data, error } = await userSupabase
        .from("customer_addresses")
        .update(updatePayload)
        .eq("id", addressId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("update-location update failed", error.message);
        return json({ error: "LOCATION_UPDATE_FAILED" }, 500);
      }
      if (!data) return json({ error: "ADDRESS_NOT_FOUND" }, 404);
      return json({ success: true, address_id: data.id });
    }

    const { data: current, error: findError } = await userSupabase
      .from("customer_addresses")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();
    if (findError) {
      console.error("update-location lookup failed", findError.message);
      return json({ error: "ADDRESS_LOOKUP_FAILED" }, 500);
    }

    if (current?.id) {
      const { error } = await userSupabase
        .from("customer_addresses")
        .update(updatePayload)
        .eq("id", current.id)
        .eq("user_id", userId);
      if (error) {
        console.error("update-location default update failed", error.message);
        return json({ error: "LOCATION_UPDATE_FAILED" }, 500);
      }
      return json({ success: true, address_id: current.id });
    }

    const { data: inserted, error: insertError } = await userSupabase
      .from("customer_addresses")
      .insert({
        user_id: userId,
        address: "Auto-detected location",
        latitude,
        longitude,
        is_default: true,
      })
      .select("id")
      .single();
    if (insertError) {
      console.error("update-location insert failed", insertError.message);
      return json({ error: "LOCATION_CREATE_FAILED" }, 500);
    }

    return json({ success: true, address_id: inserted.id });
  } catch (error) {
    console.error("update-location failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});
