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
 * Prioritize previous and next before the user swipes. Second neighbors can be
 * prepared once the first pair has started; don't download entire categories.
 */
export function prepareProductBrowseImages(
  previews: ProductPreview[],
  paths: string[],
  activeIndex: number,
): void {
  if (activeIndex < 0) return;
  const imagesByPath = new Map(previews.map(preview => [preview.path, preview.image]));
  const near = [activeIndex - 1, activeIndex + 1];
  const far = [activeIndex - 2, activeIndex + 2];
  const prepare = (index: number) => {
    const path = paths[index];
    const src = path ? imagesByPath.get(path) : undefined;
    if (src) void prepareProductImage(src);
  };
  near.forEach(prepare);
  // Don't make large batches of speculative requests on a metered connection.
  const connection = (typeof navigator !== 'undefined'
    ? (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    : undefined);
  if (!connection?.saveData) far.forEach(prepare);
}
