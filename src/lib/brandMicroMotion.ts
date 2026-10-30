/** Shared, optional visual-only cues. Never dispatch motion for a rejected cart edit. */
export const BRAND_PRODUCT_ADDED_MOTION = 'super-marko:product-added-motion';

export type ProductAddedMotion = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  imageUrl: string;
};

/** Fly only towards a cart entry that is genuinely visible in the viewport. */
export function announceProductAdded(source: Element | null, imageUrl: string) {
  if (typeof window === 'undefined' || !source ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const origin = source.getBoundingClientRect();
  if (origin.width < 1 || origin.height < 1 ||
      origin.bottom < 0 || origin.top > window.innerHeight) return;

  const cartLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href="/cart"]'))
    .find(link => {
      const r = link.getBoundingClientRect();
      return r.width > 5 && r.height > 5 && r.bottom > 0 && r.top < window.innerHeight &&
        getComputedStyle(link).visibility !== 'hidden';
    });
  if (!cartLink) return; // Existing confirmation feedback still works without the flight.

  const target = cartLink.getBoundingClientRect();
  const detail: ProductAddedMotion = {
    x: origin.left + origin.width / 2,
    y: origin.top + origin.height / 2,
    targetX: target.left + target.width / 2,
    targetY: target.top + target.height / 2,
    imageUrl,
  };
  window.dispatchEvent(new CustomEvent<ProductAddedMotion>(BRAND_PRODUCT_ADDED_MOTION, { detail }));
}
