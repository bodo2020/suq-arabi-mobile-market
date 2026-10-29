import type { Product } from '@/lib/supabase';

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

// Egyptian shopper words and trade spellings, deliberately small and curated.
// The best candidate is always the actual catalog product, not a guessed item.
const aliases: Record<string, string[]> = {
  'شيبسي': ['شيبس', 'بطاطس شيبسي'],
  'شيبس': ['شيبسي'],
  'معجون سنان': ['معجون اسنان'],
  'معجون اسنان': ['معجون سنان'],
  'زبادي': ['يوجرت'],
  'يوجرت': ['زبادي'],
  'برسيل': ['برسيل', 'persil'],
  'نسكافيه': ['nescafe', 'نسكافية'],
};

export function searchAlternates(term: string): string[] {
  const normalized = normalizeArabicSearch(term);
  return [...new Set((aliases[normalized] || []).filter(v => normalizeArabicSearch(v) !== normalized))].slice(0, 2);
}

type RankedProduct = Product & { search_rank?: number | string; manufacturer_name?: string | null };

export function relevanceScore(product: RankedProduct, query: string): number {
  const q = normalizeArabicSearch(query);
  if (!q) return 0;
  const barcode = String(product.barcode || product.bulk_barcode || '').trim();
  if (barcode && barcode === query.trim()) return 200;
  const names = [product.name, product.bulk_name || '', product.manufacturer_name || '']
    .filter(Boolean).map(normalizeArabicSearch);
  const server = Number(product.search_rank);
  let score = Number.isFinite(server) && server > 0 ? server : 0;
  for (const name of names) {
    if (name === q) score = Math.max(score, 150);
    else if (name.startsWith(q)) score = Math.max(score, 120);
    else if (name.includes(q)) score = Math.max(score, 100);
    else if (q.split(' ').filter(Boolean).every(t => name.includes(t))) score = Math.max(score, 90);
  }
  return score;
}

export function rankSearchProducts<T extends RankedProduct>(products: T[], query: string): T[] {
  return [...products].sort((a, b) => {
    const diff = relevanceScore(b,query) - relevanceScore(a,query);
    if (diff) return diff;
    const bHasStock = Number(b.quantity || 0) > 0;
    const aHasStock = Number(a.quantity || 0) > 0;
    if (bHasStock !== aHasStock) return bHasStock ? 1 : -1;
    return a.name.localeCompare(b.name, 'ar');
  });
}
