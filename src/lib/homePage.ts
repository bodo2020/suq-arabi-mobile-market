import { supabase } from '@/integrations/supabase/client';

export type HomeSectionType = 'hero_banners' | 'categories' | 'featured_products' | 'product_collection' | 'smart_recommendations';
export type HomeEventType = 'impression' | 'click' | 'add_to_cart';
export type HomeExperimentVariant = 'A' | 'B';

export interface HomeSectionConfig {
  id: string;
  section_key?: string | null;
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
  experiment_key?: string | null;
  experiment_variant?: HomeExperimentVariant | null;
}

export interface PublicHomePageConfig {
  id: string;
  name: string;
  version: number;
  published_at?: string | null;
  segments?: string[];
  sections: HomeSectionConfig[];
}

const CACHE_PREFIX = 'elmadawy_home_page_v3';
const SESSION_KEY = 'elmadawy_home_analytics_session_v1';
const cacheKey = (branchId?: string | null, scope = 'guest') => `${CACHE_PREFIX}:${branchId || 'global'}:${scope}`;

const readCachedHome = (branchId?: string | null, scope = 'guest'): PublicHomePageConfig | null => {
  try {
    const raw = localStorage.getItem(cacheKey(branchId, scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicHomePageConfig;
    return Array.isArray(parsed?.sections) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedHome = (branchId: string | null | undefined, scope: string, config: PublicHomePageConfig) => {
  try {
    localStorage.setItem(cacheKey(branchId, scope), JSON.stringify(config));
  } catch {
    // Live configuration remains available when storage is restricted.
  }
};

export const getHomeAnalyticsSessionKey = () => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const generated = globalThis.crypto?.randomUUID?.() || `home-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, generated);
    return generated;
  } catch {
    return `home-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

export const defaultHomeSections: HomeSectionConfig[] = [
  { id: 'fallback-banners', section_key: 'fallback-banners', section_type: 'hero_banners', title: 'العروض', sort_order: 10, is_active: true },
  { id: 'fallback-categories', section_key: 'fallback-categories', section_type: 'categories', title: 'تسوق حسب القسم', subtitle: 'وصل للي محتاجه بسرعة', sort_order: 20, is_active: true },
  { id: 'fallback-collections', section_key: 'fallback-collections', section_type: 'product_collection', title: 'مختارات سوبر ماركو', sort_order: 30, is_active: true, data_source: { all: true } },
];

export const getPublicHomePage = async (
  branchId?: string | null,
  cacheScope = 'guest',
  experimentSeed = getHomeAnalyticsSessionKey(),
): Promise<PublicHomePageConfig | null> => {
  try {
    const client = supabase as any;
    const { data, error } = await client.rpc('get_public_home_page', {
      p_branch_id: branchId || null,
      p_experiment_seed: experimentSeed,
    });
    if (error) throw error;
    if (!data || !Array.isArray(data.sections)) return readCachedHome(branchId, cacheScope);

    const config: PublicHomePageConfig = {
      ...data,
      sections: [...data.sections].sort((a: HomeSectionConfig, b: HomeSectionConfig) => Number(a.sort_order || 0) - Number(b.sort_order || 0)),
    };
    writeCachedHome(branchId, cacheScope, config);
    return config;
  } catch (error) {
    console.warn('Using cached/default home configuration:', error);
    return readCachedHome(branchId, cacheScope);
  }
};

export const getHomeRecommendationIds = async (branchId?: string | null, limit = 12): Promise<string[]> => {
  try {
    const client = supabase as any;
    const { data, error } = await client.rpc('get_home_recommendation_ids', {
      p_branch_id: branchId || null,
      p_limit: Math.max(3, Math.min(24, limit)),
    });
    if (error) throw error;
    return Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.warn('Home recommendations unavailable:', error);
    return [];
  }
};

export const trackHomeEvent = async (
  pageId: string,
  sectionId: string,
  branchId: string | null | undefined,
  eventType: HomeEventType,
  metadata: Record<string, unknown> = {},
) => {
  try {
    const client = supabase as any;
    const { error } = await client.rpc('track_home_event', {
      p_home_page_id: pageId,
      p_section_id: sectionId,
      p_branch_id: branchId || null,
      p_session_key: getHomeAnalyticsSessionKey(),
      p_event_type: eventType,
      p_metadata: metadata,
    });
    if (error) throw error;
  } catch (error) {
    console.debug('Home analytics event skipped:', error);
  }
};
