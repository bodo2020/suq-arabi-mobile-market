import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const file = fs.readFileSync('src/lib/demoRestaurant.ts', 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(file, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const {
  DEMO_RESTAURANT_BRANCH_ID, DEMO_RESTAURANT_PHOTOS,
  DEMO_RESTAURANT_CUSTOMIZABLE, DEMO_RESTAURANT_CATEGORIES,
  demoRestaurantCategory, demoRestaurantImage,
} = exports;
assert.equal(DEMO_RESTAURANT_BRANCH_ID, '8d85290d-76fa-4aff-bf9c-fa46011bac95');
assert.equal(Object.keys(DEMO_RESTAURANT_PHOTOS).length, 12);
assert.equal(new Set(Object.keys(DEMO_RESTAURANT_PHOTOS)).size, 12);
assert.equal(DEMO_RESTAURANT_CUSTOMIZABLE.size, 2);
for (const [id, url] of Object.entries(DEMO_RESTAURANT_PHOTOS)) {
  assert.match(id, /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  assert.match(url, /^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?/);
}
assert.deepEqual([...DEMO_RESTAURANT_CATEGORIES],
  ['السندوتشات', 'الوجبات', 'الجانبيات', 'المشروبات']);
for (const [name, category] of [
  ['ساندوتش برجر (تجريبي)', 'السندوتشات'],
  ['وجبة فراخ مشوية (تجريبي)', 'الوجبات'],
  ['بطاطس محمرة (تجريبي)', 'الجانبيات'],
  ['عصير ليمون (تجريبي)', 'المشروبات'],
]) assert.equal(demoRestaurantCategory({name}),category);
const productId = '86536af1-bc41-47c7-b785-7fb9465062ca';
assert.equal(demoRestaurantImage({id:productId,image_urls:[]}),DEMO_RESTAURANT_PHOTOS[productId]);
assert.equal(demoRestaurantImage({id:productId,image_urls:['https://owned.example/product.jpg']}),
  'https://owned.example/product.jpg','real merchant photos always take priority');
for (const [path, piece] of [
  ['src/App.tsx', '/restaurants/demo'],
  ['src/pages/Index.tsx', '/restaurants/demo'],
  ['src/pages/MarketplaceStores.tsx', '/restaurants/demo'],
  ['src/pages/RestaurantDemo.tsx', 'RestaurantModifierPreview'],
  ['src/pages/RestaurantDemo.tsx', 'معاينة تجريبية فقط'],
  ['src/pages/RestaurantDemo.tsx', 'getMarketplaceStoreCatalog'],
]) assert.ok(fs.readFileSync(path,'utf8').includes(piece),path+' missing '+piece);
const demoPage = fs.readFileSync('src/pages/RestaurantDemo.tsx','utf8');
assert.ok(!demoPage.includes('placeMarketplaceOrder'));
assert.ok(!demoPage.includes('addToCart('));
console.log('PASS demo restaurant photo map, visible route, search categories, read-only add-on preview and no unverified checkout');
