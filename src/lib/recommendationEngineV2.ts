import type { Product } from '@/lib/supabase';

/**
 * Recommendation V2: catalog-grounded candidate ranking. No model is trusted
 * to create products, set prices, cross store boundaries or alter the cart.
 * Optional learned scores are bounded inputs from a future Marko AI signal API.
 */
export type RecommendationKind = 'complement' | 'similar' | 'discover';
export type RecommendationSignals = Readonly<Record<string, number>>;
export type RecommendationContext = {
  cartProductIds?: readonly string[];
  learnedScores?: RecommendationSignals;
};
export type RankedRecommendation = {
  product: Product;
  kind: RecommendationKind;
  score: number;
};

const normalize = (value: string): string => String(value || '')
  .toLocaleLowerCase()
  .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const concepts: Record<string, readonly string[]> = {
  pasta: ['مكرونة', 'مكرونه', 'باستا', 'اسباجتي', 'سباجيتي', 'spaghetti', 'pasta'],
  sauce: ['صلصة', 'صلصه', 'صلصة طماطم', 'معجون طماطم', 'tomato paste'],
  cheese: ['جبنة', 'جبنه', 'cheese', 'موزاريلا', 'شيدر'],
  rice: ['ارز', 'رز', 'rice'],
  oil: ['زيت', 'oil'],
  bread: ['عيش', 'خبز', 'توست', 'bread'],
  tea: ['شاي', 'tea'],
  coffee: ['قهوة', 'قهوه', 'نسكافيه', 'بن محوج', 'بن سادة', 'coffee'],
  sugar: ['سكر', 'sugar'],
  biscuits: ['بسكويت', 'بسكوت', 'biscuits', 'cookies'],
  milk: ['حليب', 'لبن', 'milk'],
  cereals: ['كورنفلكس', 'كورن فليكس', 'شوفان', 'cereals', 'corn flakes'],
  chips: ['شيبسي', 'شيبس', 'مقرمشات', 'potato chips'],
  drinks: ['عصير', 'مشروب غازي', 'بيبسي', 'كولا', 'juice', 'soda'],
  detergent: ['مسحوق غسيل', 'مسحوق', 'سائل غسيل', 'منظف ملابس', 'detergent'],
  softener: ['منعم', 'معطر ملابس', 'fabric softener'],
  shampoo: ['شامبو', 'shampoo'],
  conditioner: ['بلسم', 'conditioner'],
  diapers: ['حفاضات', 'حفاض', 'بامبرز', 'diapers'],
  wipes: ['مناديل مبللة', 'مناديل مبلله', 'مناديل اطفال', 'baby wipes'],
};

// High-precision relationships, not generic keyword similarity.
// New relationships must be reviewed for regional meanings and tested.
const complementRelations: Record<string, readonly string[]> = {
  pasta: ['sauce', 'cheese', 'oil'],
  sauce: ['pasta'],
  rice: ['oil', 'sauce'],
  tea: ['sugar', 'biscuits', 'milk'],
  coffee: ['sugar', 'biscuits', 'milk'],
  milk: ['cereals', 'biscuits'],
  cereals: ['milk'],
  cheese: ['bread'],
  bread: ['cheese'],
  detergent: ['softener'],
  softener: ['detergent'],
  shampoo: ['conditioner'],
  conditioner: ['shampoo'],
  diapers: ['wipes'],
  wipes: ['diapers'],
  chips: ['drinks'],
  drinks: ['chips'],
};

const conceptEntries = Object.entries(concepts).map(([key, aliases]) => ({
  key,
  aliases: [...new Set(aliases.map(normalize))].filter(Boolean),
}));

function conceptsIn(name: string): Set<string> {
  const padded = ` ${normalize(name)} `;
  return new Set(conceptEntries
    .filter(({ aliases }) => aliases.some(alias => padded.includes(` ${alias} `)))
    .map(({ key }) => key));
}

function overlapCount(a: string, b: string): number {
  const words = new Set(normalize(a).split(' ').filter(word => word.length > 2));
  return normalize(b).split(' ').filter(word => word.length > 2 && words.has(word)).length;
}

function sameSaleSource(source: Product, candidate: Product): boolean {
  if (source.commerce_source === 'marketplace') {
    return !!source.marketplace_branch_id
      && candidate.commerce_source === 'marketplace'
      && candidate.marketplace_branch_id === source.marketplace_branch_id
      && (!source.merchant_id || candidate.merchant_id === source.merchant_id);
  }
  if (candidate.commerce_source === 'marketplace') return false;
  // An owned catalog is already address scoped. Also reject explicit branch mismatches.
  return !(source.delivery_branch_id && candidate.delivery_branch_id
    && source.delivery_branch_id !== candidate.delivery_branch_id);
}

function kindOf(source: Product, candidate: Product): RecommendationKind {
  const a = conceptsIn(source.name);
  const b = conceptsIn(candidate.name);
  const complement = [...a].some(key =>
    complementRelations[key]?.some(other => b.has(other) && !a.has(other)));
  if (complement) return 'complement';
  if ((!!source.subcategory_id && source.subcategory_id === candidate.subcategory_id)
    || [...a].some(key => b.has(key))
    || overlapCount(source.name, candidate.name) >= 2) return 'similar';
  return 'discover';
}

export function recommendationKeywords(product: Product): string[] {
  const keys = conceptsIn(product.name);
  const related = [...new Set([...keys].flatMap(key => complementRelations[key] || []))];
  return related.slice(0, 3).map(key => concepts[key]?.[0]).filter((s): s is string => !!s);
}

export function classifyRecommendation(source: Product, candidate: Product): RecommendationKind {
  return kindOf(source, candidate);
}

function stableTieBreak(a: string, b: string): number {
  const value = `${a}:${b}`;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++)
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) / 4294967296;
}

export function rankRecommendationCandidates(
  source: Product,
  candidates: readonly Product[],
  limit = 16,
  context: RecommendationContext = {},
): RankedRecommendation[] {
  if (limit <= 0) return [];
  const inCart = new Set(context.cartProductIds || []);
  const deduped = new Map<string, Product>();
  for (const candidate of candidates) {
    if (!candidate?.id || candidate.id === source.id || inCart.has(candidate.id)) continue;
    if (!normalize(candidate.name) || !sameSaleSource(source, candidate)) continue;
    if (!Number.isFinite(Number(candidate.quantity)) || Number(candidate.quantity) <= 0) continue;
    const price = Number(candidate.offer_price || candidate.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    deduped.set(candidate.id, candidate);
  }

  const ownPrice = Number(source.offer_price || source.price);
  const ranked = [...deduped.values()].map(candidate => {
    const kind = kindOf(source, candidate);
    const candidatePrice = Number(candidate.offer_price || candidate.price);
    const overlap = overlapCount(source.name, candidate.name);
    const priceCompatible = ownPrice > 0 && Math.abs(Math.log(candidatePrice / ownPrice)) < 0.8;
    const rawLearned = context.learnedScores?.[candidate.id];
    const learned = typeof rawLearned === 'number' && Number.isFinite(rawLearned)
      ? Math.max(0, Math.min(1, rawLearned)) * 25 : 0;
    const score = (kind === 'complement' ? 85 : kind === 'similar' ? 57 : 4)
      + (candidate.subcategory_id && candidate.subcategory_id === source.subcategory_id ? 18 : 0)
      + (candidate.main_category_id === source.main_category_id ? 9 : 0)
      + Math.min(15, overlap * 5)
      + (candidate.company_id && candidate.company_id === source.company_id ? 5 : 0)
      + (priceCompatible ? 5 : 0)
      + (candidate.is_offer ? 2 : 0)
      + learned
      + stableTieBreak(source.id, candidate.id) * 0.01;
    return { product: candidate, kind, score };
  }).sort((a, b) => b.score - a.score);

  const result: RankedRecommendation[] = [];
  const seenNames = new Set<string>();
  const caps: Record<RecommendationKind, number> = { complement: 6, similar: 6, discover: 4 };
  const counts: Record<RecommendationKind, number> = { complement: 0, similar: 0, discover: 0 };
  const add = (item: RankedRecommendation) => {
    const normalizedName = normalize(item.product.name);
    if (seenNames.has(normalizedName)) return false;
    seenNames.add(normalizedName);
    counts[item.kind]++;
    result.push(item);
    return true;
  };
  for (const item of ranked) {
    if (result.length >= limit) break;
    if (counts[item.kind] < caps[item.kind]) add(item);
  }
  for (const item of ranked) {
    if (result.length >= limit) break;
    add(item);
  }
  return result;
}
