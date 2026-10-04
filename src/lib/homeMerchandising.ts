import type { HomeSectionConfig, PublicHomePageConfig } from './homePage';
import type { Product } from './supabase';
import type { BranchRuntimeContext } from './branchRuntime';

export type HomeProductMode = 'catalog' | 'offers' | 'buy_again' | 'nearby_stores';
export type HomePurchase = {
  id: string;
  source_channel: string;
  status: string;
  created_at: string;
  items?: unknown;
  tracking_number?: string | null;
};
export type HomeCollection = { id: string; title: string; description?: string | null; products?: string[] | null };
export type HomeProductGroup = { key: string; title: string; subtitle?: string | null; products: Product[]; personalized: boolean };

export const homeLimit = (value: unknown, fallback = 12, maximum = 24) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(maximum, Math.max(1, Math.floor(parsed))) : fallback;
};
export const homeIds = (value: unknown): string[] => Array.isArray(value)
  ? Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))) : [];
export const homeProductMode = (section: HomeSectionConfig): HomeProductMode => {
  const mode = section.data_source?.mode;
  return mode === 'offers' || mode === 'buy_again' || mode === 'nearby_stores' ? mode : 'catalog';
};
export const homeProductKey = (product: Product) => `${product.id}:${product.marketplace_listing_id || 'owned'}`;
export const hasRealHomeOffer = (product: Product) => Number(product.offer_price) > 0 && Number(product.offer_price) < Number(product.price);

// An empty published page is intentional. Only missing configuration uses defaults.
// Repeat branch/time checks for cached pages, without reassigning server A/B cohorts.
export function visibleHomeSections(config: PublicHomePageConfig | null | undefined, fallback: HomeSectionConfig[], branchId?: string | null, now = Date.now()) {
  return (config ? config.sections : fallback).filter(section => {
    const starts = section.starts_at ? Date.parse(section.starts_at) : null;
    const ends = section.ends_at ? Date.parse(section.ends_at) : null;
    return section.is_active !== false
      && (starts === null || (Number.isFinite(starts) && starts <= now))
      && (ends === null || (Number.isFinite(ends) && ends > now))
      && (!section.branch_ids?.length || Boolean(branchId && section.branch_ids.includes(branchId)));
  }).sort((a, b) => a.sort_order - b.sort_order);
}

export function homePurchasedProducts(catalog: Product[], purchases: HomePurchase[]) {
  const ordered = [...purchases].filter(row => row.status === 'delivered' || row.status === 'store_completed')
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const result: Product[] = [];
  const seen = new Set<string>();
  for (const row of ordered) {
    for (const item of Array.isArray(row.items) ? row.items : []) {
      if (!item || typeof item !== 'object') continue;
      const id = item.product_id || item.product?.id;
      if (typeof id !== 'string') continue; // Never guess identity from the old name/price.
      const listing = item.marketplace_listing_id || item.listing_id;
      const partner = item.source_kind === 'marketplace' || Boolean(listing);
      const product = catalog.find(p => p.id === id && (partner
        ? Boolean(p.marketplace_listing_id && (listing ? p.marketplace_listing_id === listing : p.marketplace_branch_id === item.branch_id))
        : !p.marketplace_listing_id));
      if (product && Number(product.quantity) > 0 && !seen.has(homeProductKey(product))) {
        result.push(product); seen.add(homeProductKey(product));
      }
    }
  }
  return result;
}

export function buildHomeProductGroups(sections: HomeSectionConfig[], catalog: Product[], collections: HomeCollection[], recommendations: string[], purchases: HomePurchase[]) {
  const used = new Set<string>();
  const groups = new Map<string, HomeProductGroup[]>();
  const purchased = homePurchasedProducts(catalog, purchases);
  for (const section of sections) {
    const source = section.data_source || {};
    const display = section.display_config || {};
    const mode = homeProductMode(section);
    const limit = homeLimit(source.limit);
    const configuredIds = homeIds(source.product_ids);
    const categoryIds = homeIds(source.category_ids);
    const take = (products: Product[]) => {
      const within = new Set<string>();
      return products.filter(p => {
        const key = homeProductKey(p);
        if (within.has(key) || (display.dedupe !== false && used.has(key))) return false;
        if (source.include_unavailable !== true && !(Number(p.quantity) > 0)) return false;
        if (categoryIds.length && !categoryIds.includes(p.main_category_id)) return false;
        within.add(key); return true;
      }).slice(0, limit).map(p => { used.add(homeProductKey(p)); return p; });
    };
    let candidates = configuredIds.length ? configuredIds.flatMap(id => catalog.filter(p => p.id === id)) : catalog;
    let personalized = false;
    if (section.section_type === 'featured_products' && mode !== 'nearby_stores') {
      if (mode === 'offers') candidates = candidates.filter(hasRealHomeOffer);
      if (mode === 'buy_again') candidates = configuredIds.length ? purchased.filter(p => configuredIds.includes(p.id)) : purchased;
      groups.set(section.id, [{ key: section.id, title: section.title || (mode === 'offers' ? 'عروض تستاهل' : mode === 'buy_again' ? 'اشتري تاني' : 'تصفح المنتجات'), subtitle: section.subtitle, products: take(candidates), personalized: false }]);
    } else if (section.section_type === 'smart_recommendations') {
      const recommended = recommendations.flatMap(id => catalog.filter(p => p.id === id));
      candidates = configuredIds.length ? candidates : recommended.length ? recommended : candidates;
      personalized = recommended.length > 0;
      groups.set(section.id, [{ key: section.id, title: section.title || 'مقترحة ليك', subtitle: section.subtitle || (personalized ? 'اقتراحات للتسوق من الفرع المتاح' : 'اكتشف منتجات متاحة لعنوانك'), products: take(candidates), personalized }]);
    } else if (section.section_type === 'product_collection') {
      const selected = source.all === true ? collections : collections.filter(c => c.id === source.collection_id);
      groups.set(section.id, selected.map(c => ({ key: `${section.id}:${c.id}`, title: selected.length === 1 ? section.title || c.title : c.title,
        subtitle: selected.length === 1 ? section.subtitle ?? c.description : c.description,
        products: take(homeIds(c.products).flatMap(id => catalog.filter(p => p.id === id))), personalized: false })));
    }
  }
  return groups;
}

export const activeHomePurchase = (purchases: HomePurchase[]) => [...purchases]
  .filter(p => p.source_channel === 'online' && ['pending', 'confirmed', 'preparing', 'ready', 'shipped'].includes(p.status))
  .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];

export function homeDeliverySummary(branch: BranchRuntimeContext | null, now = new Date()) {
  if (!branch) return null;
  const parseClock = (value: string | null) => {
    const match = value?.match(/^(\d{2}):(\d{2})/);
    return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const opens = parseClock(branch.opens_at), closes = parseClock(branch.closes_at);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minute = Number(parts.find(p => p.type === 'hour')?.value) * 60 + Number(parts.find(p => p.type === 'minute')?.value);
  const inHours = opens === null || closes === null ? null : opens === closes ? true
    : opens < closes ? minute >= opens && minute < closes : minute >= opens || minute < closes;
  const eta = Number(branch.estimated_delivery_minutes);
  const fee = Number(branch.delivery_fee);
  return {
    available: branch.delivery_enabled && inHours !== false,
    label: !branch.delivery_enabled ? 'التوصيل متوقف مؤقتًا' : inHours === false ? 'خارج مواعيد التوصيل' : inHours === true ? 'متاح حسب مواعيد الفرع' : 'التوصيل متاح',
    eta: branch.delivery_enabled && inHours !== false && Number.isFinite(eta) && eta > 0 ? `${eta} دقيقة تقريبًا` : null,
    fee: branch.delivery_fee != null && Number.isFinite(fee) && fee >= 0 ? fee : null,
  };
}
