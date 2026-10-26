/**
 * A light, untrusted presentation snapshot of a visible product rail. Product
 * details, checkout prices and availability are always re-fetched by the route.
 */
export type ProductPreview = { path: string; name: string; image: string; price: string };
export type ProductBrowse = {
  paths: string[];
  returnTo: string;
  previews: ProductPreview[];
  nextCategory?: { path: string; name: string };
};
export type ProductBrowseState = { productBrowse: ProductBrowse };

const validPath = (path: string) => /^\/product\/[^/?#]+(?:\?[^#]*)?$/.test(path);
const validCategoryPath = (path: string) => /^\/category\/[^/?#]+(?:\/subcategory\/[^/?#]+)?$/.test(path);
const safeImage = (url: string) => url.startsWith('/') && !url.startsWith('//') || /^https?:\/\//i.test(url);

const previewFromCard = (card: HTMLElement): ProductPreview | null => {
  const path = card.querySelector<HTMLAnchorElement>('a[href^="/product/"]')?.getAttribute('href') || '';
  if (!validPath(path)) return null;
  const name = (card.dataset.productName || '').slice(0, 120);
  const image = (card.dataset.productImage || '').slice(0, 1000);
  const price = (card.dataset.productPrice || '').slice(0, 40);
  return { path, name, image: safeImage(image) ? image : '', price };
};

export function collectProductBrowseState(anchor: HTMLAnchorElement, fromPath: string): ProductBrowseState {
  // Category detail should traverse all its ordered subcategory sections rather
  // than stopping at the end of a single product grid.
  const journey = anchor.closest<HTMLElement>('[data-category-product-sections]');
  const continuous = anchor.closest<HTMLElement>('[data-continuous-category-journey]');
  const source = continuous || journey;
  let allCards: HTMLElement[] = source
    ? Array.from(source.querySelectorAll<HTMLElement>('[data-product-card]'))
    : [];
  if (!allCards.length) {
    let node = anchor.closest('[data-product-card]')?.parentElement || null;
    while (node && !node.classList.contains('app-main-layout')) {
      const found = Array.from(node.querySelectorAll<HTMLElement>('[data-product-card]'));
      if (found.length > 1) { allCards = found; break; }
      node = node.parentElement;
    }
  }
  // Keep a centered window around the clicked item. The previous "first 250"
  // cap broke neighbor swipes when a shopper opened a late catalog product.
  const activeCard = anchor.closest<HTMLElement>('[data-product-card]');
  const currentIndex = activeCard ? allCards.indexOf(activeCard) : -1;
  const start = allCards.length > 250 && currentIndex >= 0
    ? Math.max(0, Math.min(currentIndex - 120, allCards.length - 250))
    : 0;
  const cards = allCards.slice(start, start + 250);
  const distinct = new Map<string, ProductPreview>();
  cards.map(previewFromCard).forEach(preview => {
    if (preview && !distinct.has(preview.path)) distinct.set(preview.path, preview);
  });
  const ownPath = anchor.getAttribute('href') || '';
  if (validPath(ownPath) && !distinct.has(ownPath)) {
    const card = anchor.closest<HTMLElement>('[data-product-card]');
    distinct.set(ownPath, card ? previewFromCard(card) || { path: ownPath, name: '', image: '', price: '' } : { path: ownPath, name: '', image: '', price: '' });
  }
  // A continuous journey can contain other already-rendered main categories.
  // Only provide a route fallback when this is truly the last visible product.
  const hasFollowingLoaded = currentIndex >= 0 && currentIndex < allCards.length - 1;
  const truncated = allCards.length > 250;
  const previews = Array.from(distinct.values()).slice(0, 250);
  const path = journey?.dataset.nextCategoryPath || '';
  // Never treat the 250-item route-state cap as the end of a longer category.
  const nextCategory = !hasFollowingLoaded && !truncated && validCategoryPath(path)
    ? { path, name: (journey?.dataset.nextCategoryName || 'القسم التالي').slice(0, 100) }
    : undefined;
  return {
    productBrowse: {
      paths: previews.map(preview => preview.path),
      previews,
      returnTo: fromPath.startsWith('/') && !fromPath.startsWith('//') ? fromPath : '/',
      ...(nextCategory ? { nextCategory } : {}),
    },
  };
}

export function readProductBrowseState(state: unknown): ProductBrowse | null {
  if (!state || typeof state !== 'object' || !('productBrowse' in state)) return null;
  const raw = (state as { productBrowse?: unknown }).productBrowse;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { paths?: unknown; returnTo?: unknown; previews?: unknown; nextCategory?: unknown };
  if (!Array.isArray(candidate.paths)) return null;
  const paths = [...new Set(candidate.paths.filter((path): path is string => typeof path === 'string' && validPath(path)))].slice(0, 250);
  const returnTo = typeof candidate.returnTo === 'string' && candidate.returnTo.startsWith('/') && !candidate.returnTo.startsWith('//')
    ? candidate.returnTo : '/';
  const previews = Array.isArray(candidate.previews) ? candidate.previews.filter((value): value is ProductPreview => {
    if (!value || typeof value !== 'object') return false;
    const p = value as Partial<ProductPreview>;
    return typeof p.path === 'string' && paths.includes(p.path) &&
      typeof p.name === 'string' && typeof p.image === 'string' && typeof p.price === 'string';
  }).slice(0, 250).map(p => ({
    path: p.path, name: p.name.slice(0, 120),
    image: safeImage(p.image) ? p.image.slice(0, 1000) : '', price: p.price.slice(0, 40),
  })) : [];
  const rawCategory = candidate.nextCategory;
  const nextCategory = rawCategory && typeof rawCategory === 'object'
    && typeof (rawCategory as { path?: unknown }).path === 'string'
    && validCategoryPath((rawCategory as { path: string }).path)
    ? {
      path: (rawCategory as { path: string }).path,
      name: String((rawCategory as { name?: string }).name || 'القسم التالي').slice(0, 100),
    }
    : undefined;
  return { paths, previews, returnTo, ...(nextCategory ? { nextCategory } : {}) };
}
