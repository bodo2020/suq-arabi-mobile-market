import type { Product } from '@/lib/supabase';

/** Normalize only the lookup key; product names/barcodes never get rewritten. */
export function normalizeArabicSearch(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ةه]/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit) >= 0
      ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Offline/older-backend fallback only. The authoritative vocabulary lives in SQL,
// where aliases can be expanded without shipping a new customer application.
const fallbackGroups = [
  ['لبن','حليب'], ['تمر','بلح','تمور'], ['رز','ارز'], ['بسكوت','بسكويت'],
  ['جبنة','جبن'], ['عيش','خبز'], ['فراخ','دجاج'], ['طماطم','بندورة'],
  ['شيبسي','شيبس','رقائق بطاطس'], ['زبادي','يوجرت','yogurt'],
  ['معجون سنان','معجون اسنان'], ['مسحوق غسيل','بودرة غسيل'],
  ['مناديل تواليت','ورق حمام'], ['اريال','ariel'], ['برسيل','persil'],
  ['نسكافيه','nescafe'], ['جهينة','juhayna'], ['دومتي','domty'],
  ['ديتول','dettol'], ['شاور جل','جل استحمام'],
] as const;

export function searchAlternates(term: string): string[] {
  const normalized = normalizeArabicSearch(term);
  if (!normalized || /^\d+$/.test(normalized)) return [];
  const found: string[] = [];
  for (const group of fallbackGroups) {
    for (const source of group) {
      const key = normalizeArabicSearch(source);
      if ((' ' + normalized + ' ').includes(' ' + key + ' ')) {
        for (const candidate of group) {
          const replaced = (' ' + normalized + ' ').replace(' ' + key + ' ', ' ' + normalizeArabicSearch(candidate) + ' ').trim();
          if (replaced !== normalized && !found.includes(replaced)) found.push(replaced);
        }
      }
    }
  }
  return found.slice(0, 4);
}

type RankedProduct = Product & {
  search_rank?: number | string;
  search_match_score?: number;
  manufacturer_name?: string | null;
};

const tokens = (s: string) => s.split(' ').filter(Boolean);

/** Rank the complete query, not a loose match on just one word. */
function scoreText(text: string, query: string, alias = false): number {
  if (!text || !query) return 0;
  const qTokens = tokens(query);
  const base = alias ? 118 : 165;
  if (text === query) return base + 30;
  if (text.startsWith(query + ' ')) return base + 22;
  if ((' ' + text + ' ').includes(' ' + query + ' ')) return base + 15;
  if (text.includes(query)) return base + 8;
  if (qTokens.every(t => (' ' + text + ' ').includes(' ' + t + ' ') || (t.length >= 3 && tokens(text).some(n => n.startsWith(t))))) {
    return base - 6 + Math.min(10, qTokens.length * 2);
  }
  return 0;
}

export function relevanceScore(product: RankedProduct, query: string, alternates: string[] = []): number {
  if (Number.isFinite(product.search_match_score)) return Number(product.search_match_score);
  const q = normalizeArabicSearch(query);
  if (!q) return 0;
  const barcode = String(product.barcode || product.bulk_barcode || '').trim();
  if (barcode && barcode === query.trim()) return 300;
  const title = normalizeArabicSearch(product.name);
  const bulk = normalizeArabicSearch(product.bulk_name || '');
  const maker = normalizeArabicSearch(product.manufacturer_name || '');
  const combined = normalizeArabicSearch([title, maker, bulk].filter(Boolean).join(' '));
  const names = [title, bulk, combined].filter(Boolean);

  let best = 0;
  for (const name of names) best = Math.max(best, scoreText(name, q));
  for (const alternative of alternates) {
    const key = normalizeArabicSearch(alternative);
    if (key === q || !key) continue;
    for (const name of names) best = Math.max(best, scoreText(name, key, true));
  }
  // Keep legacy fuzzy matches as a final fallback, never above exact/alias hits.
  if (!best && Number(product.search_rank) > 0) best = Math.min(35, Number(product.search_rank) / 4);
  return best;
}

export function rankSearchProducts<T extends RankedProduct>(products: T[], query: string, alternates: string[] = []): T[] {
  const ranked = products.map(p => ({
    ...p,
    search_match_score: relevanceScore(p, query, alternates),
  })) as T[];
  return ranked.sort((a, b) => {
    const diff = relevanceScore(b, query) - relevanceScore(a, query);
    if (diff) return diff;
    const bHasStock = Number(b.quantity || 0) > 0;
    const aHasStock = Number(a.quantity || 0) > 0;
    if (bHasStock !== aHasStock) return bHasStock ? 1 : -1;
    return a.name.localeCompare(b.name, 'ar');
  });
}
