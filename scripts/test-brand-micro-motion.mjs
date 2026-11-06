import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const motion = read('src/lib/brandMicroMotion.ts');
const feedback = read('src/components/brand/BrandCartFeedback.tsx');
const product = read('src/components/ui/ProductCard.tsx');
const favorite = read('src/components/ui/FavoriteButton.tsx');
const css = read('src/styles/brand-micro-motion.css');
const app = read('src/App.tsx');
const cart = read('src/pages/Cart.tsx');
const search = read('src/pages/Search.tsx');
const timeline = read('src/components/orders/OrderTimeline.tsx');
const success = read('src/pages/OrderSuccess.tsx');
const favoritesPage = read('src/pages/Favorites.tsx');
const account = read('src/pages/Account.tsx');
const categories = read('src/components/ui/CategoryItem.tsx');

// A product "flies" only after cart mutation reports actual success.
assert.match(product, /const result = addToCart\(/);
assert.match(product, /if \(result === 'added'\) announceProductAdded/g);
assert.match(motion, /prefers-reduced-motion: reduce/);
assert.match(motion, /querySelectorAll<HTMLAnchorElement>\('a\[href="\/cart"\]'\)/);
assert.match(motion, /if \(!cartLink\) return/);
assert.match(motion, /dispatchEvent\(new CustomEvent<ProductAddedMotion>/);
assert.match(feedback, /BRAND_CART_ADDED_EVENT/);
assert.match(feedback, /BRAND_PRODUCT_ADDED_MOTION/);
assert.match(feedback, /className="brand-product-flight"/);
assert.match(feedback, /<BrandMark variant="badge" motion="pop"/);

// Favorite feedback does not replace auth checks or persisted mutation.
assert.match(favorite, /if \(!user\)/);
assert.match(favorite, /if \(!favoritesLoaded\)/);
assert.match(favorite, /void toggleFavorite\(productId, variantId\)/);
assert.match(favorite, /brand-favorite-heart--burst/);
assert.match(favorite, /brand-favorite-sparks/);

// Counters and reward values always come from existing state/server data.
assert.match(product, /key=\{item.quantity\}/);
assert.match(product, /brand-card-counter/);
assert.match(cart, /key=\{item.quantity\} className="brand-quantity-pop"/);
assert.match(cart, /quoteCart\(items\)/);
assert.match(account, /key=\{Number\(loyalty.data.points_balance/);
assert.match(account, /key=\{Number\(loyalty.data.redeemable_credit_egp/);

// Search, orders, category entrances and success must stay lightweight.
assert.match(search, /brand-search-suggestion-enter/);
assert.match(search, /brand-search-results-enter/);
assert.match(timeline, /brand-order-step--current/);
assert.match(timeline, /const current = statusIndex === index/);
assert.match(success, /<OrderCelebration onDone=\{finishCelebration\} \/>/);
assert.match(success, /prefers-reduced-motion: reduce/);
assert.match(success, /order-celebrated:/);
assert.match(categories, /brand-category-enter/);
assert.match(favoritesPage, /brand-favorites-empty__art/);
assert.match(favoritesPage, /<BrandMark variant="mark" motion="reveal"/);

// All entrance animations are opt-out and never block click/scroll.
for (const className of [
 'brand-product-flight', 'brand-quantity-pop', 'brand-card-counter',
 'brand-favorite-heart--burst', 'brand-favorite-sparks',
 'brand-search-suggestion-enter', 'brand-search-results-enter',
 'brand-order-step--current', 'brand-success-celebration',
 'brand-favorites-empty__heart', 'brand-category-enter',
]) assert.ok(css.includes(className), `Missing motion CSS: ${className}`);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /\.brand-product-flight \{ display: none !important; \}/);
assert.match(css, /pointer-events: none/);
assert.match(app, /import '@\/styles\/brand-micro-motion.css';/);

console.log('PASS: product-to-cart, favorites, cart quantity, search, rewards, categories, order tracking/success, reduced motion.');
