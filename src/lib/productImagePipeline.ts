import { productCardImage } from '@/lib/productCardImage';
import type { ProductPreview } from '@/lib/productBrowsing';

/**
 * Image-ready cache shared by the catalog and three-card product carousel.
 * An Image.src assignment alone starts a request, but does not make that image
 * decoded/ready for an animation. Keep a bounded number of successfully
 * decoded HTMLImageElement instances alive to avoid re-decoding on every swipe.
 */
type ImageEntry = { element: HTMLImageElement; promise: Promise<boolean>; ready: boolean };
const entries = new Map<string, ImageEntry>();
const MAX_PREPARED_IMAGES = 24;
const failedAt = new Map<string, number>();
const FAILED_RETRY_MS = 2 * 60_000;

const trimEntries = () => {
  while (entries.size > MAX_PREPARED_IMAGES) {
    const oldest = entries.keys().next().value;
    if (!oldest) break;
    entries.delete(oldest);
  }
};

export const isProductImageReady = (source: string): boolean =>
  Boolean(source && (entries.get(productCardImage(source))?.ready || entries.get(source)?.ready));

function decodeImage(url: string): Promise<boolean> {
  if (typeof Image === 'undefined' || !url) return Promise.resolve(false);
  const previousFailure = failedAt.get(url);
  if (previousFailure && Date.now() - previousFailure < FAILED_RETRY_MS) return Promise.resolve(false);
  failedAt.delete(url);
  const existing = entries.get(url);
  if (existing) {
    entries.delete(url);
    entries.set(url, existing);
    return existing.promise;
  }
  const image = new Image();
  image.decoding = 'async';
  const entry: ImageEntry = { element: image, ready: false, promise: Promise.resolve(false) };
  entry.promise = new Promise<boolean>(resolve => {
    const markReady = () => {
      if (typeof image.decode === 'function') {
        void image.decode().then(() => {
          entry.ready = true;
          resolve(true);
        }).catch(() => {
          // A successfully loaded image may still be displayable on older WebViews.
          entry.ready = Boolean(image.complete && image.naturalWidth > 0);
          resolve(entry.ready);
        });
      } else {
        entry.ready = Boolean(image.complete && image.naturalWidth > 0);
        resolve(entry.ready);
      }
    };
    image.onload = markReady;
    image.onerror = () => {
      entries.delete(url);
      failedAt.set(url, Date.now());
      while (failedAt.size > MAX_PREPARED_IMAGES) {
        const oldest = failedAt.keys().next().value;
        if (!oldest) break;
        failedAt.delete(oldest);
      }
      resolve(false);
    };
    image.src = url;
    if (image.complete && image.naturalWidth > 0) markReady();
  });
  entries.set(url, entry);
  trimEntries();
  return entry.promise;
}

/** Resolve a ready thumbnail, falling back to the original if the generated
 * 320px sibling does not exist (some marketplace images have no sibling). */
export const prepareFullProductImage = (source: string): Promise<boolean> => decodeImage(source);

export async function prepareProductImage(source: string): Promise<boolean> {
  if (!source) return false;
  const thumb = productCardImage(source);
  if (await decodeImage(thumb)) return true;
  return thumb !== source ? decodeImage(source) : false;
}

/**
 * Warm the immediate neighbors first. Cancel speculative batches from an old
 * swipe so a rapid series does not download every product in the rail.
 */
let browsePrepareGeneration = 0;
let browsePrepareTimers: ReturnType<typeof setTimeout>[] = [];
export function prepareProductBrowseImages(
  previews: ProductPreview[],
  paths: string[],
  activeIndex: number,
): void {
  browsePrepareGeneration += 1;
  browsePrepareTimers.forEach(clearTimeout);
  browsePrepareTimers = [];
  if (activeIndex < 0) return;
  const currentGeneration = browsePrepareGeneration;
  const imagesByPath = new Map(previews.map(preview => [preview.path, preview.image]));
  const prepare = (index: number) => {
    if (currentGeneration !== browsePrepareGeneration) return;
    const path = paths[index];
    const src = path ? imagesByPath.get(path) : undefined;
    if (src) void prepareProductImage(src);
  };
  // Decode both directions now, rather than waiting for the next gesture.
  [activeIndex - 1, activeIndex + 1].forEach(prepare);
  const schedule = (indexes: number[], delay: number) => {
    browsePrepareTimers.push(setTimeout(() => {
      if (currentGeneration === browsePrepareGeneration) indexes.forEach(prepare);
    }, delay));
  };
  const connection = (typeof navigator !== 'undefined'
    ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    : undefined);
  schedule([activeIndex - 2, activeIndex + 2], 120);
  if (!connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g') {
    schedule([activeIndex - 3, activeIndex + 3, activeIndex - 4, activeIndex + 4], 450);
  }
}

/**
 * A single IntersectionObserver handles every catalog card: only images in
 * (or just around) the viewport are decoded ahead of the user's next tap.
 * This avoids spawning a separate observer or preloading an entire category.
 */
const observedCardImages = new WeakMap<Element, string>();
let cardImageObserver: IntersectionObserver | null = null;

export function observeProductCardImage(card: Element, source: string): () => void {
  if (!source || typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return () => {};
  }
  if (!cardImageObserver) {
    cardImageObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const image = observedCardImages.get(entry.target);
        if (image) void prepareProductImage(image);
        cardImageObserver?.unobserve(entry.target);
        observedCardImages.delete(entry.target);
      }
    }, { rootMargin: '250px 0px', threshold: 0 });
  }
  observedCardImages.set(card, source);
  cardImageObserver.observe(card);
  return () => {
    cardImageObserver?.unobserve(card);
    observedCardImages.delete(card);
  };
}
