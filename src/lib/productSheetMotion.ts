export type ProductCardOrigin = {
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const visible = (rect: DOMRect): boolean =>
  rect.width > 25 && rect.height > 25 &&
  rect.bottom > 0 && rect.right > 0 &&
  rect.top < window.innerHeight && rect.left < window.innerWidth;

export function captureProductCardOrigin(element: HTMLElement, path: string): ProductCardOrigin | null {
  if (typeof window === 'undefined') return null;
  const card = element.closest<HTMLElement>('[data-product-card]') || element;
  const rect = card.getBoundingClientRect();
  if (!visible(rect)) return null;
  return { path, x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

export function readProductCardOrigin(state: unknown, path: string): ProductCardOrigin | null {
  if (!state || typeof state !== 'object') return null;
  const origin = (state as { productCardOrigin?: Partial<ProductCardOrigin> }).productCardOrigin;
  if (!origin || origin.path !== path) return null;
  if (![origin.x, origin.y, origin.width, origin.height].every(value => typeof value === 'number' && Number.isFinite(value))) return null;
  if (Number(origin.width) < 25 || Number(origin.height) < 25) return null;
  return origin as ProductCardOrigin;
}

/**
 * Prefer the actual background catalog item when it's visible. Its position
 * may change between open and close; never return a stale location for a
 * different product after swiping through the carousel.
 */
export function findCurrentProductCardOrigin(path: string, initial: ProductCardOrigin | null): ProductCardOrigin | null {
  if (typeof document === 'undefined') return null;
  const cards = document.querySelectorAll<HTMLElement>('[data-product-card]');
  for (const card of Array.from(cards)) {
    const link = card.querySelector<HTMLAnchorElement>('a[href^="/product/"]');
    if (link?.getAttribute('href') !== path) continue;
    const position = captureProductCardOrigin(card, path);
    if (position) return position;
  }
  return initial?.path === path ? initial : null;
}

export const prefersReducedProductMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * FLIP transform from/to a real product tile. Uses compositor transforms
 * only; no expensive width/height/position layout updates on each frame.
 * Any mobile WebView without WAAPI gets the caller's bottom-sheet fallback.
 */
export function animateProductCardSheet(
  sheet: HTMLElement,
  origin: ProductCardOrigin,
  mode: 'open' | 'close',
): Animation | null {
  if (typeof window === 'undefined' || typeof sheet.animate !== 'function' || prefersReducedProductMotion()) return null;
  // FLIP geometry is based on offsetLeft/offsetTop, so the compositor must
  // scale around that same top-left origin (not the browser's center default).
  sheet.style.transformOrigin = 'top left';
  const width = sheet.offsetWidth;
  const height = sheet.offsetHeight;
  if (width < 20 || height < 20) return null;
  const dx = origin.x - sheet.offsetLeft;
  const dy = origin.y - sheet.offsetTop;
  const sx = Math.max(.12, Math.min(1, origin.width / width));
  const sy = Math.max(.12, Math.min(1, origin.height / height));
  const tileTransform = `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`;
  const fullTransform = 'translate3d(0px, 0px, 0) scale(1)';
  // A downward drag is already changing the computed transform. Starting
  // from that exact visual position keeps closing free of a one-frame jump.
  const currentTransform = window.getComputedStyle(sheet).transform;
  const frames: Keyframe[] = mode === 'open'
    ? [
      { transform: tileTransform, borderRadius: '18px', opacity: .96 },
      { transform: fullTransform, borderRadius: '30px', opacity: 1 },
    ]
    : [
      { transform: currentTransform === 'none' ? fullTransform : currentTransform, borderRadius: '30px', opacity: 1 },
      { transform: tileTransform, borderRadius: '18px', opacity: .96 },
    ];
  return sheet.animate(frames, {
    duration: mode === 'open' ? 310 : 260,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'both',
  });
}
