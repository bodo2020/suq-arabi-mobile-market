import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transform } from 'esbuild';

// Compile just the pure ranking module: no network, live catalog or user data.
const source = readFileSync(new URL('../src/lib/recommendationEngineV2.ts', import.meta.url), 'utf8');
const compiled = await transform(source, { loader: 'ts', format: 'esm', target: 'es2020' });
const engine = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));

const product = (id, name, extra = {}) => ({
  id, name, quantity: 12, price: 30, offer_price: 0,
  main_category_id: 'grocery', subcategory_id: 'base',
  company_id: id, is_offer: false, image_urls: [],
  bulk_enabled: false, created_at: '2026-01-01T00:00:00Z',
  commerce_source: 'owned', delivery_branch_id: 'branch-a',
  ...extra,
});

test('Arabic milk/haleeb synonyms resolve to a common concept and distinct complements', () => {
  const milk = product('milk', 'حليب كامل الدسم', { subcategory_id: 'dairy' });
  const cereal = product('cereal', 'كورن فليكس', { subcategory_id: 'breakfast' });
  const biscuit = product('biscuit', 'بسكويت سادة', { subcategory_id: 'snacks' });
  const laban = product('laban', 'لبن خالي الدسم', { subcategory_id: 'dairy' });
  assert.equal(engine.classifyRecommendation(milk, cereal), 'complement');
  assert.equal(engine.classifyRecommendation(milk, biscuit), 'complement');
  assert.equal(engine.classifyRecommendation(milk, laban), 'similar');
  assert.ok(engine.recommendationKeywords(milk).length >= 1);
});

test('Pasta recommends sauce as a complement, not simply same-category items', () => {
  const pasta = product('pasta', 'مكرونة سباجيتي');
  const sauce = product('sauce', 'صلصة طماطم', { subcategory_id: 'condiments' });
  const alternate = product('alternate', 'مكرونة قلم');
  const ranked = engine.rankRecommendationCandidates(pasta, [alternate, sauce]);
  assert.equal(ranked[0].product.id, 'sauce');
  assert.equal(ranked[0].kind, 'complement');
  assert.equal(ranked[1].kind, 'similar');
});

test('Filters unavailable, free, unrelated branch, marketplace and cart products', () => {
  const base = product('base', 'شاي');
  const candidates = [
    product('good', 'سكر'),
    product('cart', 'بسكويت'),
    product('empty', 'سكر ابيض', { quantity: 0 }),
    product('free', 'سكر دايت', { price: 0 }),
    product('otherBranch', 'سكر بودرة', { delivery_branch_id: 'branch-b' }),
    product('partner', 'سكر بني', { commerce_source: 'marketplace', marketplace_branch_id: 'm1' }),
  ];
  const actual = engine.rankRecommendationCandidates(base, candidates, 8, { cartProductIds: ['cart'] });
  assert.deepEqual(actual.map(r => r.product.id), ['good']);
});

test('Partner suggestions never leak across marketplace branches or merchants', () => {
  const base = product('mp', 'شامبو', {
    commerce_source: 'marketplace', marketplace_branch_id: 'shop1', merchant_id: 'owner1',
  });
  const candidates = [
    product('good', 'بلسم', { commerce_source: 'marketplace', marketplace_branch_id: 'shop1', merchant_id: 'owner1' }),
    product('wrongshop', 'بلسم', { commerce_source: 'marketplace', marketplace_branch_id: 'shop2', merchant_id: 'owner1' }),
    product('wrongowner', 'بلسم', { commerce_source: 'marketplace', marketplace_branch_id: 'shop1', merchant_id: 'owner2' }),
    product('owned', 'بلسم'),
  ];
  assert.deepEqual(engine.rankRecommendationCandidates(base, candidates).map(r => r.product.id), ['good']);
});

test('Deduplicates names and IDs and clamps untrusted learned scores', () => {
  const base = product('tea', 'شاي');
  const one = product('a', 'بسكويت سادة');
  const duplicateName = product('b', 'بسكويت سادة');
  const sugar = product('sugar', 'سكر');
  const ranked = engine.rankRecommendationCandidates(base, [one, one, duplicateName, sugar], 16, {
    learnedScores: { a: 999999999, b: Number.NaN, sugar: -100 },
  });
  assert.equal(ranked.filter(r => r.product.name === 'بسكويت سادة').length, 1);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.every(r => Number.isFinite(r.score)));
  assert.deepEqual(engine.rankRecommendationCandidates(base, [sugar], 0), []);
});

test('Does not call a generative provider and requires source product for the UI', () => {
  const component = readFileSync(new URL('../src/components/product/ProductSuggestions.tsx', import.meta.url), 'utf8');
  assert.match(component, /rankRecommendationCandidates\(sourceProduct, products/);
  assert.match(component, /cartProductIds/);
  assert.match(component, /data-recommendation-kind/);
  assert.doesNotMatch(source, /fetch\(|functions\.invoke|generateContent/);
});

test('optional shared AI signals are OFF by default and are never required for catalog rendering', () => {
  const signals = readFileSync(new URL('../src/lib/productRecommendationSignals.ts', import.meta.url), 'utf8');
  const details = readFileSync(new URL('../src/pages/ProductDetail.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/components/product/ProductSuggestions.tsx', import.meta.url), 'utf8');
  assert.match(signals, /VITE_MARKO_COPURCHASE_V1 === 'true'/);
  assert.match(signals, /mode: 'customer_recommendations'/);
  assert.match(signals, /getCurrentDeliveryBranchId\(/);
  assert.match(signals, /product\.commerce_source === 'marketplace'/);
  assert.match(signals, /if \(error \|\| signal\?\.aborted/);
  assert.match(details, /fetchLearnedRecommendationScores\(product, controller\.signal\)/);
  assert.match(details, /learnedScores=\{learnedRecommendationScores\}/);
  assert.match(details, /getProductsByIds\(ids\)/);
  assert.match(details, /recommendationCandidates\.filter\(/);
  assert.match(ui, /rankRecommendationCandidates\(sourceProduct, products, 16, \{ cartProductIds, learnedScores \}\)/);
  assert.doesNotMatch(signals, /SERVICE_ROLE_KEY|\.from\('pos_invoices'\)|generateContent/);
});
