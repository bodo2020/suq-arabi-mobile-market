import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

// Builds the "meaning" (Gemini embedding) of products that are new or whose
// name/section changed. Called every 30 minutes by pg_cron, only when needed.
// Safe to call any time: it only processes what is stale.

const url = Deno.env.get('SUPABASE_URL') || '';
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 768;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Below 3072 dimensions Gemini vectors must be normalised for cosine search.
const normalise = (values: number[]) => {
  const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map(value => Number((value / length).toFixed(7)));
};

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  let limit = 90;
  // Gemini's free tier embeds about 100 texts a minute: at most 90 per call.
  try { limit = Math.min(90, Math.max(1, Number((await req.json())?.limit) || 90)); } catch { /* default */ }

  const { data: storedKey } = await admin.rpc('get_ai_provider_secret', { p_name: 'GEMINI_API_KEY' });
  const key = (typeof storedKey === 'string' ? storedKey : '') || Deno.env.get('GEMINI_API_KEY') || '';
  if (!key) return json({ error: 'ai_not_configured' }, 503);

  const { data: rows, error } = await admin.rpc('get_products_needing_embedding_v1', { p_limit: limit });
  if (error) return json({ error: 'load_failed' }, 500);
  const pending = (rows || []) as Array<{ product_id: string; source_text: string }>;
  let saved = 0;

  for (let start = 0; start < pending.length; start += 100) {
    const batch = pending.slice(start, start + 100).filter(row => row.source_text);
    if (!batch.length) continue;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        requests: batch.map(row => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text: row.source_text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          outputDimensionality: DIMENSIONS,
        })),
      }),
    });
    if (!response.ok) {
      console.error('embedding_provider_error', response.status, (await response.text()).replace(/\s+/g, ' ').slice(0, 900));
      return json({ error: 'provider_error', saved }, 502);
    }
    const payload = await response.json() as { embeddings?: Array<{ values?: number[] }> };
    const embeddings = payload.embeddings || [];
    const toSave = batch.map((row, index) => ({
      product_id: row.product_id,
      source_text: row.source_text,
      model: `${MODEL}@${DIMENSIONS}`,
      embedding: embeddings[index]?.values?.length === DIMENSIONS ? normalise(embeddings[index].values!) : null,
    })).filter(row => row.embedding);
    const { data: count, error: saveError } = await admin.rpc('save_product_embeddings_v1', { p_rows: toSave });
    if (saveError) return json({ error: 'save_failed', saved }, 500);
    saved += Number(count || 0);
  }

  return json({ ok: true, pending: pending.length, saved });
});
