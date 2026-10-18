import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/lib/restaurantModifiers.ts','utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText, {exports});
const {evaluateRestaurantModifiers,minimumRestaurantModifierPrice}=exports;

const groups=[
  {id:'size',name:'الحجم',min_choices:1,max_choices:1,options:[
    {id:'small',name:'صغير',price_delta:5},
    {id:'large',name:'كبير',price_delta:15},
  ]},
  {id:'extras',name:'الإضافات',min_choices:0,max_choices:3,options:[
    {id:'cheese',name:'جبنة',price_delta:12.50,max_quantity:2},
    {id:'sauce',name:'صوص',price_delta:0,max_quantity:2},
    {id:'onion',name:'بصل',price_delta:0,active:false},
  ]},
];
const small = {group_id:'size',option_id:'small',quantity:1};
const cheese = {group_id:'extras',option_id:'cheese',quantity:2};
const sauce = {group_id:'extras',option_id:'sauce',quantity:1};
const a=evaluateRestaurantModifiers(groups,[cheese,small,sauce]);
const b=evaluateRestaurantModifiers(groups,[sauce,small,cheese]);
assert.equal(a.price_delta,30);
assert.equal(minimumRestaurantModifierPrice(groups),5);
assert.equal(a.selection_key,b.selection_key,'identity must not depend on click order');
assert.equal(a.picks.length,3);
const other=evaluateRestaurantModifiers(groups,[{group_id:'size',option_id:'large',quantity:1}]);
assert.notEqual(a.selection_key,other.selection_key,'customized meals must remain separate cart lines');
assert.equal(other.price_delta,15);

const rejects=(picks,code,usedGroups=groups)=>{
  assert.throws(
    ()=>evaluateRestaurantModifiers(usedGroups,picks),
    (error)=>error?.code===code,
    code,
  );
};
rejects([],'MODIFIER_REQUIRED_OR_LIMIT');
rejects([{group_id:'size',option_id:'small',quantity:2}],'MODIFIER_TOO_MANY');
rejects([small,small],'MODIFIER_DUPLICATE_OPTION');
rejects([small,{group_id:'extras',option_id:'onion',quantity:1}],'MODIFIER_OPTION_UNAVAILABLE');
rejects([small,{group_id:'extras',option_id:'missing',quantity:1}],'MODIFIER_OPTION_UNAVAILABLE');
rejects([small,{group_id:'unknown',option_id:'small',quantity:1}],'MODIFIER_GROUP_UNAVAILABLE');
rejects([small,{group_id:'extras',option_id:'cheese',quantity:3}],'MODIFIER_TOO_MANY');
rejects([small,{group_id:'extras',option_id:'cheese',quantity:2},{group_id:'extras',option_id:'sauce',quantity:2}],'MODIFIER_REQUIRED_OR_LIMIT');
rejects([small,{group_id:'extras',option_id:'cheese',quantity:0}],'MODIFIER_INVALID_SELECTION');
rejects([small,{group_id:'extras',option_id:'cheese',quantity:1.5}],'MODIFIER_INVALID_SELECTION');

assert.equal(minimumRestaurantModifierPrice([{
  id:'two',name:'اختر اثنين',min_choices:2,max_choices:3,options:[
    {id:'cheap',name:'أ',price_delta:2,max_quantity:1},
    {id:'next',name:'ب',price_delta:4,max_quantity:2},
    {id:'expensive',name:'ج',price_delta:20},
  ],
}]),6,'starts-at price must include mandatory picks');
assert.throws(
  ()=>minimumRestaurantModifierPrice([{id:'empty',name:'إجباري',min_choices:1,max_choices:1,options:[]}]),
  (error)=>error?.code==='MODIFIER_UNAVAILABLE_REQUIRED',
);
assert.throws(
  ()=>minimumRestaurantModifierPrice([{id:'bad',name:'سعر غير صالح',min_choices:0,max_choices:1,options:[{id:'a',name:'a',price_delta:2.345}]}]),
  (error)=>error?.code==='MODIFIER_INVALID_PRICE',
);
console.log('PASS restaurant modifiers: mandatory/optional choices, prices, quantity limits, canonical meal identity, unavailability');
