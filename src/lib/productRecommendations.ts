import type { Product } from '@/lib/supabase';
import { getBranchCatalog } from '@/lib/supabase';

/**
 * Catalog-grounded, deterministic recommendations. Never mix marketplace stores
 * or invent products; all candidate rows come from the same sellable catalog.
 */
const relatedTerms: Array<{ triggers: string[]; complements: string[] }> = [
  { triggers: ['مكرون', 'اسباجت'], complements: ['صلص', 'جبن'] },
  { triggers: ['قهو', 'نسكافيه', 'بن '], complements: ['سكر', 'بسكويت'] },
  { triggers: ['شاي'], complements: ['سكر', 'بسكويت'] },
  { triggers: ['حليب', 'لبن'], complements: ['كورنفلكس', 'بسكويت'] },
  { triggers: ['ارز', 'رز '], complements: ['زيت', 'صلص'] },
  { triggers: ['جبن'], complements: ['عيش', 'خبز'] },
  { triggers: ['غسيل', 'مسحوق'], complements: ['منعم', 'بقع'] },
  { triggers: ['شامبو'], complements: ['بلسم', 'كريم'] },
  { triggers: ['حفاض'], complements: ['مناديل', 'بيبي'] },
  { triggers: ['شيبس', 'بطاطس'], complements: ['بيبسي', 'عصير'] },
];

const normalize = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/[\u064b-\u065f\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const tokens = (value: string) =>
  new Set(normalize(value).split(' ').filter(part => part.length > 2));

const hash = (value: string): number => {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
};

export function recommendationKeywords(product: Product): string[] {
  const name = normalize(product.name);
  const terms = relatedTerms.find(rule => rule.triggers.some(trigger => name.includes(normalize(trigger))));
  return terms?.complements.slice(0, 2) || [];
}

export function rankProductRecommendations(product: Product, candidates: Product[], limit = 8): Product[] {
  const ownTokens = tokens(product.name);
  const complementWords = recommendationKeywords(product);
  const rows = new Map<string, Product>();
  for (const candidate of candidates) {
    if (!candidate || candidate.id === product.id || Number(candidate.quantity || 0) <= 0) continue;
    if (product.commerce_source === 'marketplace') {
      if (candidate.commerce_source !== 'marketplace' || candidate.marketplace_branch_id !== product.marketplace_branch_id) continue;
    } else if (candidate.commerce_source === 'marketplace') continue;
    rows.set(candidate.id, candidate);
  }

  const scored = [...rows.values()].map(candidate => {
    const candidateName = normalize(candidate.name);
    const sameSubcategory = !!product.subcategory_id && candidate.subcategory_id === product.subcategory_id;
    const complement = complementWords.some(term => candidateName.includes(normalize(term)));
    const overlap = [...tokens(candidate.name)].filter(token => ownTokens.has(token)).length;
    const sameBrand = !!product.company_id && candidate.company_id === product.company_id;
    const sourcePrice = Number(product.offer_price || product.price || 0);
    const candidatePrice = Number(candidate.offer_price || candidate.price || 0);
    const affordableMatch = sourcePrice > 0 && candidatePrice > 0
      && Math.abs(Math.log(candidatePrice / sourcePrice)) < 0.8;
    const score =
      (sameSubcategory ? 32 : candidate.main_category_id === product.main_category_id ? 14 : 0)
      + (complement ? 40 : 0)
      + Math.min(20, overlap * 7)
      + (sameBrand ? 10 : 0)
      + (affordableMatch ? 6 : 0)
      + (candidate.is_offer ? 4 : 0)
      // Stable per-product tie-breaker avoids identical rails for a whole category.
      + (hash(product.id + ':' + candidate.id) % 100) / 100;
    return { candidate, score, complement, sameSubcategory };
  }).sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  const seenNames = new Set<string>();
  let complements = 0;
  let sameSubcategory = 0;
  const add = (item: typeof scored[number]) => {
    const name = normalize(item.candidate.name);
    if (!name || seenNames.has(name)) return false;
    seenNames.add(name);
    selected.push(item);
    if (item.complement) complements++;
    if (item.sameSubcategory) sameSubcategory++;
    return true;
  };
  // Prefer a balanced shelf: complements + close substitutes.
  for (const row of scored) {
    if (selected.length >= limit) break;
    if (row.complement && complements >= 3) continue;
    if (row.sameSubcategory && !row.complement && sameSubcategory >= 3) continue;
    add(row);
  }
  for (const row of scored) {
    if (selected.length >= limit) break;
    add(row);
  }
  return selected.map(row => row.candidate);
}

export async function fetchSmartRecommendations(product: Product): Promise<Product[]> {
  const keywordTerms = recommendationKeywords(product);
  if (product.commerce_source === 'marketplace') {
    if (!product.marketplace_branch_id) return [];
    const { getMarketplaceStoreCatalog } = await import('@/lib/marketplace');
    const catalogs = await Promise.allSettled([
      getMarketplaceStoreCatalog(product.marketplace_branch_id, null, 180),
      ...keywordTerms.map(term => getMarketplaceStoreCatalog(product.marketplace_branch_id!, term, 24)),
    ]);
    return rankProductRecommendations(product, catalogs.flatMap(result =>
      result.status === 'fulfilled' ? result.value : []));
  }

  const catalogs = await Promise.allSettled([
    getBranchCatalog({ mainCategoryId: product.main_category_id, limit: 160 }),
    ...keywordTerms.map(term => getBranchCatalog({ search: term, limit: 24 })),
  ]);
  const candidates = catalogs.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (catalogs.every(result => result.status === 'rejected')) throw new Error('RECOMMENDATIONS_UNAVAILABLE');
  return rankProductRecommendations(product, candidates);
}
