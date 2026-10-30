// Regression suite for customer search. Run: npm run test:search
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const source = read('src/lib/arabicSearch.ts');
const js = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const lib = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

assert.equal(lib.normalizeArabicSearch('أَرْز'), lib.normalizeArabicSearch('ارز'));
assert.equal(lib.normalizeArabicSearch('جهينة'), lib.normalizeArabicSearch('جهينه'));
assert.equal(lib.normalizeArabicSearch('١٠٠٠ مل'), '1000 مل');
assert.ok(lib.searchAlternates('حليب').includes('لبن'));
assert.ok(lib.searchAlternates('لبن جهينة').includes('حليب جهينه'));
assert.ok(lib.searchAlternates('بلح').includes('تمر'));
assert.deepEqual(lib.searchAlternates('6223001234567'), []);

const items = [
  { id: '1', name: 'بسكويت بالحليب', quantity: 8 },
  { id: '2', name: 'حليب جهينة كامل الدسم 1 لتر', quantity: 7 },
  { id: '3', name: 'حليب شركة أخرى 1 لتر', quantity: 40 },
];
const ranked = lib.rankSearchProducts(items, 'لبن جهينة لتر', ['حليب جهينه لتر']);
assert.equal(ranked[0].id, '2', 'A brand-and-size match must beat generic milk');
assert.equal(lib.relevanceScore({ id:'4', name:'منتج مختلف', barcode:'622222' }, '622222'), 300);

const catalog = read('src/lib/searchCatalog.ts');
const searchPage = read('src/pages/Search.tsx');
const sql = read('supabase/migrations/20261030040000_customer_search_synonyms_v2.sql');
assert.ok(catalog.includes('customer_search_expand_query_v2'), 'Queries must use the database vocabulary');
assert.ok(!catalog.includes('merged.size < 4'), 'Synonyms must not depend on result count');
assert.ok(searchPage.includes('searchBranchProductsIncludingUnavailable(draft, 8, true)'), 'Autocomplete must use aliases');
assert.ok(sql.includes('enable row level security'), 'Dictionary needs RLS');
assert.ok(sql.includes('customer_search_terms_v2_read'), 'Read-only terms need a policy');
assert.ok(sql.includes("('milk', ARRAY") && sql.includes("('dates', ARRAY"), 'Seed both milk and date aliases');
console.log('Customer search v2: normalization, synonyms, relevance and wiring passed.');
