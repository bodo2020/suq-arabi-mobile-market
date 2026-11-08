import { getBranchCatalog } from '@/lib/supabase';
import { productCardImage } from '@/lib/productCardImage';
import { storeImageForLater } from '@/lib/imageDiskCache';

/**
 * Background preloading of product card thumbnails, so cards show instantly
 * even the first time. Kept deliberately small to protect the storage
 * download allowance:
 *  - Wi-Fi only (never mobile data or data-saver), app in the foreground
 *  - at most once every 24 h per phone
 *  - card thumbnails only (~11 KB), skipping what is already saved, so after
 *    the first run only new products are downloaded
 *  - two at a time, stops when the app is hidden or leaves Wi-Fi
 */

const LAST_RUN_KEY = 'sm-image-prefetch-at';
const EVERY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_RUN = 1500;
const PARALLEL = 2;

type Connection = { type?: string; saveData?: boolean };
const connection = () =>
  (typeof navigator !== 'undefined' ? (navigator as Navigator & { connection?: Connection }).connection : undefined);

/** Only a known Wi-Fi/ethernet connection counts; unknown means no. */
const onWifi = () => {
  const c = connection();
  return Boolean(navigator.onLine && c && !c.saveData && (c.type === 'wifi' || c.type === 'ethernet'));
};
const canContinue = () => onWifi() && document.visibilityState === 'visible';

let running = false;

export async function prefetchProductImages(): Promise<{ saved: number; had: number; skipped: number } | null> {
  if (running || typeof window === 'undefined' || !canContinue()) return null;
  try {
    const last = Number(localStorage.getItem(LAST_RUN_KEY) || 0);
    if (Date.now() - last < EVERY_MS) return null;
  } catch { /* no storage: still fine to run once */ }

  running = true;
  const result = { saved: 0, had: 0, skipped: 0 };
  try {
    // The shared server copy of the branch catalog (cheap for the database).
    const products = await getBranchCatalog({ limit: MAX_PER_RUN });
    const urls = [...new Set(products
      .map(product => product.image_urls?.[0])
      .filter((url): url is string => Boolean(url))
      .map(url => productCardImage(url)))].slice(0, MAX_PER_RUN);

    let next = 0;
    const worker = async () => {
      while (next < urls.length && canContinue()) {
        const outcome = await storeImageForLater(urls[next++]);
        result[outcome] += 1;
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    // Only a completed pass counts as today's run; an interrupted one resumes later.
    if (next >= urls.length) {
      try { localStorage.setItem(LAST_RUN_KEY, String(Date.now())); } catch { /* optional */ }
    }
    return result;
  } catch {
    return null;
  } finally {
    running = false;
  }
}

/** Start a little after launch, and again when the app comes back to the front. */
export function scheduleImagePrefetch(delayMs = 20_000) {
  if (typeof window === 'undefined') return;
  const kick = () => window.setTimeout(() => { void prefetchProductImages(); }, delayMs);
  kick();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick();
  });
}
