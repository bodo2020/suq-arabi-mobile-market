import { useEffect, useState } from 'react';

/**
 * Product/banner images kept on the phone (Cache Storage), so a card that was
 * seen once shows instantly afterwards, with no download and with no internet.
 * The WebView's own HTTP cache is small and evicts on its own; this one is
 * ours and is capped by number of images (oldest dropped first).
 *
 * Flow: look in the phone cache first; if missing, show the network image as
 * before and, once it has loaded, save a copy in the background.
 */

const CACHE_NAME = 'sm-images-v1';
/** ~4000 card thumbnails ≈ 50-70 MB. */
const MAX_IMAGES = 4000;
const STORAGE_ORIGIN = 'https://qzvpayjaadbmpayeglon.supabase.co';
/** Object URLs kept alive for on-screen images. */
const MAX_LIVE_URLS = 500;

const supported = typeof window !== 'undefined' && 'caches' in window && window.isSecureContext;
let cachePromise: Promise<Cache> | null = null;
const openCache = () => (cachePromise ||= caches.open(CACHE_NAME));

export const isDiskCacheable = (url: string | null | undefined): url is string =>
  supported && typeof url === 'string' && url.startsWith(`${STORAGE_ORIGIN}/storage/v1/object/public/`);

// url -> object URL of the saved copy (LRU, revoked when evicted).
const liveUrls = new Map<string, string>();
const lookups = new Map<string, Promise<string | null>>();

function rememberLive(url: string, objectUrl: string) {
  liveUrls.delete(url);
  liveUrls.set(url, objectUrl);
  while (liveUrls.size > MAX_LIVE_URLS) {
    const [oldUrl, oldObject] = liveUrls.entries().next().value as [string, string];
    liveUrls.delete(oldUrl);
    URL.revokeObjectURL(oldObject);
  }
}

/** The saved copy as an object URL, or null when it is not on the phone. */
export function cachedImageUrl(url: string): Promise<string | null> {
  if (!isDiskCacheable(url)) return Promise.resolve(null);
  const live = liveUrls.get(url);
  if (live) return Promise.resolve(live);
  const running = lookups.get(url);
  if (running) return running;
  const job = (async () => {
    try {
      const hit = await (await openCache()).match(url);
      if (!hit) return null;
      const blob = await hit.blob();
      if (!blob.size) return null;
      const objectUrl = URL.createObjectURL(blob);
      rememberLive(url, objectUrl);
      return objectUrl;
    } catch {
      return null;
    } finally {
      lookups.delete(url);
    }
  })();
  lookups.set(url, job);
  return job;
}

// Background saving: a couple at a time, never twice, never offline.
const queue: string[] = [];
const queued = new Set<string>();
let active = 0;
const PARALLEL = 2;

function pump() {
  while (active < PARALLEL && queue.length) {
    const url = queue.shift()!;
    active += 1;
    void (async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        const cache = await openCache();
        if (await cache.match(url)) return;
        // Usually answered by the HTTP cache right after the <img> loaded it.
        const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
        const type = response.headers.get('content-type') || '';
        if (response.ok && type.startsWith('image/')) await cache.put(url, response);
      } catch {
        // Quota, CORS or network: the image simply is not saved.
      } finally {
        active -= 1;
        queued.delete(url);
        pump();
      }
    })();
  }
}

/** Save a copy of an image that has just loaded from the network. */
export function saveImageToDisk(url: string) {
  if (!isDiskCacheable(url) || queued.has(url) || liveUrls.has(url)) return;
  queued.add(url);
  queue.push(url);
  pump();
}

/** Keep at most MAX_IMAGES (keys come back oldest first). */
export async function pruneImageDiskCache() {
  if (!supported) return;
  try {
    const cache = await openCache();
    const keys = await cache.keys();
    const extra = keys.length - MAX_IMAGES;
    for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
  } catch {
    // ignore
  }
}

/** Remove every saved image (e.g. a "clear saved data" action). */
export async function clearImageDiskCache() {
  if (!supported) return;
  for (const objectUrl of liveUrls.values()) URL.revokeObjectURL(objectUrl);
  liveUrls.clear();
  cachePromise = null;
  await caches.delete(CACHE_NAME).catch(() => false);
}

/**
 * The URL to put in an <img>: the saved copy when there is one, otherwise the
 * network URL (null while the phone cache is being checked, a few ms).
 */
export function useDiskCachedImage(url: string | null | undefined, enabled = true): string | null {
  const cacheable = enabled && isDiskCacheable(url);
  const [resolved, setResolved] = useState<string | null>(() =>
    !cacheable ? (url ?? null) : liveUrls.get(url as string) ?? null);

  useEffect(() => {
    if (!cacheable) { setResolved(url ?? null); return; }
    const live = liveUrls.get(url as string);
    if (live) { setResolved(live); return; }
    let alive = true;
    setResolved(null);
    void cachedImageUrl(url as string).then(hit => { if (alive) setResolved(hit || (url as string)); });
    return () => { alive = false; };
  }, [url, cacheable]);

  return resolved;
}

/**
 * Save one image for later (background preloading). Resolves with what
 * happened; never throws. Skips images already on the phone.
 */
export async function storeImageForLater(url: string): Promise<'had' | 'saved' | 'skipped'> {
  if (!isDiskCacheable(url)) return 'skipped';
  try {
    const cache = await openCache();
    if (await cache.match(url)) return 'had';
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    const type = response.headers.get('content-type') || '';
    if (!response.ok || !type.startsWith('image/')) return 'skipped';
    await cache.put(url, response);
    return 'saved';
  } catch {
    return 'skipped';
  }
}
