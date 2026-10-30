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
assert.match(empty, /cart-empty-bag__plus/);
assert.match(empty, /viewBox="0 0 121 161"/);
assert.match(mark, /M38\.3335 63\.8893C38\.3335 87\.2226 82\.2782 89\.1671 82\.2782 63\.8893/);
assert.match(empty, /cart-empty-plus-line--horizontal/);
assert.match(empty, /cart-empty-plus-line--vertical/);
assert.match(empty, /aria-hidden="true"/);
assert.match(empty, /aria-labelledby="cart-empty-heading"/);
assert.match(empty, /<Link to="\/"/);
for (const path of ['/categories', '/offers']) {
  assert.ok(empty.includes(`to="${path}"`), `Missing ${path} shortcut`);
  assert.ok(routes.includes(`path="${path}"`), `Missing ${path} route`);
}
assert.match(css, /cart-empty-smile-to-plus 6\.4s/);
assert.match(css, /cart-empty-plus-draw 6\.4s/);
assert.match(css, /cart-empty-bag-bob 6\.4s/);
assert.match(css, /\.brand-mark__stroke--4/);
assert.match(css, /@media \(max-width: 480px\)/);
assert.match(css, /@media \(max-height: 660px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /\.brand-mark__stroke \{ stroke-dashoffset: 0 !important; opacity: 1 !important;/);
assert.match(css, /\.cart-empty-bag__plus \{ display: none !important;/);

console.log('PASS: animated empty-cart brand, plus conversion, shopping navigation, empty-stepper handling, and reduced-motion fallback.');
