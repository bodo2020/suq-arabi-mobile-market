import type { Product } from '@/lib/supabase';

// Keep these as narrow grocery concepts. Related but different products (for
// example بطاطس and بطاطا) must not be treated as synonyms.
export const PRODUCT_SEARCH_SYNONYMS = [
  ['نودلز', 'اندومي', 'إندومي', 'نودل', 'noodles', 'indomie'],
  ['لبن', 'حليب', 'milk'],
  ['جبنة', 'جبنه', 'جبن', 'cheese'],
  ['فراخ', 'دجاج', 'فروج', 'chicken'],
  ['لحمة', 'لحمه', 'لحم', 'لحوم', 'meat'],
  ['أرز', 'ارز', 'رز', 'rice'],
  ['مكرونة', 'مكرونه', 'باستا', 'pasta'],
  ['بسكوت', 'بسكويت', 'biscuit'],
  ['شيبس', 'شيبسي', 'chips'],
  ['مناديل', 'منديل', 'كلينكس', 'tissues'],
  ['زبادي', 'يوغرت', 'ياغورت', 'yogurt'],
  ['عصير', 'جوس', 'juice'],
  ['مياه', 'ماء', 'مية', 'ميه', 'water'],
  ['طماطم', 'بندورة'],
  ['شوكولاتة', 'شيكولاتة', 'شوكولاته', 'chocolate'],
  ['تونة', 'تونا', 'tuna'],
  ['مربى', 'مربي', 'jam'],
  ['سجق', 'نقانق', 'sausage'],
  ['تمر', 'بلح', 'dates'],
  ['مانجو', 'منجا', 'mango'],
  ['شامبو', 'shampoo'],
  ['صابون', 'soap'],
  ['حفاضات', 'بامبرز', 'diapers'],
] as const;

const MAX_QUERIES = 6;

export function normalizeProductSearchText(value: string) {
  return value
    .toLocaleLowerCase('ar-EG')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function swapWordEnding(value: string) {
  return value.split(/\s+/).map(word => word.replace(/[هة](?=$|[^\p{L}])/u, letter => letter === 'ة' ? 'ه' : 'ة')).join(' ');
}

function alternativeInitialAlefs(value: string) {
  const plain = value.replace(/(^|\s)[أإآٱ]/gu, (_, separator: string) => `${separator}ا`);
  return [plain, plain.replace(/(^|\s)ا/gu, '$1أ'), plain.replace(/(^|\s)ا/gu, '$1إ')];
}

const synonymsByWord = new Map<string, readonly string[]>();
for (const group of PRODUCT_SEARCH_SYNONYMS) {
  for (const synonym of group) synonymsByWord.set(normalizeProductSearchText(synonym), group);
}

function synonymsForWord(word: string) {
  const normalized = normalizeProductSearchText(word);
  const bare = normalized.startsWith('ال') && normalized.length > 4 ? normalized.slice(2) : normalized;
  return synonymsByWord.get(normalized) || synonymsByWord.get(bare);
}

export function buildProductSearchQueries(query: string) {
  const original = query.trim().replace(/\s+/g, ' ');
  if (!original) return [];

  const results: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    const text = value.trim();
    if (text && !seen.has(text) && results.length < MAX_QUERIES) {
      seen.add(text);
      results.push(text);
    }
  };

  add(original);
  add(swapWordEnding(original));

  const words = original.split(' ');
  // Handle a phrase with two different synonym words, for example
  // "اندومي فراخ" -> "نودلز دجاج", before the bounded single-word variants.
  add(words.map(word => {
    const group = synonymsForWord(word);
    const normalized = normalizeProductSearchText(word);
    return group?.find(alias => normalizeProductSearchText(alias) !== normalized) || word;
  }).join(' '));

  words.forEach((word, index) => {
    const group = synonymsForWord(word);
    if (!group) return;
    for (const alias of group) {
      add(words.map((part, i) => i === index ? alias : part).join(' '));
    }
  });

  for (const alternative of alternativeInitialAlefs(original)) add(alternative);
  words.forEach((word, index) => {
    const swapped = swapWordEnding(word);
    if (swapped !== word) add(words.map((part, i) => i === index ? swapped : part).join(' '));
  });

  return results;
}

function relevanceScore(product: Product, query: string, aliases: string[]) {
  const normalizedQuery = normalizeProductSearchText(query);
  const names = [product.name, product.bulk_name].filter((name): name is string => typeof name === 'string');
  if (product.barcode === query || product.bulk_barcode === query) return 1000;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const aliasesNormalized = aliases.map(normalizeProductSearchText).filter(value => value !== normalizedQuery);
  return Math.max(0, ...names.map(name => {
    const normalizedName = normalizeProductSearchText(name);
    if (normalizedName === normalizedQuery) return 500;
    if (normalizedName.startsWith(`${normalizedQuery} `)) return 400;
    if (normalizedName.includes(normalizedQuery)) return 300;
    if (tokens.length > 1 && tokens.every(token => normalizedName.includes(token))) return 250;
    if (aliasesNormalized.some(alias => normalizedName.includes(alias))) return 150;
    return 0;
  }));
}

export function rankProductSearchResults<T extends Product>(products: T[], query: string, variants: string[]) {
  return products
    .map((product, index) => ({ product, index, score: relevanceScore(product, query, variants) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ product }) => product);
}
