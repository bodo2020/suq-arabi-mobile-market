import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

function load(path, mocks = {}, globals = {}, suffix = '') {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
    .replaceAll('import.meta.env.VITE_NATIVE_PUSH_CONFIGURED', "'true'") + suffix;
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const context = { exports: {}, console, navigator: { onLine: true }, ...globals, require(name) {
    if (!(name in mocks)) throw new Error(`Unexpected dependency ${name}`);
    return mocks[name];
  } };
  vm.runInNewContext(code, context, { filename: path });
  return context.exports;
}
function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
function recovery(rpc, globals) { return load('src/lib/checkoutRecovery.ts', { '@/lib/supabase': { supabase: { rpc } } }, globals); }

test('committed checkout returns before price/stock or delivery revalidation', async () => {
  for (const kind of ['owned', 'marketplace', 'combined']) {
    const order = { id: 'attempt', total: 120 };
    const api = recovery(async (name, args) => {
      assert.equal(name, 'recover_customer_checkout_v1');
      assert.equal(args.p_kind, kind); assert.equal(args.p_request_id, 'attempt');
      return { data: { exists: true, order } };
    });
    assert.equal(await api.recoverOrPlace(kind, 'attempt', () => { throw new Error('Must not quote or place'); }), order);
  }
});
test('lost place response is reconciled to the committed order', async () => {
  let calls = 0;
  const order = { id: 'attempt' };
  const api = recovery(async () => ({ data: ++calls === 1 ? { exists: false } : { exists: true, order } }));
  assert.equal(await api.recoverOrPlace('marketplace', 'attempt', async () => { throw new Error('fetch failed'); }), order);
  assert.equal(calls, 2);
});
test('successful first submission places exactly once', async () => {
  let calls = 0;
  const api = recovery(async () => ({ data: { exists: false } }));
  await api.recoverOrPlace('owned', 'attempt', async () => { calls++; return { id: 'attempt' }; });
  assert.equal(calls, 1);
});
test('definite quote rejection is propagated only after absence was checked again', async () => {
  let calls = 0;
  const api = recovery(async () => { calls++; return { data: { exists: false } }; });
  await assert.rejects(api.recoverOrPlace('combined', 'attempt', async () => { throw new Error('QUOTE_CHANGED'); }), /QUOTE_CHANGED/);
  assert.equal(calls, 2);
});
test('unknown recovery never unlocks a new attempt, including after quote rejection', async () => {
  for (const failFirst of [true, false]) {
    let calls = 0, placements = 0;
    const api = recovery(async () => ++calls === 1 && !failFirst ? { data: { exists: false } } : { error: { message: 'network' } });
    await assert.rejects(api.recoverOrPlace('combined', 'attempt', async () => { placements++; throw new Error('QUOTE_CHANGED'); }), /CHECKOUT_RECOVERY_UNAVAILABLE/);
    assert.equal(placements, failFirst ? 0 : 1);
  }
});
test('offline checkout makes no network request', async () => {
  const api = recovery(() => { throw new Error('network called'); }, { navigator: { onLine: false } });
  await assert.rejects(api.recoverCheckout('owned', 'attempt'), /CHECKOUT_OFFLINE/);
});
test('all placement entry points return existing order before accessing address or quote', async () => {
  for (const [path, fn, kind] of [['checkout', 'placeOrder', 'owned'], ['marketplaceCheckout', 'placeMarketplaceOrder', 'marketplace'], ['combinedCheckout', 'placeCombinedOrder', 'combined']]) {
    const order = { id: 'attempt' };
    const api = recovery(async (_name, args) => { assert.equal(args.p_kind, kind); return { data: { exists: true, order } }; });
    const checkout = load(`src/lib/${path}.ts`, {
      '@/lib/checkoutRecovery': api, '@/lib/supabase': { supabase: { rpc() { throw new Error('Unexpected place'); }, from() { throw new Error('Unexpected address'); } } },
      '@/lib/storeRoadRoute': {}, '@/lib/multistoreRoadRoute': {}, '@/lib/substitutionPolicy': {}, '@/lib/checkout': {}, '@/lib/marketplaceCheckout': {},
    });
    assert.equal(await checkout[fn]({ requestId: 'attempt', groupId: 'attempt' }), order);
  }
});
test('saved marketplace items beyond the first catalogue page survive hydration', async () => {
  const requested = [];
  const api = load('src/contexts/cartSupabaseSync.ts', {
    react: {}, '@/integrations/supabase/client': {}, './cartTypes': {}, './UserContext': {}, '@/lib/customerPersistence': {}, '@/lib/supabase': {}, '@/lib/branchProductIds': {},
    '@/lib/marketplace': { async getMarketplaceProductsByIds(branch, ids) {
      requested.push([branch, [...ids]]);
      return [{ id: 'product-501', marketplace_listing_id: 'listing-501', quantity: 10 }];
    } },
  }, {}, '\nexport { hydrateRows };');
  const cart = await api.hydrateRows([{ product_id: 'product-501', quantity: 2, metadata: { source_kind: 'marketplace', branch_id: 'branch', listing_id: 'listing-501' } }]);
  assert.deepEqual(requested, [['branch', ['product-501']]]);
  assert.equal(cart.length, 1); assert.equal(cart[0].product.id, 'product-501'); assert.equal(cart[0].quantity, 2);
});
test('exact marketplace fetch deduplicates IDs and propagates failures', async () => {
  const calls = [];
  let fail = false;
  const api = load('src/lib/marketplace.ts', { '@/integrations/supabase/client': { supabase: { async rpc(name, args) {
    assert.equal(name, 'get_customer_marketplace_store_catalog_v2'); calls.push(args.p_product_id);
    return fail ? { error: new Error('network') } : { data: [{ product_id: args.p_product_id, listing_id: `listing-${args.p_product_id}` }] };
  } } }, '@/lib/branchRuntime': {} });
  assert.equal((await api.getMarketplaceProductsByIds('branch', ['501', '501', '502'])).length, 2);
  assert.deepEqual(calls, ['501', '502']);
  fail = true; await assert.rejects(api.getMarketplaceProductsByIds('branch', ['503']), /network/);
});
test('late order success preserves a cart changed after the request started', () => {
  let current = [{ product: { id: 'old' }, quantity: 1 }], stateIndex = 0, context;
  const react = { createContext: () => ({ Provider: 'provider' }), createElement: (_tag, props) => { context = props.value; }, useCallback: fn => fn,
    useState: () => stateIndex++ === 0 ? [current, update => { current = typeof update === 'function' ? update(current) : update; }] : [true, () => {}] };
  const api = load('src/contexts/CartProvider.tsx', { react: { ...react, default: react }, './cartTypes': {}, './cartSupabaseSync': { useCartSync: () => ({}) } });
  api.CartProvider({});
  current = [...current, { product: { id: 'new' }, quantity: 1 }];
  context.clearCartIfUnchanged(items => items.length === 1);
  assert.equal(current.length, 2);
  context.clearCartIfUnchanged(items => items.length === 2);
  assert.equal(current.length, 0);
});
function push(rpc, localStorage) {
  const listeners = {};
  const plugin = { async addListener(name, cb) { listeners[name] = cb; return { async remove() { delete listeners[name]; } }; }, async createChannel() {}, async checkPermissions() { return { receive: 'granted' }; }, async register() {} };
  const api = load('src/services/pushNotifications.ts', { '@capacitor/core': { Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true, getPlatform: () => 'android' }, registerPlugin: () => plugin }, '@/lib/supabase': { supabase: { rpc } } }, { localStorage, crypto: { randomUUID: () => 'device' }, window: { setTimeout } });
  return { api, listeners };
}
test('failed device detach retains the token for a safe sign-out retry', async () => {
  const local = storage(); local.setItem('elmadawy.push.token', 'token');
  let fail = true;
  const { api } = push(async () => ({ error: fail ? new Error('network') : null }), local);
  await assert.rejects(api.deactivateCurrentPushDevice(), /network/);
  assert.equal(local.getItem('elmadawy.push.token'), 'token');
  fail = false; await api.deactivateCurrentPushDevice(); assert.equal(local.getItem('elmadawy.push.token'), null);
});
test('logout waits for in-flight registration, detaches it, and ignores late token callbacks', async () => {
  const local = storage(), calls = [];
  let release;
  const inFlight = new Promise(resolve => { release = resolve; });
  const { api, listeners } = push(async name => { calls.push(name); if (name === 'register_push_device_v2') await inFlight; return {}; }, local);
  await api.initializeCustomerPushNotifications(); listeners.registration({ value: 'token' });
  await new Promise(resolve => setImmediate(resolve));
  const logout = api.deactivateCurrentPushDevice();
  listeners.registration({ value: 'late' });
  assert.deepEqual(calls, ['register_push_device_v2']);
  release(); await logout;
  assert.deepEqual(calls, ['register_push_device_v2', 'unregister_push_device_v2']);
  assert.equal(local.getItem('elmadawy.push.token'), null);
});
test('guest browsing is public while checkout and personal records remain protected', () => {
  const { isPublicCustomerPath } = load('src/lib/customerRoutes.ts');
  for (const path of ['/', '/cart', '/search', '/stores/a', '/product/a', '/category/a/products', '/category/a/subcategory/b', '/add-address', '/addresses']) assert.equal(isPublicCustomerPath(path), true, path);
  for (const path of ['/payment', '/combined-payment', '/marketplace-payment', '/orders', '/edit-account', '/vouchers', '/edit-address/a']) assert.equal(isPublicCustomerPath(path), false, path);
  const { safeReturnTo } = load('src/lib/onboarding.ts', { '@/integrations/supabase/client': {} });
  assert.equal(safeReturnTo('/combined-payment'), '/combined-payment'); assert.equal(safeReturnTo('/marketplace-payment'), '/marketplace-payment'); assert.equal(safeReturnTo('https://example.org'), '/');
});
test('offline hydration keeps public catalogue but excludes personal records and expired snapshots', () => {
  const local = storage(), cache = new Map();
  const client = { setQueryData: (key, data) => cache.set(JSON.stringify(key), data), getQueryData: key => cache.get(JSON.stringify(key)) };
  const api = load('src/lib/offlineCatalogCache.ts', {}, { localStorage: local });
  const key = 'elmadawy_public_catalog_cache_v1';
  local.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now(), queries: [{ queryKey: ['home-catalog-products', 'branch'], data: [{ id: 'a' }] }, { queryKey: ['customerData', 'user'], data: { phone: 'private' } }] }));
  api.hydrateOfflineCatalog(client); assert.equal(api.readOfflineQuery(['home-catalog-products', 'branch']).length, 1); assert.equal(cache.size, 1);
  cache.clear(); local.setItem(key, JSON.stringify({ version: 1, savedAt: Date.now() - 49 * 3600000, queries: [{ queryKey: ['categories'], data: [] }] }));
  api.hydrateOfflineCatalog(client); assert.equal(cache.size, 0); assert.equal(local.getItem(key), null);
});
test('Android release preparation is repeatable and requires an existing signing identity', () => {
  const dir = mkdtempSync(join(tmpdir(), 'customer-release-'));
  try {
    mkdirSync(join(dir, 'android/app'), { recursive: true }); writeFileSync(join(dir, 'android/app/build.gradle'), 'android {}\n');
    const script = resolve('scripts/prepare-play-release.mjs');
    execFileSync(process.execPath, [script], { cwd: dir }); execFileSync(process.execPath, [script], { cwd: dir });
    const gradle = readFileSync(join(dir, 'android/app/build.gradle'), 'utf8');
    assert.equal(gradle.split('// Super Marko release support').length - 1, 1);
    assert.match(gradle, /com.google.android.play:app-update:2.1.0/);
    assert.match(gradle, /throw new GradleException/); assert.match(gradle, /ANDROID_KEYSTORE_PATH/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
