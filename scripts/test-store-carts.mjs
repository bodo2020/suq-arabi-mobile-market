import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports = {};
vm.runInNewContext(compile(fs.readFileSync('src/lib/storeCarts.ts','utf8')), { exports });
const {groupStoreCarts,defaultCheckoutStores,canCombineStores,quoteIdentity,itemQuoteIdentity,subtractPurchasedItems,cartLinePrice}=exports;
const item=(branch,listing,quantity=2)=>({product:{id:'same-product',price:12},quantity,is_bulk:false,unit_of_measure:'piece',commerce_source:branch?'marketplace':'owned',marketplace_branch_id:branch,marketplace_listing_id:listing,merchant_name:branch});
const cart=[item(null,null),item('a','la'),item('b','lb'),item('c','lc'),item('d','ld')];
assert.equal(groupStoreCarts(cart).length,5);
assert.equal(cartLinePrice({...cart[0],product:{price:12,offer_price:0}}),12);
assert.equal(cartLinePrice({...cart[0],product:{price:12,offer_price:10}}),10);
assert.equal(cartLinePrice({...cart[0],product:{price:12,offer_price:15}}),12);
assert.equal(defaultCheckoutStores(cart).length,3);
assert.equal(canCombineStores(['marketplace:a','marketplace:b','marketplace:c']),false);
const prices=new Map(cart.map((value,index)=>[itemQuoteIdentity(value),index*10]));
assert.equal(prices.size,5,'same SKU in different listings must never share price/stock');
assert.equal(prices.get(quoteIdentity({product_id:'same-product',listing_id:'lb',unit_of_measure:'piece'})),20);
const after=subtractPurchasedItems(cart,[{source_kind:'marketplace',branch_id:'a',items:[{product_id:'same-product',listing_id:'la',quantity:1}]}]);
assert.equal(after.length,5);
assert.equal(after.find(value=>value.marketplace_branch_id==='a').quantity,1);
assert.equal(after.find(value=>value.marketplace_branch_id==='b').quantity,2);
assert.equal(subtractPurchasedItems(cart,[{source_kind:'owned',items:[{product_id:'same-product',quantity:2}]}]).length,4);
const weight={...item('a','weight',750),unit_of_measure:'weight'};
assert.equal(subtractPurchasedItems([weight],[{source_kind:'marketplace',branch_id:'a',items:[{product_id:'same-product',listing_id:'weight',quantity:500,unit_of_measure:'weight'}]}])[0].quantity,250);
console.log('PASS independent baskets, checkout limits, source-specific prices, selective cleanup, weight quantities');

let handler;
let stored;
let providerAvailable=true;
const hub={id:'hub',name:'Hub',latitude:1,longitude:1,active:true,delivery_enabled:true};
const branches=[{id:'a',name:'A',latitude:2,longitude:2,hub_branch_id:'hub',active:true},{id:'b',name:'B',latitude:3,longitude:3,hub_branch_id:'hub',active:true}];
const admin={auth:{getUser:async()=>({data:{user:{id:'test'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:hub})}),in:async()=>({data:branches})})}),rpc:async(name,args)=>{
  if(name==='find_delivery_branch') return {data:[{branch_id:'hub'}]};
  if(name==='get_cached_delivery_road_quote_v1') return {data:null};
  if(name==='store_delivery_road_quote_v1'){stored=args;return {data:{route_quote_id:'quote',expires_at:'future'}};}
  throw Error(name);
}};
const requests=[];
const fetchMock=async value=>{
 const url=new URL(value);requests.push(url);
 if(!providerAvailable) return {ok:false,json:async()=>({})};
 const points=[url.searchParams.get('origin'),...(url.searchParams.get('waypoints')?.split('|')||[]),url.searchParams.get('destination')];
 const distances=points.slice(1).map((point,i)=>points[i]==='2,2'&&point==='3,3'?2000:points[i]==='3,3'&&point==='2,2'?4000:1000);
 return {ok:true,json:async()=>({status:'OK',routes:[{legs:distances.map(distance=>({distance:{value:distance},duration:{value:180}}))}]})};
};
const edge=fs.readFileSync('supabase/functions/customer-multistore-route/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
vm.runInNewContext(compile(edge),{exports:{},createClient:()=>admin,Deno:{env:{get:key=>({SUPABASE_URL:'http://test',SUPABASE_SERVICE_ROLE_KEY:'server',SUPABASE_ANON_KEY:'public',GOOGLE_MAPS_API_KEY:'maps'})[key]},serve:fn=>{handler=fn;}},fetch:fetchMock,Request,Response,URL,AbortSignal,console});
const request=has_owned=>new Request('http://test',{method:'POST',headers:{apikey:'public','content-type':'application/json'},body:JSON.stringify({partner_branch_ids:['a','b'],has_owned,latitude:4,longitude:4})});
let result=await handler(request(false));assert.equal(result.status,200);
let body=await result.json();assert.equal(body.route_distance_km,3);assert.equal(stored.p_metadata.route_anchor,'first_pickup');
assert.equal(stored.p_stops.length,3);assert.equal(stored.p_stops[0].branch_id,'a');
assert.equal(stored.p_stops[1].distance_from_previous_km,2);assert.equal(stored.p_stops[2].distance_from_previous_km,1);
assert(requests.every(url=>url.searchParams.get('origin')!=='1,1'),'unselected hub must not be billed');
result=await handler(request(true));assert.equal(result.status,200);body=await result.json();assert.equal(body.route_distance_km,4);assert.equal(stored.p_stops[0].branch_id,'hub');assert.equal(stored.p_stops.length,4);
providerAvailable=false;assert.equal((await handler(request(false))).status,503,'do not bill straight-line distance as road distance');
console.log('PASS real route handler: both pickup orders, shortest route, no unselected hub, leg distances, road provider failure');

// A successful server commit with a lost response must be retried with exactly
// the same request/route, even when re-quoting would now fail (stock was consumed).
for (const [file,fn,idKey,rpcName] of [
 ['combinedCheckout','placeCombinedOrder','groupId','place_combined_order_group_v3'],
 ['marketplaceCheckout','placeMarketplaceOrder','requestId','place_marketplace_order_v3'],
]) {
 const calls=[];
 const mod={};
 const mockSupabase={rpc:async(name,args)=>{calls.push({name,args});return {data:{id:'existing-order',orders:[]},error:null}},from:()=>{throw Error('must not re-quote a persisted request')}};
 vm.runInNewContext(compile(fs.readFileSync(`src/lib/${file}.ts`,'utf8')),{exports:mod,require:name=>name==='@/lib/supabase'?{supabase:mockSupabase}:name==='@/lib/marketplaceCheckout'?{assertNoUnverifiedRestaurantOptions:()=>{}}:{},localStorage:{}});
 const pending={[idKey]:'same-request',routeQuoteId:'original-route',quoteToken:'original-token',sources:[],items:[],addressId:'address',branchId:'branch',paymentMethod:'cash',notes:'',substitutionPolicy:'contact_me'};
 await mod[fn](pending); await mod[fn](pending);
 assert.equal(calls.length,2);assert.equal(calls[0].name,rpcName);
 assert.deepEqual(calls[0],calls[1]);assert.equal(calls[0].args.p_route_quote_id,'original-route');
}
console.log('PASS checkout retry: original request and route replayed without fresh stock quote');

// Malformed / future modifier picks must never quietly pass through legacy
// marketplace or combined checkout and be billed as the base product.
const guardExports = {};
vm.runInNewContext(
  compile(fs.readFileSync('src/lib/marketplaceCheckout.ts','utf8')),
  { exports: guardExports, require: name => name === '@/lib/supabase' ? { supabase: { rpc: async () => ({ data: null, error: null }) } } : {} },
);
guardExports.assertNoUnverifiedRestaurantOptions([{ product_id: 'regular' }]);
guardExports.assertNoUnverifiedRestaurantOptions([{ modifier_picks: [] }]);
for (const field of ['restaurant_modifier_picks','modifier_picks','modifiers']) {
  assert.throws(
    () => guardExports.assertNoUnverifiedRestaurantOptions([{ [field]: [{ group_id:'size',option_id:'large',quantity:1 }] }]),
    /RESTAURANT_MODIFIERS_NOT_READY/,
  );
}
const customized = { ...item('a','la'), restaurant_modifier_picks: [{ group_id:'size',option_id:'large',quantity:1 }] };
assert.throws(() => guardExports.marketplaceCheckoutLines([customized]), /RESTAURANT_MODIFIERS_NOT_READY/);
console.log('PASS unverified restaurant modifiers never silently enter base-only checkout');
