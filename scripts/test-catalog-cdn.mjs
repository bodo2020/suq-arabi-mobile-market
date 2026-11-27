// node --experimental-strip-types scripts/test-catalog-cdn.mjs
import assert from 'node:assert/strict';
const calls = [];
let manifest = { version: 'v1', partners: false, pages: ['all', 'cat-a'], limits: { all: 1500, category: 1000 } };
let failPages = false;
globalThis.fetch = async url => {
  calls.push(String(url));
  if (String(url).endsWith('/manifest.json')) return { ok: true, json: async () => manifest };
  if (failPages) return { ok: false, status: 503, json: async () => null };
  const rows = Array.from({ length: 5 }, (_, i) => ({ id: `${String(url).split('/').pop()}-${i}` }));
  return { ok: true, json: async () => rows };
};
const { cdnCatalogPage } = await import('../src/lib/catalogCdn.ts');

assert.deepEqual((await cdnCatalogPage('b1', 'cat-a', 3)).map(r => r.id), ['cat-a.json-0', 'cat-a.json-1', 'cat-a.json-2']); // prefix of the page
assert.equal((await cdnCatalogPage('b1', null, 1500)).length, 5);       // all products
assert.equal(await cdnCatalogPage('b1', 'cat-b', 10), null);              // unpublished category -> API
assert.equal(await cdnCatalogPage('b1', 'cat-a', 1200), null);            // limit above the page cap -> API
await cdnCatalogPage('b1', 'cat-a', 10);
assert.equal(calls.filter(u => u.endsWith('/v1/cat-a.json')).length, 1); // a versioned page is downloaded once
assert.equal(calls.filter(u => u.endsWith('/manifest.json')).length, 1);  // manifest kept for a minute
failPages = true;
assert.equal(await cdnCatalogPage('b1', null, 10) !== null, true);         // cached page still served
assert.equal(await cdnCatalogPage('b2', 'cat-a', 10), null);              // page error on another branch -> API
manifest = { ...manifest, partners: true };
assert.equal(await cdnCatalogPage('b3', null, 10), null);                 // partner stores near the address -> API
console.log('catalog cdn: all checks passed');
