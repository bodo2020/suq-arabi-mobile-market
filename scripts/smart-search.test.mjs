import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual production TypeScript with fully mocked catalog IO.
// No network, database credentials, GitHub Actions or vendor AI required.
function loadSource(relativePath, dependencies = {}) {
  const raw = readFileSync(new URL('../' + relativePath, import.meta.url), 'utf8');
  const js = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  const errors = (js.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, relativePath + ' transpiles cleanly');
  const mod = { exports: {} };
  runInNewContext(js.outputText, {
    exports: mod.exports, module: mod, console,
    require(name) {
      assert.ok(name in dependencies, 'Unexpected import: ' + name);
      return dependencies[name];
    },
  }, { filename: relativePath });
  return mod.exports;
}

const vocab = loadSource('src/lib/searchVocabulary.ts');
const arabic = loadSource('src/lib/arabicSearch.ts', {
  '@/lib/searchVocabulary': vocab,
});

const product = (id, name, type = 'direct') => ({
  id, name, quantity: 12, price: 25, offer_price: null,
  image_urls: [], search_rank: 100, search_match_type: type,
});

test('Egyptian search understands many two-way aliases and words inside phrases', () => {
  assert.ok(arabic.searchAlternates('حليب').includes('لبن'));
  assert.ok(arabic.searchAlternates('لبن').includes('حليب'));
  assert.ok(arabic.searchAlternates('تمر').includes('بلح'));
  assert.ok(arabic.searchAlternates('بلح').includes('تمر'));
  assert.ok(arabic.searchAlternates('لبن كامل الدسم').includes('حليب كامل الدسم'));
  assert.ok(arabic.searchAlternates('رز بسمتي').some(x => x.includes('ارز')));
  assert.ok(arabic.searchAlternates('معجون سنان').includes('معجون اسنان'));
  assert.ok(arabic.searchAlternates('تونه').includes('تونة') ||
    arabic.normalizeArabicSearch('تونه') === arabic.normalizeArabicSearch('تونة'));
  assert.ok(vocab.synonymGroups.length >= 100);
});

test('Close categories are not mistaken for the same product', () => {
  assert.ok(!arabic.searchAlternates('تونة').includes('سردين'));
  assert.ok(arabic.relatedSearches('تونة').includes('سردين'));
  assert.equal(arabic.relatedSearches('تونة بالزيت').length, 0);
  assert.ok(!arabic.searchAlternates('لبن').includes('زبادي'));
  assert.ok(!arabic.searchAlternates('بطاطس').includes('بطاطا'));
});

test('Direct matches beat real synonyms; synonyms beat related categories', () => {
  const q = 'حليب';
  assert.ok(arabic.relevanceScore(product('1', 'حليب كامل الدسم'), q) >
    arabic.relevanceScore(product('2', 'لبن كامل الدسم', 'synonym'), q));
  assert.ok(arabic.relevanceScore(product('2', 'لبن كامل الدسم', 'synonym'), q) >
    arabic.relevanceScore(product('3', 'زبادي', 'related'), q));
  assert.equal(arabic.relevanceScore({ ...product('4', 'غير مطابق'), barcode: '6220000000000' }, '6220000000000'), 1000);
});

test('Catalog searches include aliases even when five exact matches exist', async () => {
  const calls = [];
  const data = {
    'حليب': Array.from({ length: 5 }, (_, i) => product('h' + i, 'حليب ' + (i + 1))),
    'لبن': [product('l1', 'لبن بقري')],
    'تونة': [product('t1', 'تونة قطع')],
    'سردين': [product('s1', 'سردين معلب')],
  };
  const supabase = {
    rpc: async (name, args) => {
      assert.equal(name, 'search_customer_smart_catalog_v1');
      calls.push(args.p_search);
      return { data: data[args.p_search] || [], error: null };
    },
  };
  const catalog = loadSource('src/lib/searchCatalog.ts', {
    '@/lib/supabase': {
      supabase,
      getCurrentDeliveryBranchId: async () => 'branch-1',
      getBranchCatalog: async () => [],
    },
    '@/lib/arabicSearch': arabic,
  });
  const milk = await catalog.searchBranchProductsIncludingUnavailable('حليب', 25, true);
  assert.ok(milk.some(x => x.name === 'لبن بقري'));
  assert.ok(calls.includes('لبن'));
  assert.equal(milk.find(x => x.name === 'لبن بقري').price, 25);
  assert.equal(milk.find(x => x.name === 'لبن بقري').search_match_type, 'synonym');
  const tuna = await catalog.searchBranchProductsIncludingUnavailable('تونة', 25, true);
  assert.equal(tuna[0].name, 'تونة قطع');
  const sardines = tuna.find(x => x.name === 'سردين معلب');
  assert.ok(sardines);
  assert.equal(sardines.search_match_type, 'related');
});
