import Fuse from 'fuse.js';
import type { Product } from '@/lib/supabase';
import { normalizeArabicSearch } from '@/lib/arabicSearch';

/**
 * Typo-tolerant search (Fuse.js) over the branch catalog, used when the exact
 * server search finds little: "شيبسى", "بيبسى كولا", "اندومى" still find the
 * product. Names are normalised the same way as the server search
 * (أ/إ/آ → ا, ى → ي, ة → ه …) before matching.
 */

type Entry = { product: Product; name: string };

let cached: { source: Product[]; fuse: Fuse<Entry> } | null = null;

function indexFor(catalog: Product[]): Fuse<Entry> {
  if (cached && cached.source === catalog) return cached.fuse;
  const entries = catalog.map(product => ({ product, name: normalizeArabicSearch(product.name || '') }));
  const fuse = new Fuse(entries, {
    keys: ['name'],
    threshold: 0.38,        // how many typos are forgiven (0 = exact, 1 = anything)
    ignoreLocation: true,   // the word can be anywhere in the name
    minMatchCharLength: 2,
    includeScore: true,
  });
  cached = { source: catalog, fuse };
  return fuse;
}

export function fuzzyFindProducts(catalog: Product[], query: string, limit = 24): Product[] {
  const term = normalizeArabicSearch(query);
  if (term.length < 3 || /^\d+$/.test(term)) return [];
  return indexFor(catalog).search(term, { limit }).map(result => result.item.product);
}
