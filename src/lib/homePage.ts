import { supabase } from '@/integrations/supabase/client';

export type HomeSectionType = 'hero_banners' | 'categories' | 'featured_products' | 'product_collection';

export interface HomeSectionConfig {
  id: string;
  section_type: HomeSectionType;
  title?: string | null;
  subtitle?: string | null;
  sort_order: number;
  is_active: boolean;
  data_source?: Record<string, unknown> | null;
  display_config?: Record<string, unknown> | null;
  starts_at?: string | null;
  ends_at?: string | null;
  branch_ids?: string[] | null;
}

export interface PublicHomePageConfig {
  id: string;
  name: string;
  version: number;
  published_at?: string | null;
  sections: HomeSectionConfig[];
}

const CACHE_PREFIX = 'elmadawy_home_page_v1';
const cacheKey = (branchId?: string | null) => `${CACHE_PREFIX}:${branchId || 'global'}`;

const readCachedHome = (branchId?: string | null): PublicHomePageConfig | null => {
  try {
    const raw = localStorage.getItem(cacheKey(branchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicHomePageConfig;
    return Array.isArray(parsed?.sections) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedHome = (branchId: string | null | undefined, config: PublicHomePageConfig) => {
  try {
    localStorage.setItem(cacheKey(branchId), JSON.stringify(config));
  } catch {
    // Storage can be unavailable in private/restricted WebViews; the live config still works.
  }
};

export const defaultHomeSections: HomeSectionConfig[] = [
  { id: 'fallback-banners', section_type: 'hero_banners', title: 'العروض', sort_order: 10, is_active: true },
  { id: 'fallback-categories', section_type: 'categories', title: 'تسوق حسب القسم', subtitle: 'وصل للي محتاجه بسرعة', sort_order: 20, is_active: true },
  { id: 'fallback-collections', section_type: 'product_collection', title: 'مختارات المعداوي', sort_order: 30, is_active: true, data_source: { all: true } },
];

export const getPublicHomePage = async (branchId?: string | null): Promise<PublicHomePageConfig | null> => {
  try {
    const client = supabase as any;
    const { data, error } = await client.rpc('get_public_home_page', { p_branch_id: branchId || null });
    if (error) throw error;
    if (!data || !Array.isArray(data.sections)) return readCachedHome(branchId);

    const config: PublicHomePageConfig = {
      ...data,
      sections: [...data.sections].sort((a: HomeSectionConfig, b: HomeSectionConfig) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    };
    writeCachedHome(branchId, config);
    return config;
  } catch (error) {
    console.warn('Using cached/default home configuration:', error);
    return readCachedHome(branchId);
  }
};
