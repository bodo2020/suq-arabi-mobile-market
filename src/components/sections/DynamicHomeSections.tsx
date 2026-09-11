import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BannersContainer from '@/components/ui/BannersContainer';
import BannerSkeleton from '@/components/ui/BannerSkeleton';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import ProductCollectionsSection from '@/components/sections/ProductCollectionsSection';
import { defaultHomeSections, getPublicHomePage, HomeSectionConfig } from '@/lib/homePage';
import { getCategories, getCurrentDeliveryBranchId, getProducts, MainCategory, supabase } from '@/lib/supabase';
import { getProductListWithVariants } from '@/utils/productUtils';

const SectionHeading = ({ title, subtitle, href }: { title?: string | null; subtitle?: string | null; href?: string }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <div className="min-w-0">
      {title && <h2 className="text-xl font-black text-slate-950">{title}</h2>}
      {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
    </div>
    {href && <Link to={href} className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold text-[#005931] hover:bg-emerald-50">عرض الكل<ChevronLeft size={17} /></Link>}
  </div>
);

const DynamicHomeSections = () => {
  const navigate = useNavigate();
  const branchQuery = useQuery({
    queryKey: ['delivery-branch-id'],
    queryFn: getCurrentDeliveryBranchId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const homeQuery = useQuery({
    queryKey: ['public-home-page', branchQuery.data || 'global'],
    queryFn: () => getPublicHomePage(branchQuery.data || null),
    enabled: !branchQuery.isLoading,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const sections = React.useMemo<HomeSectionConfig[]>(() => {
    const configured = homeQuery.data?.sections;
    return configured?.length ? configured : defaultHomeSections;
  }, [homeQuery.data]);

  const needsBanners = sections.some(section => section.section_type === 'hero_banners');
  const needsCategories = sections.some(section => section.section_type === 'categories');
  const needsFeatured = sections.some(section => section.section_type === 'featured_products');

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

  const featuredQuery = useQuery({
    queryKey: ['home-featured-products', branchQuery.data],
    queryFn: () => getProducts(),
    enabled: needsFeatured && Boolean(branchQuery.data),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (branchQuery.isLoading || homeQuery.isLoading) {
    return <div className="space-y-7"><BannerSkeleton /><div className="rounded-3xl bg-white p-4"><div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <CategorySkeleton key={i} />)}</div></div></div>;
  }

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
      return (
        <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <SectionHeading title={sectionTitle || 'تسوق حسب القسم'} subtitle={sectionSubtitle || 'وصل للي محتاجه بسرعة'} href="/categories" />
          {categoriesQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">{Array.from({ length: 7 }).map((_, i) => <CategorySkeleton key={i} />)}</div>
          ) : categoriesQuery.isError ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center"><p className="mb-3 text-sm text-gray-600">تعذّر تحميل الأقسام</p><Button variant="outline" onClick={() => categoriesQuery.refetch()}>إعادة المحاولة</Button></div>
          ) : (
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide md:grid md:grid-cols-6 md:overflow-visible lg:grid-cols-8">
              {categories.map((cat: MainCategory) => <div key={cat.id} className="w-24 shrink-0 snap-start md:w-auto"><CategoryItem category={cat} onClick={() => navigate(`/category/${cat.id}`)} /></div>)}
            </div>
          )}
        </section>
      );
    }

    if (section.section_type === 'featured_products') {
      const limit = Math.max(3, Math.min(24, Number(source.limit || 12)));
      const products = getProductListWithVariants(featuredQuery.data || []).slice(0, limit);
      if (!branchQuery.data) return null;
      return (
        <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
          <SectionHeading title={sectionTitle || 'منتجات مميزة'} subtitle={sectionSubtitle} />
          {featuredQuery.isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : products.length ? (
            <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-3" dir="rtl">{products.map(product => <div key={product.variantKey} className="w-[112px] shrink-0 sm:w-[148px]"><ProductCard product={product} /></div>)}</div>
          ) : null}
        </section>
      );
    }

    if (section.section_type === 'product_collection') {
      const collectionId = typeof source.collection_id === 'string' ? source.collection_id : undefined;
      const all = source.all === true;
      return <ProductCollectionsSection collectionId={all ? undefined : collectionId} titleOverride={collectionId ? sectionTitle : undefined} subtitleOverride={collectionId ? sectionSubtitle : undefined} />;
    }

    return null;
  };

  return <div className="space-y-7">{sections.filter(section => section.is_active !== false).map(section => <React.Fragment key={section.id}>{renderSection(section)}</React.Fragment>)}</div>;
};

export default React.memo(DynamicHomeSections);
