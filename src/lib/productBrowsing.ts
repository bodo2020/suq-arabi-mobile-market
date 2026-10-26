/**
 * Capture the nearest product list so horizontal swipes follow the shopper's current order.
 * All destination product data is re-fetched, never trusted from route state.
 */
export type ProductBrowseState = {
  productBrowse: { paths: string[]; returnTo: string };
};
const validPath = (path: string) => /^\/product\/[^/?#]+(?:\?[^#]*)?$/.test(path);

export function collectProductBrowseState(anchor: HTMLAnchorElement, fromPath: string): ProductBrowseState {
  const ownPath = anchor.getAttribute('href') || '';
  let node = anchor.closest('[data-product-card]')?.parentElement || null;
  let paths: string[] = [];
  while (node && !node.classList.contains('app-main-layout')) {
    const cards = Array.from(node.querySelectorAll<HTMLElement>('[data-product-card]'));
    if (cards.length > 1) {
      paths = cards.map(card =>
        card.querySelector<HTMLAnchorElement>('a[href^="/product/"]')?.getAttribute('href') || '',
      );
      break;
    }
    node = node.parentElement;
  }
  const distinct = [...new Set(paths.filter(validPath))];
  if (validPath(ownPath) && !distinct.includes(ownPath)) distinct.push(ownPath);
  return {
    productBrowse: {
      paths: distinct.slice(0, 250),
      returnTo: fromPath.startsWith('/') && !fromPath.startsWith('//') ? fromPath : '/',
    },
  };
}
export function readProductBrowseState(state: unknown): ProductBrowseState['productBrowse'] | null {
  if (!state || typeof state !== 'object' || !('productBrowse' in state)) return null;
  const raw = (state as { productBrowse?: unknown }).productBrowse;
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as { paths?: unknown; returnTo?: unknown };
  if (!Array.isArray(candidate.paths)) return null;
  const paths = candidate.paths.filter((path): path is string => typeof path === 'string' && validPath(path)).slice(0, 250);
  const returnTo = typeof candidate.returnTo === 'string' && candidate.returnTo.startsWith('/') && !candidate.returnTo.startsWith('//')
    ? candidate.returnTo : '/';
  return { paths, returnTo };
}
