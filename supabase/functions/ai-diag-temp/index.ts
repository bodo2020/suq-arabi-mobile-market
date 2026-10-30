// TEMPORARY diagnostic function — safe to delete.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const url = Deno.env.get('SUPABASE_URL') || '';
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async () => {
  const { data: storedKey } = await admin.rpc('get_ai_provider_secret', { p_name: 'GEMINI_API_KEY' });
  const key = (typeof storedKey === 'string' ? storedKey : '') || Deno.env.get('GEMINI_API_KEY') || '';
  const keyInfo = key ? { present: true, prefix: key.slice(0, 6), length: key.length } : { present: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'قل: مرحبًا' }] }],
        generationConfig: { maxOutputTokens: 50, temperature: 0 },
      }),
    });
    const text = await res.text();
    return new Response(JSON.stringify({ keyInfo, status: res.status, body: text.slice(0, 800) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ keyInfo, fetchError: String(e) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } finally {
    clearTimeout(timer);
  }
});
