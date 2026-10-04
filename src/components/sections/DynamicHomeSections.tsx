import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Store } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BannersContainer from '@/components/ui/BannersContainer';
import BannerSkeleton from '@/components/ui/BannerSkeleton';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { Button } from '@/components/ui/button';
import HomeProductSection from './HomeProductSection';
import { useBranch } from '@/contexts/BranchContext';
import { buildHomeProductGroups, homeIds, homeLimit, homeProductMode, visibleHomeSections, HomeCollection } from '@/lib/homeMerchandising';
import { getHomePurchases } from '@/lib/homePurchases';
import { getNearbyMarketplaceStores } from '@/lib/marketplace';
import { loadSelectedDeliveryPoint } from '@/lib/branchRuntime';
import {
  defaultHomeSections,
  getHomeAnalyticsSessionKey,
  getHomeRecommendationIds,
  getPublicHomePage,
  HomeSectionConfig,
  trackHomeEvent,
} from '@/lib/homePage';
import { getCategories, getProducts, supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

const SectionHeading = ({ title, subtitle, href }: { title?: string | null; subtitle?: string | null; href?: string }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <div className="min-w-0">
      {title && <h2 className="text-xl font-black text-[#005931]">{title}</h2>}
      {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
    </div>
    {href && <Link to={href} className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold text-[#005931] hover:bg-emerald-50">عرض الكل<ChevronLeft size={17} /></Link>}
  </div>
);

const eventMetadata = (section: HomeSectionConfig) => ({
  section_type: section.section_type,
  experiment_key: section.experiment_key || null,
  experiment_variant: section.experiment_variant || null,
});

const TrackedSection = ({
  pageId,
  branchId,
  section,
  children,
}: {
  pageId?: string | null;
  branchId?: string | null;
  section: HomeSectionConfig;
  children: React.ReactNode;
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const impressionSent = React.useRef(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || !pageId || section.id.startsWith('fallback-') || typeof IntersectionObserver === 'undefined') return;
    impressionSent.current = false;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.25);
      if (visible && !impressionSent.current) {
        impressionSent.current = true;
        void trackHomeEvent(pageId, section.id, branchId, 'impression', eventMetadata(section));
        observer.disconnect();
      }
    }, { threshold: [0.25] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [pageId, branchId, section]);

  return (
    <div
      ref={ref}
      onClickCapture={event => {
        if (!pageId || section.id.startsWith('fallback-')) return;
        const metadata = eventMetadata(section);
        const target = event.target instanceof Element ? event.target : null;
        const button = target?.closest('button');
        const actionLabel = button?.getAttribute('aria-label')?.trim() || '';

        void trackHomeEvent(pageId, section.id, branchId, 'click', {
          ...metadata,
          action_label: actionLabel || undefined,
        });

        // ProductCard uses an Arabic aria-label beginning with "إضافة" only for the
        // first add action. Quantity increments use "زيادة", so cart intent is not
        // inflated by every + tap after the product is already in the cart.
        if (actionLabel.startsWith('إضافة')) {
          void trackHomeEvent(pageId, section.id, branchId, 'add_to_cart', {
            ...metadata,
            action_label: actionLabel.slice(0, 240),
          });
        }
      }}
    >
      {children}
    </div>
  );
};

const DynamicHomeSections = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, authLoading } = useUser();
  const { branch, branchLoading } = useBranch();
  const branchId = branch?.delivery_branch_id || null;
  const guestSessionKey = React.useMemo(() => getHomeAnalyticsSessionKey(), []);
  const experimentSeed = user?.id || guestSessionKey;
  const cacheScope = user?.id || `guest:${guestSessionKey}`;
  const homeQuery = useQuery({
    queryKey: ['public-home-page', branchId || 'global', cacheScope, experimentSeed],
    queryFn: () => getPublicHomePage(branchId, cacheScope, experimentSeed),
    enabled: !branchLoading && !authLoading,
    networkMode: 'always', staleTime: 30_000, refetchInterval: 60_000, refetchOnWindowFocus: true,
  });
  const sections = visibleHomeSections(homeQuery.data, defaultHomeSections, branchId);
  const needsBanners = sections.some(s => s.section_type === 'hero_banners');
  const needsCategories = sections.some(s => s.section_type === 'categories');
  const needsCollections = sections.some(s => s.section_type === 'product_collection');
  const needsSmart = sections.some(s => s.section_type === 'smart_recommendations');
  const needsStores = sections.some(s => s.section_type === 'featured_products' && homeProductMode(s) === 'nearby_stores');
  const needsPurchases = sections.some(s => s.section_type === 'featured_products' && homeProductMode(s) === 'buy_again');
  const needsCatalog = needsCollections || needsSmart || sections.some(s => s.section_type === 'featured_products' && homeProductMode(s) !== 'nearby_stores');
  const recommendationLimit = Math.max(12, ...sections.filter(s => s.section_type === 'smart_recommendations').map(s => homeLimit(s.data_source?.limit)));
  const pointQuery = useQuery({ queryKey: ['home-delivery-point', user?.id || 'guest'], queryFn: loadSelectedDeliveryPoint, enabled: needsStores && !authLoading, staleTime: 30_000 });
  React.useEffect(() => {
    const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['home-catalog-products'] }); void queryClient.invalidateQueries({ queryKey: ['home-delivery-point'] }); void queryClient.invalidateQueries({ queryKey: ['public-home-page'] }); };
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('delivery-address-changed', refresh);
    return () => { window.removeEventListener('guest-address-changed', refresh); window.removeEventListener('delivery-address-changed', refresh); };
  }, [queryClient]);
  const bannersQuery = useQuery({
    queryKey: ['active-banners'], enabled: needsBanners,
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').eq('active', true).order('position');
      if (error) throw error;
      return data || [];
    }, staleTime: 60_000, refetchInterval: 60_000,
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: getCategories, enabled: needsCategories, staleTime: 300_000 });
  const catalogQuery = useQuery({ queryKey: ['home-catalog-products', branchId], queryFn: () => getProducts(), enabled: needsCatalog && Boolean(branchId), staleTime: 30_000, refetchOnWindowFocus: true });
  const collectionsQuery = useQuery({
    queryKey: ['productCollections'], enabled: needsCollections,
    queryFn: async () => { const { data, error } = await supabase.from('product_collections').select('*').eq('active', true).order('position'); if (error) throw error; return (data || []) as HomeCollection[]; },
    staleTime: 30_000, refetchInterval: 60_000,
  });
  const recommendationQuery = useQuery({ queryKey: ['home-recommendations', branchId, user?.id || 'guest', recommendationLimit], queryFn: () => getHomeRecommendationIds(branchId, recommendationLimit), enabled: needsSmart && Boolean(branchId), staleTime: 60_000 });
  const purchasesQuery = useQuery({ queryKey: ['home-purchases', user?.id], queryFn: getHomePurchases, enabled: needsPurchases && Boolean(user) && !authLoading, staleTime: 30_000 });
  const storesQuery = useQuery({
    queryKey: ['home-nearby-stores', pointQuery.data?.latitude, pointQuery.data?.longitude, user?.id || 'guest'],
    queryFn: () => getNearbyMarketplaceStores(24), enabled: needsStores && Boolean(pointQuery.data), staleTime: 30_000,
  });
  const groups = React.useMemo(() => buildHomeProductGroups(sections, catalogQuery.data || [], collectionsQuery.data || [], recommendationQuery.data || [], purchasesQuery.data || []), [sections, catalogQuery.data, collectionsQuery.data, recommendationQuery.data, purchasesQuery.data]);
  if (branchLoading || authLoading || homeQuery.isLoading) return <div className="space-y-5"><div className="rounded-3xl bg-white p-4"><div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <CategorySkeleton key={i} />)}</div></div><BannerSkeleton /></div>;
  const usedBanners = new Set<string>();
  const renderSection = (section: HomeSectionConfig) => {
    const source = section.data_source || {};
    if (section.section_type === 'hero_banners') {
      if (bannersQuery.isLoading) return <BannerSkeleton />;
      const ids = homeIds(source.banner_ids);
      const now = Date.now();
      const banners = (bannersQuery.data || []).filter(b => (!ids.length || ids.includes(b.id)) && !usedBanners.has(b.id)
        && (!b.start_date || Date.parse(b.start_date) <= now) && (!b.end_date || Date.parse(b.end_date) > now)).slice(0, homeLimit(source.limit, 5));
      banners.forEach(b => usedBanners.add(b.id));
      if (!banners.length) return null;
      return <BannersContainer banners={banners} />;
    }
    if (section.section_type === 'categories') {
      const ids = homeIds(source.category_ids);
      const categories = (categoriesQuery.data || []).filter(c => !ids.length || ids.includes(c.id)).slice(0, homeLimit(source.limit, 6, 16));
      if (!categoriesQuery.isLoading && !categoriesQuery.isError && !categories.length) return null;
      return <section className="rounded-[28px] border border-[#d8ebdf] bg-white p-4 shadow-[0_8px_28px_rgba(0,89,49,0.05)] sm:p-5">
        <SectionHeading title={section.title || 'تسوق حسب القسم'} subtitle={section.subtitle} href="/categories" />
        {categoriesQuery.isLoading ? <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <CategorySkeleton key={i} />)}</div>
          : categoriesQuery.isError ? <div className="rounded-2xl bg-white p-4 text-center"><p className="mb-2 text-sm text-slate-600">تعذّر تحميل الأقسام</p><Button variant="outline" onClick={() => void categoriesQuery.refetch()}>إعادة المحاولة</Button></div>
          : <div className={section.display_config?.layout==='horizontal'?'hide-scrollbar flex gap-3 overflow-x-auto pb-1':'grid grid-cols-3 gap-2.5 sm:grid-cols-6'}>{categories.map(c => <div key={c.id} className={section.display_config?.layout==='horizontal'?'w-[124px] shrink-0 sm:w-[158px]':'min-w-0'}><CategoryItem category={c} variant="modern" onClick={() => navigate(`/category/${c.id}`)} /></div>)}</div>}
      </section>;
    }
    if (section.section_type === 'featured_products' && homeProductMode(section) === 'nearby_stores') {
      const stores = (storesQuery.data || []).filter(s => s.available_products > 0).slice(0, homeLimit(source.limit, 6));
      if (!stores.length) return null;
      return <section><SectionHeading title={section.title || 'متاجر قريبة منك'} subtitle={section.subtitle} href="/stores" /><div className={section.display_config?.layout==='grid'?'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3':'hide-scrollbar flex gap-3 overflow-x-auto pb-1'}>{stores.map(s => <Link to={`/stores/${s.branch_id}`} key={s.branch_id} className={`flex min-h-24 shrink-0 items-center gap-3 rounded-2xl border border-[#d8ebdf] bg-white p-3 ${section.display_config?.layout==='grid'?'min-w-0':'w-64'}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff5d3] text-[#005931]"><Store size={22} /></span><div className="min-w-0"><h3 className="truncate text-sm font-bold text-[#005931]">{s.merchant_name}</h3><p className="mt-1 truncate text-xs text-slate-500">{s.branch_name}</p><p className="mt-1 text-xs text-slate-500">توصيل {s.delivery_fee.toLocaleString('ar-EG')} ج.م</p></div></Link>)}</div></section>;
    }
    if (!branchId) return null;
    if (homeProductMode(section) === 'buy_again' && !user) return null;
    const loading = catalogQuery.isLoading || (section.section_type === 'product_collection' && collectionsQuery.isLoading) || (section.section_type === 'smart_recommendations' && recommendationQuery.isLoading) || (homeProductMode(section) === 'buy_again' && Boolean(user) && purchasesQuery.isLoading);
    const error = catalogQuery.isError || (section.section_type === 'product_collection' && collectionsQuery.isError) || (homeProductMode(section) === 'buy_again' && purchasesQuery.isError);
    const productGroups = groups.get(section.id) || [];
    if (!productGroups.length && (loading || error)) return <HomeProductSection section={section} products={[]} title={section.title || 'منتجات'} loading={loading} error={error} onRetry={() => { void catalogQuery.refetch(); void collectionsQuery.refetch(); }} />;
    if (!productGroups.some(g => g.products.length) && !loading && !error && catalogQuery.fetchStatus !== 'paused') return null;
    return <div className="space-y-5">{productGroups.map(g => <HomeProductSection key={g.key} section={section} products={g.products} title={g.title} subtitle={g.subtitle} smart={g.personalized} loading={loading} error={error} paused={!catalogQuery.data && catalogQuery.fetchStatus === 'paused'} onRetry={() => { void catalogQuery.refetch(); if (section.section_type === 'product_collection') void collectionsQuery.refetch(); if (homeProductMode(section) === 'buy_again') void purchasesQuery.refetch(); }} />)}</div>;
  };
  return <div className="space-y-6">{sections.map(section => { const content = renderSection(section); return content ? <TrackedSection key={section.id} pageId={homeQuery.data?.id} branchId={branchId} section={section}>{content}</TrackedSection> : null; })}</div>;
};

export default React.memo(DynamicHomeSections);
