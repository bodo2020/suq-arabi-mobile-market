import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GOOGLE_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? Deno.env.get("VITE_GOOGLE_MAPS_API_KEY") ?? "AIzaSyBwx24l0UncHBcYwOkMEhHhaH5njd5crKw";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
function haversineKm(lat1:number,lon1:number,lat2:number,lon2:number){const r=6371,rad=(v:number)=>v*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;return 2*r*Math.asin(Math.sqrt(a));}
async function googleRoute(originLat:number,originLng:number,latitude:number,longitude:number){
  if(!GOOGLE_KEY) return null;
  const u=new URL('https://maps.googleapis.com/maps/api/directions/json');
  u.searchParams.set('origin',`${originLat},${originLng}`);u.searchParams.set('destination',`${latitude},${longitude}`);u.searchParams.set('mode','driving');u.searchParams.set('alternatives','false');u.searchParams.set('key',GOOGLE_KEY);
  const r=await fetch(u.toString(),{signal:AbortSignal.timeout(10000)});const p=await r.json().catch(()=>null) as any;const status=p?.status||`HTTP_${r.status}`;
  if(!r.ok||status!=='OK'||!p?.routes?.[0]?.legs?.[0]){console.warn('Google route unavailable',status,p?.error_message||'');return null;}
  const leg=p.routes[0].legs[0];return {distanceKm:Number(leg.distance?.value||0)/1000,durationMinutes:Math.max(1,Math.round(Number(leg.duration?.value||0)/60)),provider:'google' as const};
}
async function osrmRoute(originLat:number,originLng:number,latitude:number,longitude:number){
  const u=`https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${longitude},${latitude}?overview=false&alternatives=false&steps=false`;
  const r=await fetch(u,{headers:{'User-Agent':'ElmadawyMarket/1.0'},signal:AbortSignal.timeout(10000)});const p=await r.json().catch(()=>null) as any;
  if(!r.ok||p?.code!=='Ok'||!p?.routes?.[0]){console.error('OSRM route unavailable',p?.code||r.status);return null;}
  const route=p.routes[0];return {distanceKm:Number(route.distance||0)/1000,durationMinutes:Math.max(1,Math.round(Number(route.duration||0)/60)),provider:'osrm' as const};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST') return json({error:'METHOD_NOT_ALLOWED'},405);
  try{
    const supplied=req.headers.get('apikey')||'';const auth=req.headers.get('authorization')||'';
    let callerAllowed=supplied===ANON_KEY||auth===`Bearer ${ANON_KEY}`;
    if(!callerAllowed&&auth.startsWith('Bearer ')){
      const token=auth.slice(7);const userClient=createClient(SUPABASE_URL,ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
      const {data}=await userClient.auth.getUser();callerAllowed=!!data.user;
    }
    if(!callerAllowed) return json({error:'UNAUTHORIZED'},401);

    const body=await req.json().catch(()=>null) as {branch_id?:unknown;latitude?:unknown;longitude?:unknown}|null;
    const branchId=typeof body?.branch_id==='string'?body.branch_id:'';const latitude=Number(body?.latitude),longitude=Number(body?.longitude);
    if(!branchId||!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude < -90||latitude > 90||longitude < -180||longitude > 180) return json({error:'INVALID_LOCATION'},400);

    const {data:branch,error}=await supabase.from('branches').select('id,name,latitude,longitude,delivery_radius_km,delivery_enabled,active').eq('id',branchId).maybeSingle();
    if(error||!branch||branch.active===false||branch.delivery_enabled===false||branch.latitude==null||branch.longitude==null)return json({error:'BRANCH_UNAVAILABLE'},404);
    const originLat=Number(branch.latitude),originLng=Number(branch.longitude),radius=Number(branch.delivery_radius_km||0),straight=haversineKm(originLat,originLng,latitude,longitude);
    if(radius>0&&straight>radius)return json({branch_id:branch.id,branch_name:branch.name,road_distance_km:null,straight_distance_km:Number(straight.toFixed(3)),duration_minutes:null,delivery_radius_km:radius,deliverable:false,distance_method:'straight_line_reject',provider:null});

    const route=await googleRoute(originLat,originLng,latitude,longitude) ?? await osrmRoute(originLat,originLng,latitude,longitude);
    if(!route) return json({error:'ROUTE_PROVIDER_UNAVAILABLE'},502);
    const roadKm=route.distanceKm;
    return json({branch_id:branch.id,branch_name:branch.name,road_distance_km:Number(roadKm.toFixed(3)),straight_distance_km:Number(straight.toFixed(3)),duration_minutes:route.durationMinutes,delivery_radius_km:radius,deliverable:radius<=0?true:roadKm<=radius,distance_method:'driving',provider:route.provider});
  }catch(error){console.error('route-distance failed',error);return json({error:'ROUTE_DISTANCE_FAILED'},500);}
});
