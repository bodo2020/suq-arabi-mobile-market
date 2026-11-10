import type { Product } from '@/lib/supabase';

/**
 * How home rails choose what to show: a few products, not the whole section,
 * and a different mix every time the app is opened.
 *
 * Each product gets a score: how much it sold this month, a boost for offers
 * and clean photos, plus a random share that changes per app open (so the
 * rail rotates but best sellers still come up more often). Then a variety
 * pass keeps one family (e.g. five Doritos flavours) or one subsection from
 * filling the rail.
 */

const OPEN_SEED = Math.floor(Math.random() * 2 ** 31);

/** Stable 0..1 number for (seed, product) — same order while the app stays open. */
function jitter(seed: number, id: string): number {
  let h = seed ^ 0x9e3779b9;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x85ebca6b);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const hasCleanPhoto = (product: Product) =>
  Array.isArray(product.image_urls) && product.image_urls.some(url => typeof url === 'string' && url.includes('/cropped/'));

/** First two words of the name, without sizes: "دوريتوس فلفل حلو 65 جرام" -> "دوريتوس فلفل". */
export function productFamily(product: Product): string {
  return String(product.name || '')
    .replace(/[0-9٠-٩]+.*$/u, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(' ');
}

type PickOptions = {
  limit?: number;
  /** product id -> quantity sold in the best-sellers window */
  sold?: Map<string, number>;
  /** ids already shown higher on the page */
  exclude?: Set<string>;
  /** at most this many from one family (default 2) */
  perFamily?: number;
  /** at most this share of the rail from one subsection (0..1); off when undefined */
  perSubcategoryShare?: number;
  /** how strongly the per-open randomness reshuffles (default 2.5) */
  rotation?: number;
  seed?: number;
};

export function pickForRail(products: Product[], options: PickOptions = {}): Product[] {
  const {
    limit = 12, sold, exclude, perFamily = 2, perSubcategoryShare, rotation = 2.5, seed = OPEN_SEED,
  } = options;

  const scored = products
    .filter(product => Number(product.quantity || 0) > 0 && !exclude?.has(product.id))
    .map(product => ({
      product,
      score: Math.log1p(sold?.get(product.id) || 0) * 1.6
        + (product.is_offer ? 1.2 : 0)
        + (hasCleanPhoto(product) ? 0.5 : 0)
        + jitter(seed, product.id) * rotation,
    }))
    .sort((a, b) => b.score - a.score);

  const subLimit = perSubcategoryShare ? Math.max(2, Math.ceil(limit * perSubcategoryShare)) : Infinity;
  const families = new Map<string, number>();
  const subs = new Map<string, number>();
  const picked: Product[] = [];
  const skipped: Product[] = [];

  for (const { product } of scored) {
    if (picked.length >= limit) break;
    const family = productFamily(product);
    const sub = product.subcategory_id || '';
    if ((family && (families.get(family) || 0) >= perFamily) || (sub && (subs.get(sub) || 0) >= subLimit)) {
      skipped.push(product);
      continue;
    }
    picked.push(product);
    if (family) families.set(family, (families.get(family) || 0) + 1);
    if (sub) subs.set(sub, (subs.get(sub) || 0) + 1);
  }
  // Small sections: fill up with what the variety rules held back.
  for (const product of skipped) {
    if (picked.length >= limit) break;
    picked.push(product);
  }
  return picked;
}
