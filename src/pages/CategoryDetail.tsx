import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Layers3, PackageSearch } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import NextCategoryPrompt from '@/components/sections/NextCategoryPrompt';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import SmartImage from '@/components/ui/SmartImage';
import { MainCategory, Product, Subcategory, getCategories, getProducts, getSubcategories } from '@/lib/supabase';
import { getProductListWithVariants } from '@/utils/productUtils';

type ProductSection = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products: Product[];
  subcategoryId?: string;
};

const CHIP_BAR_HEIGHT = 58;

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [nextCategory, setNextCategory] = useState<MainCategory | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');
  const [chipsPinned, setChipsPinned] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const chipAnchorRef = useRef<HTMLDivElement | null>(null);
  const restoredScroll = useRef(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [categoriesData, subcategoriesData, productsData] = await Promise.all([
          getCategories(),
          getSubcategories(id),
          getProducts(id, false),
        ]);
        if (!active) return;
        setCategoryInfo(categoriesData.find(category => category.id === id) || null);
        const nextIndex = categoriesData.findIndex(category => category.id === id) + 1;
        setNextCategory(nextIndex > 0 && nextIndex < categoriesData.length ? categoriesData[nextIndex] : null);
        setSubcategories(subcategoriesData);
        setProducts(productsData.filter(product => Number(product.quantity || 0) > 0));
      } catch (error) {
        console.error('Error fetching category shopping journey:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchData();
    return () => { active = false; };
  }, [id]);

  const sections = useMemo<ProductSection[]>(() => {
    const grouped: ProductSection[] = subcategories.map(subcategory => ({
      id: subcategory.id,
      subcategoryId: subcategory.id,
      name: subcategory.name,
      imageUrl: subcategory.image_url,
      products: products.filter(product => product.subcategory_id === subcategory.id),
    })).filter(section => section.products.length > 0);

    const uncategorized = products.filter(product => !product.subcategory_id || !subcategories.some(item => item.id === product.subcategory_id));
    if (uncategorized.length > 0) grouped.push({ id: 'other', name: 'منتجات أخرى', products: uncategorized });
    return grouped;
  }, [products, subcategories]);

  const visibleSubcategories = useMemo(
    () => subcategories.filter(subcategory => sections.some(section => section.subcategoryId === subcategory.id)),
    [sections, subcategories],
  );

  useEffect(() => {
    if (!sections.length) {
      setActiveSection('');
      return;
    }
    setActiveSection(current => sections.some(section => section.id === current) ? current : sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (!activeSection) return;
    const chip = chipRefs.current[activeSection];
    if (!chip) return;
    requestAnimationFrame(() => {
      chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }, [activeSection]);

  useEffect(() => {
    restoredScroll.current = false;
    if (!id) return;
    const key = `category-scroll:${id}`;
    return () => { sessionStorage.setItem(key, String(window.scrollY)); };
  }, [id]);

  useEffect(() => {
    if (loading || !id || restoredScroll.current) return;
    restoredScroll.current = true;
    const saved = Number(sessionStorage.getItem(`category-scroll:${id}`) || 0);
    if (saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }));
  }, [loading, id]);

  useEffect(() => {
    if (!sections.length || !visibleSubcategories.length) return;
    let frame = 0;

    const readTopNavHeight = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue('--top-nav-height');
      return Number.parseFloat(value) || 68;
    };

    const updateFromScroll = () => {
      frame = 0;
      const topNavHeight = readTopNavHeight();
      const anchor = chipAnchorRef.current;
      if (anchor) {
        const shouldPin = anchor.getBoundingClientRect().top <= topNavHeight + 1;
        setChipsPinned(current => current === shouldPin ? current : shouldPin);
      }

      const activationLine = topNavHeight + CHIP_BAR_HEIGHT + 18;
      let nextSection = sections[0]?.id || '';

      for (const section of sections) {
        const node = sectionRefs.current[section.id];
        if (!node) continue;
        if (node.getBoundingClientRect().top <= activationLine) nextSection = section.id;
        else break;
      }

      const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6;
      if (atPageEnd && sections.length > 0) nextSection = sections[sections.length - 1].id;

      if (nextSection) setActiveSection(current => current === nextSection ? current : nextSection);
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    window.addEventListener('orientationchange', requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('orientationchange', requestUpdate);
    };
  }, [sections, visibleSubcategories.length]);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (!element) {
      const subcategory = subcategories.find(item => item.id === sectionId);
      if (subcategory && id) navigate(`/category/${id}/subcategory/${subcategory.id}`);
      return;
    }
    setActiveSection(sectionId);
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar hideLogo showBackButton onBack={() => navigate(-1)} searchPlaceholder="دور داخل القسم…" onSearchFocus={() => navigate('/search')} />
        <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-2 sm:px-4">
          <div className="mb-4 h-36 animate-pulse rounded-[28px] bg-emerald-50" />
          <div className="mb-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-gray-100" />)}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TopNavBar hideLogo showBackButton onBack={() => navigate(-1)} searchPlaceholder="دور داخل القسم…" onSearchFocus={() => navigate('/search')} />

      <div className="mx-auto w-full max-w-7xl pb-10 pt-1">
        <div className="px-3 sm:px-5">
          <section className="relative mb-4 min-h-[135px] overflow-hidden rounded-[24px] border border-emerald-100 bg-[#ecf8f2] sm:mb-5 sm:min-h-[145px] sm:rounded-[28px]">
            {categoryInfo?.image_url && (
              <div className="absolute inset-y-0 left-0 h-full w-[46%] bg-white">
                <SmartImage src={categoryInfo.image_url} alt="" preloadMargin="1000px 0px" className="h-full w-full object-cover opacity-95" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-[#eefaf4] via-[#eefaf4]/95 to-[#eefaf4]/30" />
            <div className="relative z-10 flex min-h-[135px] max-w-[74%] flex-col justify-center p-4 sm:min-h-[145px] sm:p-6">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-[#005931] shadow-sm sm:h-9 sm:w-9"><Layers3 size={18} /></div>
              <h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">{categoryInfo?.name || 'القسم'}</h1>
              <p className="mt-1.5 text-xs font-medium text-slate-600 sm:text-sm">{products.length ? `${products.length} منتج متاح` : 'اكتشف منتجات القسم'}</p>
              {products.length > 0 && id && (
                <button type="button" onClick={() => navigate(`/category/${id}/products`)} className="mt-2.5 flex w-fit items-center gap-1 text-xs font-bold text-[#005931] sm:mt-3 sm:text-sm">
                  كل المنتجات <ChevronLeft size={16} />
                </button>
              )}
            </div>
          </section>
        </div>

        {visibleSubcategories.length > 0 && (
          <div ref={chipAnchorRef} className="relative mb-5 h-[58px]">
            <div
              className={`${chipsPinned ? 'fixed inset-x-0 z-[45]' : 'absolute inset-x-0 top-0 z-40'} border-y border-emerald-100/70 bg-white py-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.05)]`}
              style={chipsPinned ? { top: 'var(--top-nav-height, 68px)' } : undefined}
            >
              <div className="mx-auto w-full max-w-7xl">
                <div className="hide-scrollbar flex w-full flex-nowrap gap-1.5 overflow-x-auto scroll-smooth px-3 sm:gap-2 sm:px-5" dir="rtl">
                  {visibleSubcategories.map(subcategory => {
                    const selected = activeSection === subcategory.id;
                    const count = products.filter(product => product.subcategory_id === subcategory.id).length;
                    return (
                      <button
                        key={subcategory.id}
                        ref={node => { chipRefs.current[subcategory.id] = node; }}
                        type="button"
                        onClick={() => scrollToSection(subcategory.id)}
                        className={`flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-bold transition-colors duration-150 sm:h-10 sm:gap-2 sm:px-3.5 sm:text-sm ${selected ? 'border-[#005931] bg-[#005931] text-white shadow-sm' : 'border-emerald-100 bg-white text-slate-700'}`}
                        aria-pressed={selected}
                      >
                        {subcategory.image_url && (
                          <span className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-white sm:h-6 sm:w-6">
                            <SmartImage src={subcategory.image_url} alt="" preloadMargin="900px 0px" className="h-full w-full object-cover" />
                          </span>
                        )}
                        <span>{subcategory.name}</span>
                        {count > 0 && <span className={`text-[9px] sm:text-[10px] ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className="space-y-6 px-3 sm:space-y-7 sm:px-5"
          data-category-product-sections
          data-next-category-path={nextCategory ? `/category/${nextCategory.id}` : undefined}
          data-next-category-name={nextCategory?.name}
        >
          {sections.map(section => {
            const sectionProducts = getProductListWithVariants(section.products);
            return (
              <section
                key={section.id}
                id={`category-section-${section.id}`}
                ref={node => { sectionRefs.current[section.id] = node; }}
                style={{ scrollMarginTop: 'calc(var(--top-nav-height, 68px) + 74px)' }}
              >
                <div className="mb-2.5 flex items-end justify-between gap-3 sm:mb-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{section.name}</h2>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400 sm:text-xs">{section.products.length} منتج</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6">
                  {sectionProducts.map(product => <ProductCard key={product.variantKey || product.id} product={product} />)}
                </div>
              </section>
            );
          })}

          {sections.length === 0 && subcategories.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-black text-slate-950">الأقسام الفرعية</h2>
              <div className="hide-scrollbar flex gap-2.5 overflow-x-auto pb-2" dir="rtl">
                {subcategories.map(subcategory => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => id && navigate(`/category/${id}/subcategory/${subcategory.id}`)}
                    className="w-[112px] shrink-0 overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 text-right shadow-sm sm:w-[140px]"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
                      {subcategory.image_url ? <SmartImage src={subcategory.image_url} alt={subcategory.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-2xl font-black text-[#005931]">{subcategory.name.charAt(0)}</div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-2.5"><span className="line-clamp-1 text-xs font-bold sm:text-sm">{subcategory.name}</span><ChevronLeft size={15} className="text-[#005931]" /></div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {nextCategory && (
            <NextCategoryPrompt name={nextCategory.name} onNext={() => navigate(`/category/${nextCategory.id}`)} />
          )}

          {subcategories.length === 0 && products.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#005931]"><PackageSearch size={22} /></div>
              <p className="font-bold text-slate-800">مفيش منتجات متاحة في القسم حاليًا</p>
              <button type="button" onClick={() => navigate('/categories')} className="mt-2 text-sm font-semibold text-[#005931]">اختار قسم تاني</button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CategoryDetail;
