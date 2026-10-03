import type { QueryClient, QueryKey } from '@tanstack/react-query';

const STORAGE_KEY = 'elmadawy_public_catalog_cache_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 48;
const MAX_BYTES = 4_000_000;

const SAFE_QUERY_ROOTS = new Set([
  'categories',
  'home-catalog-products',
  'active-banners',
  'productCollections',
  'active-products',
  'delivery-branch-id',
  'main-categories',
  'subcategories',
  'subsubcategories',
  'category',
  'subcategory',
  'category-products',
  'subcategory-products',
  'product',
  'bulk-products',
  'company-products',
  'banner-products',
]);

type CachedQuery = {
  queryKey: QueryKey;
  data: unknown;
  updatedAt: number;
};

type CatalogSnapshot = {
  version: 1;
  savedAt: number;
  queries: CachedQuery[];
};

let activeClient: QueryClient | null = null;

const safeRoot = (queryKey: QueryKey) => {
  const root = Array.isArray(queryKey) ? queryKey[0] : null;
  return typeof root === 'string' && SAFE_QUERY_ROOTS.has(root);
};

export function hasOfflineCatalogCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as CatalogSnapshot;
    return parsed.version === 1 && Array.isArray(parsed.queries) && parsed.queries.length > 0;
  } catch {
    return false;
  }
}

export function hydrateOfflineCatalog(queryClient: QueryClient) {
  activeClient = queryClient;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const snapshot = JSON.parse(raw) as CatalogSnapshot;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.queries)) return;
    if (Date.now() - Number(snapshot.savedAt || 0) > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    for (const item of snapshot.queries) {
      if (!item || !Array.isArray(item.queryKey) || !safeRoot(item.queryKey) || item.data === undefined) continue;
      queryClient.setQueryData(item.queryKey, item.data, { updatedAt: Number(item.updatedAt || snapshot.savedAt) });
    }
  } catch {
    // Corrupt or unsupported cache should never prevent the app from opening.
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }
}

function buildSnapshot(queryClient: QueryClient): CatalogSnapshot {
  const queries = queryClient.getQueryCache().getAll()
    .filter(query => safeRoot(query.queryKey) && query.state.data !== undefined)
    .map(query => ({
      queryKey: query.queryKey,
      data: query.state.data,
      updatedAt: query.state.dataUpdatedAt || Date.now(),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  // Keep only the most recently used branch product list. This avoids filling
  // localStorage when the customer changes delivery branches repeatedly.
  let seenProducts = false;
  const compact = queries.filter(item => {
    if (!['active-products', 'home-catalog-products'].includes(String(item.queryKey[0]))) return true;
    if (seenProducts) return false;
    seenProducts = true;
    return true;
  }).map(item => {
    if (['active-products', 'home-catalog-products'].includes(String(item.queryKey[0])) && Array.isArray(item.data) && item.data.length > 600) {
      return { ...item, data: item.data.slice(0, 600) };
    }
    return item;
  });

  return { version: 1, savedAt: Date.now(), queries: compact };
}

export function subscribeOfflineCatalog(queryClient: QueryClient) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const persist = () => {
    timer = null;
    try {
      const snapshot = buildSnapshot(queryClient);
      if (!snapshot.queries.length) return;
      let serialized = JSON.stringify(snapshot);

      // If the full product cache exceeds browser storage limits, keep the
      // lightweight categories/banners/collections so offline mode stays useful.
      if (serialized.length > MAX_BYTES) {
        snapshot.queries = snapshot.queries.filter(item => !['active-products', 'home-catalog-products'].includes(String(item.queryKey[0])));
        serialized = JSON.stringify(snapshot);
      }

      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Offline support is best-effort; storage quota/private mode must not crash the app.
    }
  };

  return queryClient.getQueryCache().subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(persist, 700);
  });
}


export function readOfflineQuery<T>(key: QueryKey): T | undefined {
  return activeClient?.getQueryData<T>(key);
}
