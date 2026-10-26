import { getMarketplaceStore, getMarketplaceStoreProduct } from '@/lib/marketplace';
import { getProductById, getRelatedProducts, getCompanyById, type Product } from '@/lib/supabase';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Small, address/merchant-scoped read cache. This is presentation data only:
 * stock, prices and cart eligibility remain subject to checkout validation.
 */
export const detailProductKey = (id: string, store: string | null) =>
  ['customer-product-detail', store || 'owned', id] as const;
export const detailRelatedKey = (id: string, category: string) =>
  ['customer-product-related', category, id] as const;
export const detailCompanyKey = (id: string) => ['customer-product-company', id] as const;

export const PRODUCT_DETAIL_STALE_MS = 45_000;

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

const preloadedImages = new Set<string>();
function warmFirstImage(product: Product) {
  if (typeof Image === 'undefined') return;
  const candidates = [product.image_urls?.[0], product.bulk_image_url];
  for (const source of candidates) {
    if (!source || preloadedImages.has(source)) continue;
    preloadedImages.add(source);
    const image = new Image();
    image.src = source;
    if (preloadedImages.size > 120) preloadedImages.clear();
  }
}

/**
 * Prefetch exactly the adjacent two product pages (plus their images/related
 * content), de-duplicated by React Query. All requests obey the selected store.
 */
export function warmAdjacentProductPages(
  client: QueryClient, paths: string[], currentIndex: number,
): void {
  if (currentIndex < 0 || typeof window === 'undefined') return;
  for (const index of [currentIndex - 1, currentIndex + 1]) {
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
    }).then(() => {
      const product = getCachedDetailProduct(client, id, store);
      if (!product) return;
      warmFirstImage(product);
      void client.prefetchQuery({
        queryKey: detailRelatedKey(product.id, product.main_category_id),
        queryFn: () => getRelatedProducts(product.id, product.main_category_id),
        staleTime: PRODUCT_DETAIL_STALE_MS,
      });
      if (product.company_id) void client.prefetchQuery({
        queryKey: detailCompanyKey(product.company_id),
        queryFn: () => getCompanyById(product.company_id),
        staleTime: PRODUCT_DETAIL_STALE_MS,
      });
    }).catch(() => {
      // An unavailable neighbor must not block viewing the current product.
    });
  }
}
