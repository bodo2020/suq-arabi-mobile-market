import { getMarketplaceStore, getMarketplaceStoreProduct } from '@/lib/marketplace';
import { getProductById, getRelatedProducts, getCompanyById, type Product } from '@/lib/supabase';
import type { QueryClient } from '@tanstack/react-query';
import { productCardImage } from '@/lib/productCardImage';

/**
 * Small, address/merchant-scoped read cache. This is presentation data only:
 * stock, prices and cart eligibility remain subject to checkout validation.
 */
export const detailProductKey = (id: string, store: string | null) =>
  ['customer-product-detail', store || 'owned', id] as const;
export const detailRelatedKey = (id: string, category: string) =>
  ['customer-product-related', category, id] as const;
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
const SNAPSHOT_TTL_MS = 5 * 60_000;
const MAX_SNAPSHOTS = 400;

export function registerBrowsableProduct(path: string, product: Product): void {
  if (!/^\/product\/[^/?#]+/.test(path)) return;
  visibleSnapshots.delete(path);
  visibleSnapshots.set(path, { product, savedAt: Date.now() });
  while (visibleSnapshots.size > MAX_SNAPSHOTS) {
    visibleSnapshots.delete(visibleSnapshots.keys().next().value!);
  }
}

const warmedImages = new Map<string, HTMLImageElement>();
function warmImage(source: string | null | undefined): void {
  if (!source || typeof Image === 'undefined' || warmedImages.has(source)) return;
  const image = new Image();
  image.decoding = 'async';
  image.src = source;
  warmedImages.set(source, image);
  // Keep outstanding image elements alive until the browser finishes the fetch.
  // Limit both decoded images and concurrent retained elements on long journeys.
  while (warmedImages.size > 48) warmedImages.delete(warmedImages.keys().next().value!);
}

function warmFirstImage(product: Product, fullResolution: boolean, bulk = false): void {
  const source = bulk
    ? product.bulk_image_url || product.image_urls?.[0]
    : product.image_urls?.[0];
  if (!source) return;
  warmImage(productCardImage(source));
  if (fullResolution) warmImage(source);
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
      if (!client.getQueryData(key)) client.setQueryData(key, snapshot.product);
      warmFirstImage(snapshot.product, offset <= 1, url.searchParams.get('unit') === 'bulk');
    }
  }
}

/**
 * Warm the immediate previous/next products plus one more on each side.
 * React Query de-duplicates in-flight requests and retains visits for an hour.
 * All requests remain scoped to the selected merchant/store.
 */
export function warmAdjacentProductPages(
  client: QueryClient, paths: string[], currentIndex: number,
): void {
  if (currentIndex < 0 || typeof window === 'undefined') return;
  seedProductBrowseCache(client, paths, currentIndex);
  for (const index of [currentIndex - 1, currentIndex + 1, currentIndex - 2, currentIndex + 2]) {
    const path = paths[index];
    if (!path || !/^\/product\/[^/?#]+/.test(path)) continue;
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin) continue;
    let id: string;
    try { id = decodeURIComponent(url.pathname.slice('/product/'.length)); }
    catch { continue; }
    const store = url.searchParams.get('store');
    if (!id || id.includes('/')) continue;
    void client.prefetchQuery({
      queryKey: detailProductKey(id, store),
      queryFn: () => fetchDetailProduct(id, store),
      staleTime: PRODUCT_DETAIL_STALE_MS,
      gcTime: PRODUCT_DETAIL_GC_MS,
    }).then(() => {
      const product = getCachedDetailProduct(client, id, store);
      if (!product) return;
      const immediate = Math.abs(index - currentIndex) === 1;
      warmFirstImage(product, immediate, url.searchParams.get('unit') === 'bulk');
      // Supplementary recommendations are non-critical: only warm the nearest
      // two, leaving bandwidth for the product and its main image.
      if (!immediate) return;
      void client.prefetchQuery({
        queryKey: detailRelatedKey(product.id, product.main_category_id),
        queryFn: () => getRelatedProducts(product.id, product.main_category_id),
        staleTime: PRODUCT_DETAIL_STALE_MS,
        gcTime: PRODUCT_DETAIL_GC_MS,
      });
      if (product.company_id) void client.prefetchQuery({
        queryKey: detailCompanyKey(product.company_id),
        queryFn: () => getCompanyById(product.company_id),
        staleTime: PRODUCT_DETAIL_STALE_MS,
        gcTime: PRODUCT_DETAIL_GC_MS,
      });
    }).catch(() => {
      // An unavailable neighbor must not block viewing the current product.
    });
  }
}
