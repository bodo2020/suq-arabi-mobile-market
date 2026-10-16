import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_SEARCH_SYNONYMS,
  buildProductSearchQueries,
  normalizeProductSearchText,
  rankProductSearchResults,
} from '../src/lib/smartProductSearch.ts';

test('Arabic spelling variants include haa and taa marbuta', () => {
  assert.ok(buildProductSearchQueries('جبنه').includes('جبنة'));
  assert.ok(buildProductSearchQueries('جبنة').includes('جبنه'));
  assert.equal(normalizeProductSearchText('جُبْنَة'), normalizeProductSearchText('جبنه'));
});

test('common grocery synonyms work in both directions and inside phrases', () => {
  for (const group of PRODUCT_SEARCH_SYNONYMS) {
    assert.ok(buildProductSearchQueries(group[0]).includes(group[1]), `${group[0]} should find ${group[1]}`);
    assert.ok(buildProductSearchQueries(group[1]).includes(group[0]), `${group[1]} should find ${group[0]}`);
  }
  for (const [first, second] of [
    ['اندومي', 'نودلز'],
    ['لبن', 'حليب'],
    ['فراخ', 'دجاج'],
    ['رز', 'أرز'],
    ['بسكوت', 'بسكويت'],
    ['شيبسي', 'شيبس'],
    ['مناديل', 'كلينكس'],
  ]) {
    assert.ok(buildProductSearchQueries(first).includes(second), `${first} should find ${second}`);
    assert.ok(buildProductSearchQueries(second).includes(first), `${second} should find ${first}`);
  }
  assert.ok(buildProductSearchQueries('لبن كامل').includes('حليب كامل'));
  assert.ok(buildProductSearchQueries('اللبن').includes('حليب'));
  assert.ok(buildProductSearchQueries('اندومي فراخ').includes('نودلز فراخ'));
  assert.ok(buildProductSearchQueries('اندومي فراخ').includes('نودلز دجاج'));
});

test('Arabic alef variants work without a synonym entry', () => {
  assert.ok(buildProductSearchQueries('اكواب').includes('أكواب'));
  assert.ok(buildProductSearchQueries('أكواب').includes('اكواب'));
  assert.ok(buildProductSearchQueries('بطاطس').every(term => !term.includes('بطاطا')));
});

test('direct matches outrank alias-only matches without dropping either', () => {
  const query = 'اندومي';
  const variants = buildProductSearchQueries(query);
  const results = rankProductSearchResults([
    { id: 'noodles', name: 'نودلز فراخ' },
    { id: 'indomie', name: 'اندومي خضار' },
  ], query, variants);
  assert.deepEqual(results.map(result => result.id), ['indomie', 'noodles']);
});
