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

{
  const { pickHomeSections, experimentBucket } = await import('../src/lib/catalogCdn.ts');
  const sections = [
    { id: 'plain', sort_order: 30 },
    { id: 'hero-a', sort_order: 10, experiment_key: 'hero', experiment_variant: 'A' },
    { id: 'hero-b', sort_order: 10, experiment_key: 'hero', experiment_variant: 'B' },
    { id: 'solo-b', sort_order: 20, experiment_key: 'solo', experiment_variant: 'B' },
    { id: 'later', sort_order: 5, starts_at: '2099-01-01T00:00:00Z' },
    { id: 'ended', sort_order: 6, ends_at: '2000-01-01T00:00:00Z' },
  ];
  const ids = seed => pickHomeSections(sections, seed).map(s => s.id);
  const seeds = Array.from({ length: 400 }, (_, i) => `visit-${i}-abcdefgh`);
  for (const seed of seeds) {
    const got = ids(seed);
    assert.equal(got.includes('hero-a') + got.includes('hero-b'), 1);      // exactly one hero variant
    assert.ok(got.includes('solo-b') && got.includes('plain'));            // single live variant shown to all
    assert.ok(!got.includes('later') && !got.includes('ended'));           // outside the time window
    assert.deepEqual(ids(seed), got);                                      // stable for the same visit
  }
  const a = seeds.filter(s => experimentBucket(s, 'hero') < 50).length;
  assert.ok(a > 160 && a < 240, `split ${a}/400`);                          // about half and half
  assert.deepEqual(ids(seeds[0]).slice(-1), ['plain']);                     // sorted by sort_order
  console.log('home sections: all checks passed');
}
