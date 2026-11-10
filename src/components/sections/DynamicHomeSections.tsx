import React from 'react';
import CategoryTile from '@/components/categories/CategoryTile';
import { categoryArt, categoryStyle } from '@/lib/categoryStyle';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BannersContainer from '@/components/ui/BannersContainer';
import BannerSkeleton from '@/components/ui/BannerSkeleton';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import ProductCollectionsSection from '@/components/sections/ProductCollectionsSection';
import HomeCategoryRails from '@/components/sections/HomeCategoryRails';
import { inStock, inStockCounts, orderCategoriesForHome, useBranchCatalog } from '@/hooks/useBranchCatalog';
import { pickForRail } from '@/lib/homeRanking';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import {
  defaultHomeSections,
  getHomeAnalyticsSessionKey,
  getHomeBestSellers,
  getMyBuyAgainIds,
  getHomeRecommendationIds,
  getPublicHomePage,
  HomeSectionConfig,
  trackHomeEvent,
} from '@/lib/homePage';
import { getCategories, getCurrentDeliveryBranchId, MainCategory, Product, supabase } from '@/lib/supabase';
import { getRegularVariants } from '@/utils/productUtils';
import { useUser } from '@/contexts/UserContext';

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
    if (!node || !pageId || section.id.startsWith('fallback-')) return;
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
  }, [pageId, branchId, section.id, section.section_type, section.experiment_key, section.experiment_variant]);

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

const DynamicHomeSections = ({ hidePromotions = false, showBanners = false }: { hidePromotions?: boolean; showBanners?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const guestSessionKey = React.useMemo(() => getHomeAnalyticsSessionKey(), []);
  const experimentSeed = user?.id || guestSessionKey;
  const cacheScope = user?.id || `guest:${guestSessionKey}`;

  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: getCurrentDeliveryBranchId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const homeQuery = useQuery({
    queryKey: ['public-home-page', branchQuery.data || 'global', cacheScope, experimentSeed],
    queryFn: () => getPublicHomePage(branchQuery.data || null, cacheScope, experimentSeed),
    enabled: !branchQuery.isLoading,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const sections = React.useMemo<HomeSectionConfig[]>(() => {
    const configured = homeQuery.data?.sections;
    const available = configured?.length ? configured : defaultHomeSections;
    return hidePromotions ? available.filter(section => section.section_type === 'hero_banners' ? showBanners : !/(عروض|خصومات|فلاش|offers|flash)/i.test(section.title || '')) : available;
  }, [homeQuery.data, hidePromotions, showBanners]);

  const needsBanners = sections.some(section => section.section_type === 'hero_banners');
  const needsCategories = sections.some(section => section.section_type === 'categories');
  const needsFeatured = sections.some(section => section.section_type === 'featured_products');
  const needsSmart = sections.some(section => section.section_type === 'smart_recommendations');
  const needsRails = sections.some(section => section.section_type === 'category_rails');
  const needsNew = sections.some(section => section.section_type === 'new_arrivals');
  const needsBest = sections.some(section => section.section_type === 'best_sellers');
  const needsBuyAgain = sections.some(section => section.section_type === 'buy_again');
  // The catalog also tells the categories grid which sections have stock.
  const needsCatalog = needsFeatured || needsSmart || needsRails || needsNew || needsCategories || needsBest || needsBuyAgain;
  const recommendationLimit = React.useMemo(() => Math.max(12, ...sections
    .filter(section => section.section_type === 'smart_recommendations')
    .map(section => Math.max(3, Math.min(24, Number(section.data_source?.limit || 12))))), [sections]);

  const bannersQuery = useQuery({
    queryKey: ['active-banners'],
    enabled: needsBanners,
    queryFn: async () => {
      const { data, error } = await supabase.from('banners').select('*').eq('active', true).order('position');
      if (error) throw error;
      const now = Date.now();
      return (data || []).filter(banner => {
        const starts = banner.start_date ? new Date(banner.start_date).getTime() : null;
        const ends = banner.end_date ? new Date(banner.end_date).getTime() : null;
        return (!starts || starts <= now) && (!ends || ends > now);
      });
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: needsCategories || needsRails,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const catalogQuery = useBranchCatalog(needsCatalog);
  const catalog = catalogQuery.data || [];
  const availableCatalog = React.useMemo(() => (catalogQuery.data || []).filter(inStock), [catalogQuery.data]);
  const homeCategories = React.useMemo(
    () => orderCategoriesForHome(categoriesQuery.data || [], catalogQuery.data ? inStockCounts(catalogQuery.data) : null),
    [categoriesQuery.data, catalogQuery.data],
  );

  // Month's best sellers: their own rail, and the weight that ranks products inside every other rail.
  const bestSellersQuery = useQuery({
    queryKey: ['home-best-sellers', branchQuery.data],
    queryFn: () => getHomeBestSellers(branchQuery.data || null),
    enabled: needsCatalog && Boolean(branchQuery.data),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const buyAgainQuery = useQuery({
    queryKey: ['home-buy-again', user?.id],
    queryFn: getMyBuyAgainIds,
    enabled: needsBuyAgain && Boolean(user?.id),
    staleTime: 5 * 60_000,
  });

  const sold = bestSellersQuery.data?.sold;
  const productById = React.useMemo(() => new Map(availableCatalog.map(product => [product.id, product])), [availableCatalog]);
  const byIds = React.useCallback((ids: string[] | undefined) => (ids || [])
    .map(id => productById.get(id))
    .filter((product): product is Product => Boolean(product)), [productById]);

  // The customer's usual products, most bought first, lightly reshuffled each open.
  const buyAgainPicks = React.useMemo(
    () => pickForRail(byIds(buyAgainQuery.data).slice(0, 24), { limit: 12, rotation: 1, perFamily: 3 }),
    [byIds, buyAgainQuery.data],
  );
  // Top sellers that are in stock, rotating among the top 30.
  const bestPicks = React.useMemo(() => pickForRail(byIds(bestSellersQuery.data?.ids).slice(0, 30), {
    limit: 12, sold, rotation: 1.2, exclude: new Set(buyAgainPicks.map(product => product.id)),
  }), [byIds, bestSellersQuery.data, sold, buyAgainPicks]);
  // Lower rails skip what these two already show.
  const shownAbove = React.useMemo(
    () => new Set([...buyAgainPicks, ...bestPicks].map(product => product.id)),
    [buyAgainPicks, bestPicks],
  );

  const recommendationQuery = useQuery({
    queryKey: ['home-recommendations', branchQuery.data, user?.id || 'guest', recommendationLimit],
    queryFn: () => getHomeRecommendationIds(branchQuery.data || null, recommendationLimit),
    enabled: needsSmart && Boolean(branchQuery.data),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (branchQuery.isLoading || homeQuery.isLoading) {
    return <div className="space-y-7"><BannerSkeleton /><div className="rounded-3xl bg-white p-4"><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <CategorySkeleton key={i} />)}</div></div></div>;
  }

  const renderProductRail = (products: Product[], loading: boolean, title: string, subtitle?: string | null, smart = false) => (
    <section className={HOME_SECTION_CARD}>
      <div className="relative">
        {smart && <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-xl bg-brand-cream text-[#005931]"><Sparkles size={16} /></span>}
        <HomeSectionHeader title={title} subtitle={subtitle} />
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : products.length ? (
        <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-3" dir="rtl">{getRegularVariants(products).map(product => <div key={product.variantKey} className="w-[112px] shrink-0 sm:w-[148px]"><ProductCard product={product} /></div>)}</div>
      ) : null}
    </section>
  );

  const renderSection = (section: HomeSectionConfig) => {
    const source = section.data_source || {};
    const sectionTitle = section.title || undefined;
    const sectionSubtitle = section.subtitle || undefined;

    if (section.section_type === 'hero_banners') {
      if (bannersQuery.isLoading) return <BannerSkeleton />;
      if (!bannersQuery.data?.length) return null;
      return <BannersContainer banners={bannersQuery.data} />;
    }

    if (section.section_type === 'categories') {
      const categories = homeCategories;
      return (
        <section className={HOME_SECTION_CARD}>
          <HomeSectionHeader title={sectionTitle || 'تسوق حسب القسم'} subtitle={sectionSubtitle} />
          {categoriesQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">{Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)}</div>
          ) : categoriesQuery.isError && !categoriesQuery.data ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center"><p className="mb-3 text-sm text-gray-600">تعذّر تحميل الأقسام</p><Button variant="outline" onClick={() => categoriesQuery.refetch()}>إعادة المحاولة</Button></div>
          ) : (
            // Same cards as the categories page; every section that has something to order.
            <div className="cat-grid">
              {categories.map((cat: MainCategory, index: number) => (
                <CategoryTile
                  key={cat.id}
                  name={cat.name}
                  color={categoryStyle(cat.name, index).color}
                  images={[]}
                  art={categoryArt(cat.id)}
                  fallbackImage={cat.image_url}
                  onClick={() => navigate(`/category/${cat.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      );
    }

    if (section.section_type === 'buy_again') {
      // Only for customers who have bought more than 5 different products (the server returns nothing before that).
      if (!user?.id || !buyAgainPicks.length) return null;
      return renderProductRail(buyAgainPicks, false, sectionTitle || 'اشتريها تاني', sectionSubtitle || 'الحاجات اللي بتشتريها على طول');
    }

    if (section.section_type === 'best_sellers') {
      if (!branchQuery.data) return null;
      const loading = catalogQuery.isLoading || bestSellersQuery.isLoading;
      if (!loading && !bestPicks.length) return null;
      const windowDays = bestSellersQuery.data?.windowDays || 7;
      const subtitle = windowDays <= 7 ? 'أكتر حاجات اتباعت الأسبوع ده' : windowDays <= 31 ? 'أكتر حاجات اتباعت الشهر ده' : 'أكتر حاجات بيطلبها عملاءنا';
      return renderProductRail(bestPicks, loading, sectionTitle || 'الأكثر مبيعًا', sectionSubtitle || subtitle);
    }

    if (section.section_type === 'featured_products') {
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      const products = availableCatalog.slice(0, limit);
      if (!branchQuery.data) return null;
      return renderProductRail(products, catalogQuery.isLoading, sectionTitle || 'منتجات مميزة', sectionSubtitle);
    }

    if (section.section_type === 'smart_recommendations') {
      if (!branchQuery.data) return null;
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      const productMap = new Map(availableCatalog.map(product => [product.id, product]));
      const recommended = (recommendationQuery.data || []).map(id => productMap.get(id)).filter((product): product is Product => Boolean(product)).slice(0, limit);
      const fallback = recommended.length ? recommended : availableCatalog.slice(0, limit);
      return renderProductRail(
        fallback,
        catalogQuery.isLoading || recommendationQuery.isLoading,
        sectionTitle || 'مقترحة ليك',
        sectionSubtitle || (user ? 'اختيارات مبنية على تسوقك السابق' : 'الأكثر طلبًا عند عملائنا'),
        true,
      );
    }

    if (section.section_type === 'new_arrivals') {
      if (!branchQuery.data) return null;
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      // Rotate among the newest arrivals rather than always the same latest few.
      const newest = pickForRail([...availableCatalog]
        .filter(product => product.created_at)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, limit * 3), { limit, rotation: 3, exclude: shownAbove });
      return renderProductRail(newest, catalogQuery.isLoading, sectionTitle || 'وصل جديد', sectionSubtitle || 'أحدث المنتجات اللي نزلت المحل');
    }

    if (section.section_type === 'category_rails') {
      if (!branchQuery.data) return null;
      return <HomeCategoryRails categories={homeCategories} catalog={catalog} sold={sold} exclude={shownAbove} loading={catalogQuery.isLoading || categoriesQuery.isLoading} />;
    }

    if (section.section_type === 'product_collection') {
      const collectionId = typeof source.collection_id === 'string' ? source.collection_id : undefined;
      const all = source.all === true;
      return <ProductCollectionsSection collectionId={all ? undefined : collectionId} titleOverride={collectionId ? sectionTitle : undefined} subtitleOverride={collectionId ? sectionSubtitle : undefined} />;
    }

    return null;
  };

  return (
    <div className="space-y-7">
      {sections.filter(section => section.is_active !== false).map(section => {
        const content = renderSection(section);
        if (!content) return null;
        return (
          <TrackedSection key={section.section_key || section.id} pageId={homeQuery.data?.id} branchId={branchQuery.data} section={section}>
            {content}
          </TrackedSection>
        );
      })}
    </div>
  );
};

export default React.memo(DynamicHomeSections);
