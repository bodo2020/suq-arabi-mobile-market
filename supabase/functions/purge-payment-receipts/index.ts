import { createClient } from "npm:@supabase/supabase-js@2";

// Called daily by pg_cron (see migration). Deletes receipts older than 45 days from storage and the table.
const BUCKET = "payment-receipts";
const KEEP_DAYS = 45;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("PURGE_TOKEN");
  if (!expected || req.headers.get("x-purge-token") !== expected) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000).toISOString();
  let removed = 0;

  for (;;) {
    const { data: rows, error } = await admin.from("payment_receipts")
      .select("id, storage_path").lt("created_at", cutoff).limit(200);
    if (error) return json({ error: "query_failed", removed }, 500);
    if (!rows?.length) break;

    const { error: removeError } = await admin.storage.from(BUCKET).remove(rows.map(r => r.storage_path));
    if (removeError) return json({ error: "storage_remove_failed", removed }, 500);

    const { error: deleteError } = await admin.from("payment_receipts").delete().in("id", rows.map(r => r.id));
    if (deleteError) return json({ error: "row_delete_failed", removed }, 500);
    removed += rows.length;
  }

  return json({ removed });
});
