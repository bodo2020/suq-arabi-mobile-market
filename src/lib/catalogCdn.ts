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

/* ---------- Home screen from the CDN ---------- */

/** <branch>/home/<hash>.json: home sections (both A/B variants), banners, categories and best sellers. */
export type CdnHome = {
  personalized: boolean;
  page: { id: string; name: string; version: number; published_at: string | null; segments: string[]; sections: CdnHomeSection[] } | null;
  banners: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  best_sellers: { window_days?: number; items?: Array<{ id: string; sold: number }> } | null;
};
type CdnHomeSection = { sort_order?: number | null; starts_at?: string | null; ends_at?: string | null; experiment_key?: string | null; experiment_variant?: string | null };

/** Home data for the branch, or null to use the API (no manifest, sections aimed at customer segments, network error). */
export async function cdnHome(branchId: string): Promise<CdnHome | null> {
  const manifest = await loadManifest(branchId) as (Manifest & { home?: string }) | null;
  if (!manifest?.home) return null;
  const url = `${BASE}/${branchId}/home/${manifest.home}.json`;
  if (!pageCache.has(url)) pageCache.set(url, getJson<unknown[]>(url).catch(error => { pageCache.delete(url); throw error; }));
  try {
    const home = (await pageCache.get(url)) as unknown as CdnHome;
    return home && !home.personalized ? home : null;
  } catch {
    return null;
  }
}

/** Stable 0-99 bucket for a visit and an experiment (FNV-1a), so a visitor keeps the same variant all session. */
export function experimentBucket(seed: string, key: string): number {
  let hash = 0x811c9dc5;
  const text = `${seed}:${key}`;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

/**
 * The sections a visitor sees, as the server picks them: inside their time window, and for an A/B experiment with both
 * variants live, variant A for buckets 0-49 and B for 50-99 (a single live variant is shown to everyone).
 */
export function pickHomeSections<T extends CdnHomeSection>(sections: T[], seed: string, now = Date.now()): T[] {
  const live = sections.filter(s => (!s.starts_at || new Date(s.starts_at).getTime() <= now) && (!s.ends_at || new Date(s.ends_at).getTime() > now));
  const variants = new Map<string, Set<string>>();
  for (const s of live) if (s.experiment_key && s.experiment_variant) {
    if (!variants.has(s.experiment_key)) variants.set(s.experiment_key, new Set());
    variants.get(s.experiment_key)!.add(s.experiment_variant);
  }
  const chosen = (key: string) => {
    const set = variants.get(key)!;
    if (set.has("A") && set.has("B")) return experimentBucket(seed, key) < 50 ? "A" : "B";
    return set.has("A") ? "A" : "B";
  };
  return live
    .filter(s => !s.experiment_key || !variants.has(s.experiment_key) || s.experiment_variant === chosen(s.experiment_key))
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
}
