import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

function normalizePhone(input: unknown) {
  if (typeof input !== "string") return "";
  const raw = input.trim();
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return "";
  return `+${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { phone?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_request" }, 400); }

  const phone = normalizePhone(body?.phone);
  if (!/^\+201[0125]\d{8}$/.test(phone)) return json({ error: "egypt_phone_only" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) return json({ error: "service_unavailable" }, 503);

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("customers")
    .select("id")
    .eq("phone", phone)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("customer-auth-route lookup failed", error.code);
    return json({ error: "service_unavailable" }, 503);
  }

  return json({ registered: Boolean(data?.id) });
});
