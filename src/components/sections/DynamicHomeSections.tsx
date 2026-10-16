import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BannersContainer from '@/components/ui/BannersContainer';
import BannerSkeleton from '@/components/ui/BannerSkeleton';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import ProductCollectionsSection from '@/components/sections/ProductCollectionsSection';
import {
  defaultHomeSections,
  getHomeAnalyticsSessionKey,
  getHomeRecommendationIds,
  getPublicHomePage,
  HomeSectionConfig,
  trackHomeEvent,
} from '@/lib/homePage';
import { getCategories, getCurrentDeliveryBranchId, getProducts, MainCategory, Product, supabase } from '@/lib/supabase';
import { getProductListWithVariants } from '@/utils/productUtils';
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
  const needsCatalog = needsFeatured || needsSmart;
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
    enabled: needsCategories,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });

  const catalogQuery = useQuery({
    queryKey: ['home-catalog-products', branchQuery.data],
    queryFn: () => getProducts(),
    enabled: needsCatalog && Boolean(branchQuery.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

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

  const renderProductRail = (products: Product[], loading: boolean, title: string, subtitle?: string | null, smart = false) => !loading && !products.length ? null : (
    <section className="rounded-[28px] border border-[#d8ebdf] bg-white p-4 shadow-[0_8px_28px_rgba(0,89,49,0.05)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {smart && <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-[#005931]"><Sparkles size={16} /></span>}
            <h2 className="text-xl font-black text-[#005931]">{title}</h2>
          </div>
          {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      ) : products.length ? (
        <div className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2" dir="rtl">{getProductListWithVariants(products).map(product => <div key={product.variantKey} className="w-[124px] shrink-0 snap-start sm:w-[158px]"><ProductCard product={product} hideIfUnavailable={false} /></div>)}</div>
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
      return <div className="overflow-hidden rounded-3xl shadow-sm"><BannersContainer banners={bannersQuery.data} /></div>;
    }

    if (section.section_type === 'categories') {
      const categories = categoriesQuery.data || [];
      if (!categoriesQuery.isLoading && !categoriesQuery.isError && !categories.length) return null;
      return (
        <section className="rounded-[28px] border border-[#d8ebdf] bg-white p-4 shadow-[0_8px_28px_rgba(0,89,49,0.05)] sm:p-5">
          <SectionHeading title={sectionTitle || 'تسوق حسب القسم'} subtitle={sectionSubtitle || 'وصل للي محتاجه بسرعة'} href="/categories" />
          {categoriesQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-3">{Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)}</div>
          ) : categoriesQuery.isError ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center"><p className="mb-3 text-sm text-gray-600">تعذّر تحميل الأقسام</p><Button variant="outline" onClick={() => categoriesQuery.refetch()}>إعادة المحاولة</Button></div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              {categories.slice(0, 6).map((cat: MainCategory) => <CategoryItem key={cat.id} category={cat} variant="modern" onClick={() => navigate(`/category/${cat.id}`)} />)}
            </div>
          )}
        </section>
      );
    }

    if (section.section_type === 'featured_products') {
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      const products = (catalogQuery.data || []).slice(0, limit);
      if (!branchQuery.data) return null;
      return renderProductRail(products, catalogQuery.isLoading, sectionTitle || 'منتجات مميزة', sectionSubtitle);
    }

    if (section.section_type === 'smart_recommendations') {
      if (!branchQuery.data) return null;
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      const catalog = catalogQuery.data || [];
      const productMap = new Map(catalog.map(product => [product.id, product]));
      const recommended = (recommendationQuery.data || []).map(id => productMap.get(id)).filter((product): product is Product => Boolean(product)).slice(0, limit);
      const fallback = recommended.length ? recommended : catalog.slice(0, limit);
      return renderProductRail(
        fallback,
        catalogQuery.isLoading || recommendationQuery.isLoading,
        sectionTitle || 'مقترحة ليك',
        sectionSubtitle || (user ? 'اختيارات مبنية على تسوقك السابق' : 'الأكثر طلبًا عند عملائنا'),
        true,
      );
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
