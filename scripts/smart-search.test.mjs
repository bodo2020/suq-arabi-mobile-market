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
      if (name === 'customer_search_expand_query_v2') {
        calls.push('db-synonyms:' + args.p_search);
        return { data: args.p_search === 'حليب'
          ? [{ alternative: 'لبن' }] : [], error: null };
      }
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
  assert.ok(calls.includes('db-synonyms:حليب'), 'Read DB aliases on every full search');
  assert.equal(milk.find(x => x.name === 'لبن بقري').price, 25);
  assert.equal(milk.find(x => x.name === 'لبن بقري').search_match_type, 'synonym');
  const tuna = await catalog.searchBranchProductsIncludingUnavailable('تونة', 25, true);
  assert.equal(tuna[0].name, 'تونة قطع');
  assert.ok(!tuna.some(x => x.name === 'سردين معلب'),
    'Related but different categories must not appear as search hits');
});

test('Rice search respects whole words and finds أرز through the two-letter alias', async () => {
  const calls = [];
  const rows = {
    'رز': [
      product('wrong1', 'سنيكرز شوكولاتة'),
      product('wrong2', 'كرزبي مقرمش'),
      product('rice1', 'رز مصري'),
    ],
    'ارز': [
      product('rice2', 'أرز بسمتي 1 كيلو'),
      product('rice3', 'خلطة الأرز البسمتي'),
      product('wrong3', 'ملتيزرز شوكولاتة'),
    ],
    'مكرونة': [product('unrelated', 'مكرونة اسباجتي')],
  };
  const supabase = {
    rpc: async (name, args) => {
      if (name === 'customer_search_expand_query_v2') return { data: [], error: null };
      calls.push(args.p_search);
      return { data: rows[args.p_search] || [], error: null };
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
  assert.equal(arabic.matchesSearchWords(product('w', 'سنيكرز شوكولاتة'), 'رز'), false);
  assert.equal(arabic.matchesSearchWords(product('r', 'أرز بسمتي'), 'ارز'), true);
  const results = await catalog.searchBranchProductsIncludingUnavailable('رز', 30, true);
  assert.deepEqual(Array.from(results, row => row.name), [
    'رز مصري', 'أرز بسمتي 1 كيلو', 'خلطة الأرز البسمتي',
  ]);
  assert.ok(calls.includes('ارز'), 'The 2-letter rice query must search its 3-letter alias');
  assert.ok(!calls.includes('مكرونة'), 'Related categories are not product equivalents');
  const full = await catalog.searchBranchProductsIncludingUnavailable('ارز', 30, true);
  assert.ok(full.some(row => row.name === 'رز مصري'));
  assert.ok(!full.some(row => row.name === 'سنيكرز شوكولاتة'));
});
