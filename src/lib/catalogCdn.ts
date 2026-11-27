/**
 * Category pages from the CDN (public bucket catalog-cdn, published by the publish-catalog edge function).
 * <branch>/manifest.json (cached 60 s) names the current version; <branch>/<version>/<page>.json holds the same rows
 * the catalog API returns for that page (newest first), so any smaller limit is a prefix of it.
 * Returns null whenever the CDN cannot answer exactly (partner stores near the address, unknown page, limit too big,
 * network error): the caller then uses the API as before.
 */
const BASE = "https://qzvpayjaadbmpayeglon.supabase.co/storage/v1/object/public/catalog-cdn";
const MANIFEST_TTL_MS = 60_000;
const TIMEOUT_MS = 6_000;

type Manifest = { version: string; partners: boolean; pages: string[]; limits: { all: number; category: number } };

let manifestCache: { branchId: string; at: number; manifest: Manifest | null } | null = null;
const pageCache = new Map<string, Promise<unknown[]>>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`CDN ${res.status}`);
  return res.json() as Promise<T>;
}

async function loadManifest(branchId: string): Promise<Manifest | null> {
  if (manifestCache?.branchId === branchId && Date.now() - manifestCache.at < MANIFEST_TTL_MS) return manifestCache.manifest;
  const manifest = await getJson<Manifest>(`${BASE}/${branchId}/manifest.json`).catch(() => null);
  manifestCache = { branchId, at: Date.now(), manifest };
  return manifest;
}

/** Rows for "all products" (mainCategoryId null) or one main category, or null to fall back to the API. */
export async function cdnCatalogPage<T>(branchId: string, mainCategoryId: string | null, limit: number): Promise<T[] | null> {
  const manifest = await loadManifest(branchId);
  if (!manifest || manifest.partners) return null;
  const page = mainCategoryId || "all";
  const cap = mainCategoryId ? manifest.limits.category : manifest.limits.all;
  if (!manifest.pages.includes(page) || limit > cap) return null;
  const url = `${BASE}/${branchId}/${manifest.version}/${page}.json`;
  // Pages under a version never change, so one download per version and page is enough.
  if (!pageCache.has(url)) {
    if (pageCache.size > 60) pageCache.clear();
    pageCache.set(url, getJson<unknown[]>(url).catch(error => { pageCache.delete(url); throw error; }));
  }
  try {
    const rows = await pageCache.get(url)!;
    return Array.isArray(rows) ? (rows.slice(0, limit) as T[]) : null;
  } catch {
    return null;
  }
}
