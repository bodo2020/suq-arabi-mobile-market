import { getMarketplaceStore, getMarketplaceStoreProduct } from '@/lib/marketplace';
import { getProductById, type Product } from '@/lib/supabase';
import type { QueryClient } from '@tanstack/react-query';
import { prepareFullProductImage, prepareProductImage } from '@/lib/productImagePipeline';

/**
 * Small, address/merchant-scoped read cache. This is presentation data only:
 * stock, prices and cart eligibility remain subject to checkout validation.
 */
export const detailProductKey = (id: string, store: string | null) =>
  ['customer-product-detail', store || 'owned', id] as const;
export const detailRelatedKey = (product: Product) =>
  ['customer-product-related-v2', product.commerce_source || 'owned',
    product.marketplace_branch_id || product.delivery_branch_id || 'branch', product.id] as const;
export const detailCompanyKey = (id: string) => ['customer-product-company', id] as const;

// Keep browsed products available through repeated swipes. After this interval
// React Query may refresh silently, but cached details remain visible instantly.
export const PRODUCT_DETAIL_STALE_MS = 10 * 60_000;
export const PRODUCT_DETAIL_GC_MS = 60 * 60_000;

export async function fetchDetailProduct(id: string, store: string | null): Promise<Product> {
  const data = store
    ? (await getMarketplaceStore(store))
      ? await getMarketplaceStoreProduct(store, id)
      : null
    : await getProductById(id);
  if (!data) throw new Error('PRODUCT_NOT_FOUND');
  return data as Product;
}

export function getCachedDetailProduct(client: QueryClient, id: string | undefined, store: string | null) {
  return id ? client.getQueryData<Product>(detailProductKey(id, store)) || null : null;
}

// Product cards already hold the full listing snapshot. Keep a short-lived,
// route-scoped copy so opening/swiping never waits for a second catalog read.
// The checkout flow still validates actual price and stock against the server.
const visibleSnapshots = new Map<string, { product: Product; savedAt: number }>();
// Preserve a long catalog journey while the sheet stays open. Display-only
// snapshots never authorize checkout prices, quantities or stock.
const SNAPSHOT_TTL_MS = 20 * 60_000;
const MAX_SNAPSHOTS = 5000;

export function registerBrowsableProduct(path: string, product: Product): void {
  if (!/^\/product\/[^/?#]+/.test(path)) return;
  visibleSnapshots.delete(path);
  visibleSnapshots.set(path, { product, savedAt: Date.now() });
  while (visibleSnapshots.size > MAX_SNAPSHOTS) {
    visibleSnapshots.delete(visibleSnapshots.keys().next().value!);
  }
}

function warmFirstImage(product: Product, fullResolution: boolean, bulk = false): void {
  const source = bulk
    ? product.bulk_image_url || product.image_urls?.[0]
    : product.image_urls?.[0];
  if (!source) return;
  // Unlike assigning Image.src, this awaits decode() in a bounded shared
  // cache: the thumbnail is genuinely ready for the carousel compositor.
  void prepareProductImage(source);
  if (fullResolution) void prepareFullProductImage(source);
}

/**
 * Synchronously hydrate the selected product and nearby cards before routing.
 * Never overwrite a detail fetch that was already cached from the server.
 * Cache keys include the marketplace store, so one merchant cannot seed another.
 */
export function seedProductBrowseCache(
  client: QueryClient, paths: string[], currentIndex: number, radius = 6,
): void {
  if (currentIndex < 0 || typeof window === 'undefined') return;
  for (let offset = 0; offset <= radius; offset++) {
    for (const index of offset ? [currentIndex - offset, currentIndex + offset] : [currentIndex]) {
      const path = paths[index];
      const snapshot = path ? visibleSnapshots.get(path) : undefined;
      if (!snapshot) continue;
      if (Date.now() - snapshot.savedAt > SNAPSHOT_TTL_MS) {
        visibleSnapshots.delete(path);
        continue;
      }
      const url = new URL(path, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/product/')) continue;
      const store = url.searchParams.get('store');
      let productId = '';
      try { productId = decodeURIComponent(url.pathname.slice('/product/'.length)); }
      catch { continue; }
      if (productId !== snapshot.product.id) continue;
      if (store && snapshot.product.marketplace_branch_id !== store) continue;
      if (!store && snapshot.product.commerce_source === 'marketplace') continue;
      const key = detailProductKey(productId, store);
      if (!client.getQueryData(key)) {
        // The snapshot is display-only. Every selected item is eligible
        // for silent canonical price/stock revalidation before checkout.
        client.setQueryData(key, snapshot.product, {
          updatedAt: Date.now() - PRODUCT_DETAIL_STALE_MS - 1,
        });
      }
      if (Math.abs(index - currentIndex) <= 2) {
        warmFirstImage(snapshot.product, false, url.searchParams.get('unit') === 'bulk');
      }
    }
  }
}

/**
 * Warm only card-sized images around the shopper. Do not saturate the network
 * with full-resolution images or secondary requests during gestures.
 */
export function warmAdjacentProductPages(
  client: QueryClient, paths: string[], currentIndex: number,
): void {
  if (currentIndex < 0 || typeof window === 'undefined') return;
  seedProductBrowseCache(client, paths, currentIndex);
  // Only warm images for the neighbors. Full details are revalidated when
  // selected; recommended products NEVER compete with an active swipe.
  for (const index of [currentIndex - 1, currentIndex + 1, currentIndex - 2, currentIndex + 2]) {
    const path = paths[index];
    if (!path || !/^\/product\/[^/?#]+/.test(path)) continue;
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) continue;
    const id = decodeURIComponent(url.pathname.slice('/product/'.length));
    const product = getCachedDetailProduct(client, id, url.searchParams.get('store'));
    if (product) warmFirstImage(product, false, url.searchParams.get('unit') === 'bulk');
  }
}


/**
 * Warm canonical details for the two nearest cards on each side after
 * the current hero
 * has had its first paint. Cache scopes are identical to the selected route.
 * The full ordered journey is already known; only the small rolling
 * window needs canonical validation. No recommendation requests on swipe.
 */
export async function prefetchAdjacentProductDetails(
  client: QueryClient,
  paths: string[],
  currentIndex: number,
  onReady?: () => void,
): Promise<void> {
  if (currentIndex < 0 || typeof window === 'undefined') return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  // Respect a user preference to save mobile data.
  if (connection?.saveData) return;

  const warm = async (path: string | undefined): Promise<void> => {
    if (!path || !/^\/product\/[^/?#]+/.test(path)) return;
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) return;
    let id: string;
    try { id = decodeURIComponent(url.pathname.slice('/product/'.length)); }
    catch { return; }
    const store = url.searchParams.get('store');
    const key = detailProductKey(id, store);
    try {
      await client.prefetchQuery({
        queryKey: key,
        queryFn: () => fetchDetailProduct(id, store),
        staleTime: PRODUCT_DETAIL_STALE_MS,
        gcTime: PRODUCT_DETAIL_GC_MS,
        retry: false,
      });
      const product = getCachedDetailProduct(client, id, store);
      // Decode the small swipe thumbnail only. Loading four full-resolution
      // photos alongside the gestures saturated the network and GPU memory.
      if (product) warmFirstImage(product, false, url.searchParams.get('unit') === 'bulk');
    } catch {
      // Keep display-only catalog snapshots available when a request fails.
    } finally {
      onReady?.();
    }
  };

  // The next gesture needs +/-1 first; don't compete with it by fetching
  // +/-2 and high-resolution photos at the same time.
  const immediate = Promise.all([paths[currentIndex + 1], paths[currentIndex - 1]].map(warm));
  if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') {
    await immediate;
    return;
  }
  // Do not let a slow first request starve the following cards forever.
  await new Promise<void>(resolve => window.setTimeout(resolve, 180));
  await Promise.all([immediate, ...[paths[currentIndex + 2], paths[currentIndex - 2]].map(warm)]);
}
