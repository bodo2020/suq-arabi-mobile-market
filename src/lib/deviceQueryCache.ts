import type { Query, QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createStore, del, get, set } from 'idb-keyval';

/**
 * Keeps shopping data on the phone (IndexedDB: no 5 MB limit, async, stores
 * objects without JSON), so the app opens instantly from the last copy and can
 * be browsed offline. React Query still refreshes everything in the background
 * when online; checkout always re-validates prices and stock on the server.
 *
 * Only the screens listed below are saved. Live/money data (bag quote,
 * checkout, payment, delivery PIN, notifications) is never saved.
 */

/** Bump when the shape of saved data changes: old copies are then ignored. */
export const DEVICE_CACHE_BUSTER = 'sm-cache-v1';
/** Saved copies older than this are dropped. */
export const DEVICE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Catalog screens: the same for everyone, kept across logins. */
const PUBLIC_ROOTS = [
  'categories',
  'active-banners',
  'catalog-campaigns',
  'customer-main-categories-journey',
  'customer-continuous-category',
  'delivery-branch-id',
  'home-catalog-products',
  'offers-catalog',
  'productCollections',
  'active-products',
  'customer-product-detail',
  'customer-product-related-v2',
  'customer-product-company',
  'banner-products',
  'search-discovery-catalog-v1',
  'search-discovery-recommendation-ids-v1',
  'nearby-marketplace-stores',
  'marketplace-stores-page',
  'marketplace-store',
  'marketplace-store-products',
] as const;

/** The signed-in customer's own screens: dropped on logout. */
const PERSONAL_ROOTS = [
  'customer-favorites',
  'orders',
  'purchase-history',
  'addresses',
  'home-default-address',
  'my-customer-id',
  'loyalty-card',
  'customer-loyalty-card',
  'loyalty-vouchers',
  'home-recommendations',
] as const;

const PUBLIC = new Set<string>(PUBLIC_ROOTS);
const PERSONAL = new Set<string>(PERSONAL_ROOTS);
const rootOf = (key: readonly unknown[]) => (typeof key[0] === 'string' ? key[0] : '');

export const isSavedOnDevice = (query: Pick<Query, 'queryKey' | 'state'>) => {
  const root = rootOf(query.queryKey);
  return query.state.status === 'success' && (PUBLIC.has(root) || PERSONAL.has(root));
};

export const isPersonalQuery = (query: Pick<Query, 'queryKey'>) => PERSONAL.has(rootOf(query.queryKey));

/**
 * Saved screens must stay in memory as long as they are kept on the device,
 * otherwise an unvisited screen would be garbage-collected and dropped from the
 * next save.
 */
export function keepSavedQueriesInMemory(client: QueryClient) {
  for (const root of [...PUBLIC_ROOTS, ...PERSONAL_ROOTS]) {
    client.setQueryDefaults([root], { gcTime: DEVICE_CACHE_MAX_AGE });
  }
}

// --- IndexedDB persister ------------------------------------------------------

const idb = typeof indexedDB === 'undefined' ? null : createStore('super-marko-cache', 'queries');
const KEY = 'react-query';
const READY_FLAG = 'sm-device-cache-ready';
const THROTTLE_MS = 2000;

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const snapshot = pending;
  pending = null;
  if (!snapshot || !idb) return;
  try {
    await set(KEY, snapshot, idb);
    try { localStorage.setItem(READY_FLAG, String(Date.now())); } catch { /* optional */ }
  } catch (error) {
    // Quota or a private/broken IndexedDB: the app keeps working without it.
    console.warn('Device cache not saved:', error);
  }
}

export const deviceQueryPersister: Persister = {
  persistClient(client) {
    pending = client;
    if (!timer) timer = setTimeout(() => { void flush(); }, THROTTLE_MS);
  },
  async restoreClient() {
    if (!idb) return undefined;
    try {
      return (await get<PersistedClient>(KEY, idb)) ?? undefined;
    } catch {
      return undefined;
    }
  },
  async removeClient() {
    pending = null;
    try { localStorage.removeItem(READY_FLAG); } catch { /* optional */ }
    if (idb) await del(KEY, idb).catch(() => {});
  },
};

/** Whether a saved copy exists (sync, for the offline screen). */
export function hasDeviceCache() {
  try { return Boolean(localStorage.getItem(READY_FLAG)); } catch { return false; }
}

/** Drop the signed-in customer's own screens (logout). */
export function clearPersonalQueries(client: QueryClient) {
  client.removeQueries({ predicate: isPersonalQuery });
}
