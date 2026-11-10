import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

// Search by meaning: turns the customer's words into a Gemini embedding
// (cached per phrase) and returns the closest products. Product ids only; the
// app shows them from its own catalog with live prices and stock.

const url = Deno.env.get('SUPABASE_URL') || '';
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const MODEL = 'gemini-embedding-001';
const DIMENSIONS = 768;
const MIN_SIMILARITY = 0.66;
const NEAR_BEST = 0.03;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

// Same normalisation as the app's Arabic search.
const normaliseText = (value: string) => value.toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[ةه]/g, 'ه')
  .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim();
const normaliseVector = (values: number[]) => {
  const length = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map(value => Number((value / length).toFixed(7)));
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let query = '';
  let limit = 30;
  try {
    const raw = await req.text();
    if (raw.length > 600) return json({ error: 'too_long' }, 400);
    const body = JSON.parse(raw) as { query?: unknown; limit?: unknown };
    query = typeof body.query === 'string' ? normaliseText(body.query).slice(0, 80) : '';
    limit = Math.min(40, Math.max(1, Number(body.limit) || 30));
  } catch { return json({ error: 'invalid_request' }, 400); }
  if (query.length < 3 || /^\d+$/.test(query)) return json({ items: [] });

  let vector: number[] | null = null;
  const { data: cached } = await admin.rpc('get_search_query_embedding_v1', { p_query_norm: query });
  if (typeof cached === 'string' && cached.startsWith('[')) vector = JSON.parse(cached);

  if (!vector) {
    const { data: storedKey } = await admin.rpc('get_ai_provider_secret', { p_name: 'GEMINI_API_KEY' });
    const key = (typeof storedKey === 'string' ? storedKey : '') || Deno.env.get('GEMINI_API_KEY') || '';
    if (!key) return json({ items: [], error: 'ai_not_configured' });
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify({
          model: `models/${MODEL}`,
          content: { parts: [{ text: query }] },
          taskType: 'RETRIEVAL_QUERY',
          outputDimensionality: DIMENSIONS,
        }),
      });
      if (!response.ok) return json({ items: [], error: 'provider_error' });
      const payload = await response.json() as { embedding?: { values?: number[] } };
      const values = payload.embedding?.values;
      if (!values || values.length !== DIMENSIONS) return json({ items: [], error: 'provider_error' });
      vector = normaliseVector(values);
      await admin.rpc('save_search_query_embedding_v1', { p_query_norm: query, p_embedding: vector });
    } catch {
      return json({ items: [], error: 'provider_timeout' });
    }
  }

  const { data, error } = await admin.rpc('match_products_by_meaning_v1', { p_embedding: vector, p_limit: limit, p_min_similarity: MIN_SIMILARITY });
  if (error) return json({ items: [], error: 'match_failed' });
  // Gemini scores sit close together (unrelated ~0.64, related ~0.70), so keep
  // only products near the best one.
  const rows = (data || []) as Array<{ product_id: string; similarity: number }>;
  const best = rows.length ? Number(rows[0].similarity) : 0;
  const items = rows
    .filter(row => Number(row.similarity) >= best - NEAR_BEST)
    .map(row => ({ id: row.product_id, score: Math.round(Number(row.similarity) * 1000) / 1000 }));
  return json({ items });
});
