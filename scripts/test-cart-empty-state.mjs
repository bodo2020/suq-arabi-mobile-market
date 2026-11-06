import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const page = read('src/pages/Cart.tsx');
const empty = read('src/components/cart/CartEmptyState.tsx');
const css = read('src/components/cart/cart-empty-motion.css');
const mark = read('src/components/brand/BrandMark.tsx');
const checkout = read('src/components/layout/CheckoutLayout.tsx');
const routes = read('src/App.tsx');

assert.match(page, /import CartEmptyState from '@\/components\/cart\/CartEmptyState'/);
assert.match(page, /<CartEmptyState \/>/);
assert.match(page, /showSteps=\{!\(isInitialized && items\.length === 0\)\}/);
assert.match(page, /!isInitialized \? <div className="cart-loading"/);
assert.match(page, /: !items\.length \?/);
assert.match(page, /<CheckoutLayout/);
assert.match(page, /quoteCart\(items\)/);
assert.match(page, /const proceed = \(\) =>/);
assert.match(checkout, /showSteps = true/);

assert.match(empty, /<BrandMark variant="mark" motion="reveal"/);
assert.match(empty, /cart-empty-moth/);
assert.match(empty, /cart-empty-puffs/);
assert.match(mark, /M51\.9445 88\.3275C51\.9445 120\.208 111\.987 122\.865 111\.987 88\.3275/);
assert.match(empty, /aria-hidden="true"/);
assert.match(empty, /aria-labelledby="cart-empty-heading"/);
assert.match(empty, /<Link to="\/"/);
for (const path of ['/categories', '/offers']) {
  assert.ok(empty.includes(`to="${path}"`), `Missing ${path} shortcut`);
  assert.ok(routes.includes(`path="${path}"`), `Missing ${path} route`);
}
assert.match(css, /cart-empty-bag-mood 8s/);
assert.match(css, /cart-empty-moth-escape 8s/);
assert.match(css, /cart-empty-puff 8s/);
// Empty bag is sad: only the smile stroke is flipped into a frown, and the
// bag is never turned upside down (that would make the frown look like a smile).
assert.match(css, /\.cart-empty-bag \.brand-mark__stroke--4 \{[^}]*scaleY\(-1\)/);
assert.doesNotMatch(css, /rotate\((1[0-9]{2}|[2-9][0-9]{2})deg\)/, 'the sad bag must never flip over');
assert.match(empty, /cart-empty-tear/);
// Tapping the bag makes it hop.
assert.match(empty, /is-poked/);
assert.match(css, /cart-empty-poke 700ms/);
assert.match(css, /@media \(max-width: 480px\)/);
assert.match(css, /@media \(max-height: 660px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /\.brand-mark__stroke \{ stroke-dashoffset: 0 !important; opacity: 1 !important;/);
assert.match(css, /\.cart-empty-moth, \.cart-empty-puffs, \.cart-empty-tear \{ display: none !important;/);

console.log('PASS: sad empty bag (frown, breathe, moth, sigh + tear, tap hop), shopping navigation, empty-stepper handling, and reduced-motion fallback.');
