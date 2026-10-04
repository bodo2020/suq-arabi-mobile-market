import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/homeMerchandising.ts', import.meta.url), 'utf8');
const context = { exports: {}, Intl, Date, console };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { visibleHomeSections, buildHomeProductGroups, homePurchasedProducts, activeHomePurchase, homeDeliverySummary, homeLimit } = context.exports;
const product = (id, patch = {}) => ({ id, price: 30, quantity: 10, main_category_id: 'food', ...patch });
const section = (id, source = {}, patch = {}) => ({ id, section_type: 'featured_products', sort_order: 10, is_active: true, data_source: source, ...patch });
const plan = (sections, products, collections = [], ids = [], purchases = []) => buildHomeProductGroups(sections, products, collections, ids, purchases);
const ids = group => Array.from(group.products, p => p.id);

test('published empty/hidden pages never resurrect fallback promotions', () => {
  const fallback = [section('fallback')];
  assert.equal(visibleHomeSections({ sections: [] }, fallback).length, 0);
  assert.equal(visibleHomeSections({ sections: [section('hidden', {}, { is_active: false })] }, fallback).length, 0);
  assert.equal(visibleHomeSections(null, fallback)[0].id, 'fallback');
});
test('cached sections respect branch, schedule and Growth order, including offers titles', () => {
  const now = Date.parse('2026-10-04T10:00:00Z');
  const sections = [section('offer', {}, { title: 'عروض فلاش', sort_order: 30 }), section('first', {}, { sort_order: 5 }), section('wrong', {}, { branch_ids: ['b'] }), section('future', {}, { starts_at: '2026-10-05' }), section('expired', {}, { ends_at: '2026-10-04T10:00:00Z' })];
  assert.deepEqual(Array.from(visibleHomeSections({ sections }, [], 'a', now), s => s.id), ['first', 'offer']);
});
test('offers require a real current discount, not an is_offer flag', () => {
  const p = plan([section('offers', { mode: 'offers' })], [product('flag', { is_offer: true }), product('bad', { offer_price: 40 }), product('free', { offer_price: 0 }), product('deal', { offer_price: 20 }), product('empty', { offer_price: 20, quantity: 0 })]);
  assert.deepEqual(ids(p.get('offers')[0]), ['deal']);
});
test('manual product order and category targeting survive the renderer', () => {
  const p = plan([section('manual', { product_ids: ['c', 'b', 'a', 'b'], category_ids: ['food'] })], [product('a'), product('b', { main_category_id: 'cleaning' }), product('c')]);
  assert.deepEqual(ids(p.get('manual')[0]), ['c', 'a']);
});
test('deduplication follows Growth order across collections and general browsing', () => {
  const p = plan([section('collection', { collection_id: 'daily' }, { section_type: 'product_collection' }), section('browse')], [product('a'), product('b')], [{ id: 'daily', title: 'احتياجات يومية', products: ['a', 'a'] }]);
  assert.deepEqual(ids(p.get('collection')[0]), ['a']); assert.deepEqual(ids(p.get('browse')[0]), ['b']);
});
test('Growth can explicitly repeat a product for a campaign without changing other sections', () => {
  const p = plan([section('one'), section('campaign', {}, { display_config: { dedupe: false } })], [product('a')]);
  assert.deepEqual(ids(p.get('campaign')[0]), ['a']);
});
test('listings with the same product ID remain distinct purchasing identities', () => {
  const p = plan([section('all')], [product('a'), product('a', { marketplace_listing_id: 'listing' })]);
  assert.equal(p.get('all')[0].products.length, 2);
});
test('buy again uses completed purchases, current price/stock and exact identities', () => {
  const current = product('a', { price: 42 }), out = product('b', { quantity: 0 });
  const history = [{ id: '1', status: 'delivered', created_at: '2026-10-03', items: [{ product_id: 'a', price: 1 }, { product_id: 'b' }, { name: 'a' }] }, { id: '2', status: 'cancelled', created_at: '2026-10-04', items: [{ product_id: 'c' }] }];
  const result = homePurchasedProducts([current, out, product('c')], history);
  assert.equal(result.length, 1); assert.equal(result[0], current); assert.equal(result[0].price, 42);
});
test('marketplace repurchase cannot switch merchant or silently choose owned stock', () => {
  const catalog = [product('a'), product('a', { marketplace_listing_id: 'other', marketplace_branch_id: 'other' }), product('a', { marketplace_listing_id: 'match', marketplace_branch_id: 'right' })];
  const history = [{ status: 'delivered', created_at: '2026-10-03', items: [{ product_id: 'a', source_kind: 'marketplace', marketplace_listing_id: 'match' }] }];
  const result = homePurchasedProducts(catalog, history); assert.equal(result.length, 1); assert.equal(result[0].marketplace_listing_id, 'match');
});
test('explicit collection selection never falls back to every collection', () => {
  const p = plan([section('missing', {}, { section_type: 'product_collection' })], [product('a')], [{ id: 'daily', products: ['a'] }]);
  assert.equal(p.get('missing').length, 0);
});
test('recommendation fallback uses honest copy and explicit AI product IDs win', () => {
  const p = plan([section('smart', {}, { section_type: 'smart_recommendations' })], [product('a')]);
  assert.equal(p.get('smart')[0].personalized, false); assert.match(p.get('smart')[0].subtitle, /متاحة/);
  const manual = plan([section('smart', { product_ids: ['a'] }, { section_type: 'smart_recommendations' })], [product('a'), product('b')], [], ['b']);
  assert.deepEqual(ids(manual.get('smart')[0]), ['a']);
});
test('active order excludes store purchases, final and unknown statuses', () => {
  assert.equal(activeHomePurchase([{ id: 'current', source_channel: 'online', status: 'preparing', created_at: '2026-10-01' }, ...['delivered', 'cancelled', 'store_completed', 'unknown'].map(status => ({ id: status, source_channel: 'online', status, created_at: '2026-10-04' }))]).id, 'current');
});
test('delivery hours use Cairo time and handle overnight closing and zero fees', () => {
  const branch = { delivery_enabled: true, opens_at: '20:00:00', closes_at: '03:00:00', estimated_delivery_minutes: 25, delivery_fee: 0 };
  const open = homeDeliverySummary(branch, new Date('2026-10-03T22:00:00Z'));
  assert.equal(open.available, true); assert.equal(open.fee, 0); assert.equal(open.eta, '25 دقيقة تقريبًا');
  const closed = homeDeliverySummary(branch, new Date('2026-10-04T09:00:00Z')); assert.equal(closed.available, false); assert.equal(closed.eta, null);
  assert.equal(homeDeliverySummary({ ...branch, delivery_enabled: false }, new Date('2026-10-03T22:00:00Z')).eta, null);
});
test('invalid limits cannot break rendering and unavailable products need explicit opt-in', () => {
  for (const value of ['oops', 0, -2, Infinity]) assert.equal(homeLimit(value), 12);
  assert.equal(homeLimit(500), 24);
  assert.equal(plan([section('all', { include_unavailable: true })], [product('a', { quantity: 0 })]).get('all')[0].products.length, 1);
});
