import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const url = Deno.env.get('SUPABASE_URL') || '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const cors = {
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS',
  'Cache-Control':'no-store',
};
const respond = (data:unknown,status=200) =>
  new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});

Deno.serve(async req => {
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  if(req.method!=='POST') return respond({error:'method_not_allowed'},405);

  const token = (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();
  if(!token) return respond({error:'login_required'},401);
  const session = createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError} = await session.auth.getUser(token);
  if(authError||!user) return respond({error:'login_required'},401);

  let body:Record<string,unknown>;
  try {
    const raw = await req.text();
    if(raw.length>1200) return respond({error:'too_long'},400);
    body = JSON.parse(raw);
  } catch {return respond({error:'invalid_request'},400);}
  const phrase = typeof body.message==='string'?body.message.trim().slice(0,240):'';
  if(phrase.length<3) return respond({error:'too_short'},400);

  const {data:groups,error:listError} = await admin
    .from('smart_shopping_groups')
    .select('slug,title_ar,subtitle_ar,kind')
    .eq('published',true)
    .order('position',{ascending:true}).limit(25);
  if(listError || !groups?.length) return respond({error:'temporarily_unavailable'},503);

  const available = groups.map(g=>g.slug);
  // Reuse the securely configured provider from the existing ai-gateway.
  const {data:storedKey} = await admin.rpc('get_ai_provider_secret',{p_name:'GEMINI_API_KEY'});
  const key = (typeof storedKey==='string'?storedKey:'') || Deno.env.get('GEMINI_API_KEY') || '';
  if(!key) return respond({error:'ai_not_configured'},503);
  const {data:allowed,error:quotaError} = await admin.rpc('consume_customer_smart_ai_quota_v1',{p_user_id:user.id});
  if(quotaError || !allowed) return respond({error:'daily_limit'},429);

  const abort = new AbortController();
  const timeout = setTimeout(()=>abort.abort(),9500);
  try {
    const provider = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',{
      method:'POST',
      signal:abort.signal,
      headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:
          'أنت محلل نوايا تسوق مصري. مهمتك اختيار مجموعة واحدة فقط من القائمة المنشورة. '+
          'لا تخترع وصفة ولا منتج ولا سعر. لو الطلب لا يطابق أي مجموعة اكتب slug=null. '+
          'أخرج JSON فقط: {"slug":string|null,"people":2|4|6|8,"budget":"simple"|"medium"|"large"}. '+
          'افهم مصري طبيعي زي عايز عزومة/حواوشي/قعدة ماتش/نواقص البيت. '+
          'اختر أعلى نية مطابقة. لا تنفذ عمليات شراء.'
        }]},
        contents:[{role:'user',parts:[{text:
          'المجموعات المسموح بيها: '+JSON.stringify(groups)+
          '\nطلب العميل: '+phrase
        }]}],
        generationConfig:{responseMimeType:'application/json',temperature:0.1,maxOutputTokens:160},
      }),
    });
    if(!provider.ok) return respond({error:'ai_temporarily_unavailable'},503);
    const payload = await provider.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('')||'';
    let match:Record<string,unknown>;
    try {match=JSON.parse(raw);} catch {return respond({error:'ai_invalid_result'},503);}
    const slug = typeof match.slug==='string' && available.includes(match.slug)?match.slug:null;
    const number = Number(match.people);
    const people = [2,4,6,8].includes(number)?number:4;
    const budget = ['simple','medium','large'].includes(String(match.budget))?match.budget:'medium';
    return respond({slug,people,budget});
  } catch {return respond({error:'ai_temporarily_unavailable'},503);}
  finally {clearTimeout(timeout);}
});
