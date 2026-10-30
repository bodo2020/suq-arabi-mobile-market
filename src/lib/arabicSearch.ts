import type { Product } from '@/lib/supabase';
import { synonymGroups, relatedFamilies } from '@/lib/searchVocabulary';

/** Match-only normalization. Never rewrite the product's displayed name. */
export function normalizeArabicSearch(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearchWords(product: SearchMatchProduct, query: string): boolean {
  const key = normalizeArabicSearch(query);
  if (!key) return false;
  const words = key.split(' ').filter(Boolean);
  const searchable = [product.name, product.bulk_name || '', product.manufacturer_name || '']
    .filter(Boolean).map(normalizeArabicSearch).join(' ');
  const padded = ' ' + searchable + ' ';
  return words.every(word => padded.includes(' ' + word + ' ')) ||
    [product.barcode, product.bulk_barcode].some(code => Boolean(code && String(code).trim() === query.trim()));
}

/** Rewrite a whole word/phrase, never a substring inside a different name. */
function rewriteTerm(query: string, from: string, to: string): string | null {
  const original = normalizeArabicSearch(from);
  const replacement = normalizeArabicSearch(to);
  if (!original || !replacement || original === replacement) return null;
  const padded = ' ' + query + ' ';
  const match = ' ' + original + ' ';
  if (!padded.includes(match)) return null;
  return padded.replace(match, ' ' + replacement + ' ').trim();
}

const alternatesCache = new Map<string, string[]>();

/**
 * Find safe two-way Egyptian synonyms even when the term is in a longer query:
 * "لبن كامل الدسم" -> "حليب كامل الدسم".
 * Longest phrase wins. Capped to avoid too many catalog round trips.
 */
export function searchAlternates(term: string): string[] {
  const normalized = normalizeArabicSearch(term);
  if (normalized.length < 2) return [];
  const cached = alternatesCache.get(normalized);
  if (cached) return cached;

  const matches: { length: number; phrase: string; group: string[] }[] = [];
  for (const group of synonymGroups) {
    for (const phrase of group) {
      const needle = normalizeArabicSearch(phrase);
      if (needle.length < 2) continue;
      if ((' ' + normalized + ' ').includes(' ' + needle + ' ')) {
        matches.push({ length: needle.length, phrase, group });
      }
    }
  }
  matches.sort((a, b) => b.length - a.length);
  const variants: string[] = [];
  for (const match of matches) {
    // Do not rewrite a short word again when a longer, precise phrase already
    // matched (e.g. "رز بسمتي" must never become "رز رز بسمتي").
    const phrase = normalizeArabicSearch(match.phrase);
    const covered = matches.some(other => other.length > match.length &&
      (' ' + normalizeArabicSearch(other.phrase) + ' ').includes(' ' + phrase + ' '));
    if (covered) continue;
    for (const synonym of match.group) {
      const variant = rewriteTerm(normalized, match.phrase, synonym);
      if (variant && variant !== normalized && !variants.includes(variant)) variants.push(variant);
      if (variants.length >= 3) break;
    }
    if (variants.length >= 3) break;
  }
  if (alternatesCache.size > 100) alternatesCache.clear();
  alternatesCache.set(normalized, variants);
  return variants;
}

/** Different products in a similar family, NOT synonyms or silent replacements. */
export function relatedSearches(term: string): string[] {
  const q = normalizeArabicSearch(term);
  // Only broad single-category searches can suggest neighbouring products.
  // Never silently change specifications such as "تونة بالزيت" to sardines.
  if (q.length < 3 || q.includes(' ') || /^\d+$/.test(q)) return [];
  const family = relatedFamilies.find(item => item.triggers.some(trigger => normalizeArabicSearch(trigger) === q));
  if (!family) return [];
  const exact = new Set([q, ...searchAlternates(q)]);
  return family.terms.map(normalizeArabicSearch).filter(t => t.length > 1 && !exact.has(t)).slice(0, 2);
}

export type SearchMatchProduct = Product & {
  search_rank?: number | string;
  manufacturer_name?: string | null;
  search_match_type?: 'direct' | 'synonym' | 'related';
};

/** Exact query > real synonym > similarly-related product. */
export function relevanceScore(product: SearchMatchProduct, query: string): number {
  const q = normalizeArabicSearch(query);
  if (!q) return 0;
  const barcode = String(product.barcode || product.bulk_barcode || '').trim();
  if (barcode && barcode === query.trim()) return 1000;
  const names = [product.name, product.bulk_name || '', product.manufacturer_name || '']
    .filter(Boolean).map(normalizeArabicSearch);
  const terms = q.split(' ').filter(Boolean);
  const directScore = names.reduce((best, name) => {
    if (name === q) return Math.max(best, 700);
    if (name.startsWith(q + ' ')) return Math.max(best, 660);
    if ((' ' + name + ' ').includes(' ' + q + ' ')) return Math.max(best, 640);
    if (terms.every(t => (' ' + name + ' ').includes(' ' + t + ' '))) return Math.max(best, 570);
    return best;
  }, 0);
  if (directScore) return directScore;
  if (matchesSearchWords(product, q)) return 560;

  const variants = searchAlternates(q);
  const synonymScore = variants.reduce((best, variant) => names.reduce((nested, name) => {
    if (name === variant) return Math.max(nested, 490);
    if (name.startsWith(variant + ' ')) return Math.max(nested, 475);
    if ((' ' + name + ' ').includes(' ' + variant + ' ')) return Math.max(nested, 465);
    const words = variant.split(' ');
    if (words.every(t => (' ' + name + ' ').includes(' ' + t + ' '))) return Math.max(nested, 430);
    return nested;
  }, best), 0);
  if (synonymScore) return synonymScore;
  if (variants.some(variant => matchesSearchWords(product, variant))) return 420;

  const serverRank = Number(product.search_rank);
  const safeServerRank = Number.isFinite(serverRank) && serverRank > 0 ? Math.min(serverRank, 180) : 0;
  if (product.search_match_type === 'related') return 70 + Math.min(safeServerRank, 100) / 20;
  if (product.search_match_type === 'synonym') return 370 + Math.min(safeServerRank, 100) / 10;
  return safeServerRank;
}

export function rankSearchProducts<T extends SearchMatchProduct>(products: T[], query: string): T[] {
  const scores = new Map(products.map(product => [product, relevanceScore(product, query)]));
  return [...products].sort((a, b) => {
    const diff = (scores.get(b) || 0) - (scores.get(a) || 0);
    if (diff) return diff;
    const bHasStock = Number(b.quantity || 0) > 0;
    const aHasStock = Number(a.quantity || 0) > 0;
    if (bHasStock !== aHasStock) return bHasStock ? 1 : -1;
    return a.name.localeCompare(b.name, 'ar');
  });
}
