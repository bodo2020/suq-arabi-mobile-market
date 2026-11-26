import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "payment-receipts";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PER_HOUR = 10;
const TYPE_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const form = await req.formData();
  const file = form.get("file");
  const requestId = String(form.get("request_id") ?? "");
  if (!(file instanceof File) || !TYPE_EXT[file.type]) return json({ error: "invalid_file" }, 400);
  if (file.size <= 0 || file.size > MAX_BYTES) return json({ error: "file_too_large" }, 400);
  if (!UUID.test(requestId)) return json({ error: "invalid_request" }, 400);

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin.from("payment_receipts").select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ error: "too_many_receipts" }, 429);

  const path = `${userId}/${requestId}/${crypto.randomUUID()}.${TYPE_EXT[file.type]}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return json({ error: "upload_failed" }, 502);

  const { error: insertError } = await admin.from("payment_receipts").insert({
    request_id: requestId,
    user_id: userId,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
  });
  if (insertError) {
    await admin.storage.from(BUCKET).remove([path]);
    return json({ error: "save_failed" }, 500);
  }

  return json({ storage_path: path });
});
