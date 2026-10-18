import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const calls=[];
let data=null;
let error=null;
const supabase={rpc: async (name,args) => {calls.push({name,args});return {data,error};}};
const moduleExports={};
const source=fs.readFileSync("src/lib/restaurantCartPreview.ts","utf8");
vm.runInNewContext(ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{
  exports:moduleExports,
  require:(name)=>name==="@/lib/supabase"?{supabase}:{},
  Set, Number, Array, Error, RegExp,
});
const {previewRestaurantStoreCart,previewCombinedRestaurantCarts}=moduleExports;
const branch="11111111-1111-4111-8111-111111111111";
const listing="22222222-2222-4222-8222-222222222222";
const product="33333333-3333-4333-8333-333333333333";
const items=[0,1].map(() => ({
  listing_id:listing,product_id:product,quantity:1,is_bulk:false,unit_of_measure:"piece"
}));
const selections=[{line_index:1,picks:[{group_id:"size",option_id:"large",quantity:1}]},
  {line_index:0,picks:[{group_id:"size",option_id:"small",quantity:1}]}];
const point={latitude:31.1,longitude:31.1};
const lines=[
  {line_index:0,listing_id:listing,product_id:product,quantity:1,base_unit_price:110,
    option_unit_price:0,unit_price_with_options:110,line_total:110,selection_key:"a",modifiers_snapshot:[]},
  {line_index:1,listing_id:listing,product_id:product,quantity:1,base_unit_price:110,
    option_unit_price:55,unit_price_with_options:165,line_total:165,selection_key:"b",modifiers_snapshot:[]},
];
const storePreview={
  source_kind:"marketplace",branch_id:branch,line_count:2,lines,currency:"EGP",
  base_subtotal:220,modifiers_subtotal:55,preview_subtotal:275,base_shipping_cost:0,
  preview_total_before_delivery_repricing:275,delivery_may_reprice:true,road_verified:false,
  preview_fingerprint:"a".repeat(32),checkout_enabled:false,not_payable:true
};
const combinedPreview={
  source_kind:"combined",restaurant_sources:[{source_index:0,branch_id:branch,cart_preview:storePreview}],
  currency:"EGP",base_subtotal:220,modifiers_subtotal:55,preview_subtotal:275,base_shipping_cost:0,
  preview_total_before_delivery_repricing:275,delivery_may_reprice:true,road_verified:false,
  preview_fingerprint:"b".repeat(32),checkout_enabled:false,not_payable:true
};
data=storePreview;
const result=await previewRestaurantStoreCart(branch,items,selections,point);
assert.equal(result.lines[1].line_total,165);
assert.equal(calls.at(-1).name,"preview_restaurant_cart_modifiers_v1");
assert.equal(calls.at(-1).args.p_items.length,2);
assert.equal(calls.at(-1).args.p_selections[0].line_index,1);
assert.equal(calls.at(-1).args.p_route_quote_id,null);
await assert.rejects(()=>previewRestaurantStoreCart(branch,items,[selections[0],selections[0]],point),/RESTAURANT_CART_SELECTIONS_INVALID/);
await assert.rejects(()=>previewRestaurantStoreCart(branch,items,selections,{latitude:Infinity,longitude:31.1}),/RESTAURANT_CART_SELECTIONS_INVALID/);
for (const bad of [
  {...storePreview,checkout_enabled:true},
  {...storePreview,not_payable:false},
  {...storePreview,delivery_may_reprice:false},
  {...storePreview,preview_fingerprint:"not-a-fingerprint"},
  {...storePreview,lines:[lines[0],lines[0]]},
  {...storePreview,lines:[lines[0],{...lines[1],product_id:"FORGED"}]},
]) {
  data=bad;
  await assert.rejects(()=>previewRestaurantStoreCart(branch,items,selections,point),/RESTAURANT_CART_PREVIEW_INVALID/);
}
data=combinedPreview;
const sources=[{source_kind:"marketplace",branch_id:branch,items}];
const restaurantSelections=[{source_index:0,selections}];
const combined=await previewCombinedRestaurantCarts(sources,restaurantSelections,point);
assert.equal(combined.restaurant_sources[0].cart_preview.lines[1].line_total,165);
assert.equal(calls.at(-1).name,"preview_combined_restaurant_modifiers_v1");
await assert.rejects(()=>previewCombinedRestaurantCarts(sources,[...restaurantSelections,...restaurantSelections],point),/RESTAURANT_COMBINED_SELECTIONS_INVALID/);
data={...combinedPreview,checkout_enabled:true};
await assert.rejects(()=>previewCombinedRestaurantCarts(sources,restaurantSelections,point),/RESTAURANT_CART_PREVIEW_INVALID/);
data={...combinedPreview,restaurant_sources:[{source_index:0,branch_id:"OTHER",cart_preview:storePreview}]};
await assert.rejects(()=>previewCombinedRestaurantCarts(sources,restaurantSelections,point),/RESTAURANT_COMBINED_PREVIEW_INVALID/);
error={message:"STOCK_UNAVAILABLE"};data=null;
await assert.rejects(()=>previewCombinedRestaurantCarts(sources,restaurantSelections,point),/STOCK_UNAVAILABLE/);
console.log("PASS typed previews: positions, duplicate meals, strict not-payable flags, forged server data, combined branch scope");
