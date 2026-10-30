import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const supplied = read('public/brand/super-marko-mark-on-green.svg');
const brand = read('src/components/brand/BrandMark.tsx');
const loader = read('src/components/ui/BrandLoader.tsx');
const css = read('src/components/ui/brand-loader.css');

assert.match(supplied, /viewBox="0 0 165 219"/);
const originalPaths = Array.from(supplied.matchAll(/<path d="([^"]+)"[^>]+stroke="([^"]+)"/g));
assert.equal(originalPaths.length, 5, 'The supplied white/yellow mark has exactly five paths');
assert.deepEqual(originalPaths.map(([, , color]) => color), ['#FFC120', 'white', '#FFC120', '#FFC120', 'white']);

assert.match(brand, /tone\?: 'default' \| 'onGreen'/);
assert.match(brand, /tone === 'onGreen' \? '\/brand\/super-marko-mark-on-green\.svg'/);
assert.match(brand, /filterId = `brand-on-green-shadow-/);
assert.match(brand, /tone === 'onGreen'\)/);
for (const [geometry] of originalPaths.map(([, path]) => [path])) {
  assert.ok(brand.includes(geometry), 'Animated loader must retain the exact uploaded SVG paths');
}
for (let index = 1; index <= 5; index++) {
  assert.match(brand, new RegExp(`brand-mark__stroke--${index}`));
}
assert.match(loader, /tone = 'default'/);
assert.match(loader, /tone=\{tone\}/);
assert.match(loader, /brand-loader--on-green/);
assert.match(css, /brand-refresh-trace 1850ms/);
assert.match(css, /brand-loader--on-green \.brand-loader__particle/);
assert.match(css, /prefers-reduced-motion: reduce/);

const greenCtas = {
  'src/pages/Cart.tsx': 2,
  'src/pages/PhoneLogin.tsx': 2,
  'src/pages/PhoneVerify.tsx': 2,
  'src/pages/Register.tsx': 1,
  'src/pages/UpdatePassword.tsx': 1,
  'src/pages/ChangePhone.tsx': 2,
  'src/pages/Address.tsx': 2,
  'src/pages/CombinedPayment.tsx': 1,
  'src/pages/MarketplacePayment.tsx': 1,
  'src/pages/Account.tsx': 1,
};
for (const [path, expected] of Object.entries(greenCtas)) {
  const count = (read(path).match(/<BrandLoader[^>]+tone="onGreen"/g) || []).length;
  assert.equal(count, expected, `${path}: unexpected green-background loader coverage`);
}

assert.match(read('src/pages/Cart.tsx'), /<div className="cart-loading"><BrandLoader size="lg" \/>/,
  'Regular loader must remain on light cart loading surface');

console.log('PASS: supplied SVG geometry, white/yellow colors, shared trace timing, green CTA coverage, and light surface fallback');
