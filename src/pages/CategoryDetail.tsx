import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Layers3, PackageSearch } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { MainCategory, Product, Subcategory, getCategories, getProducts, getSubcategories } from '@/lib/supabase';
import { getProductListWithVariants } from '@/utils/productUtils';

type ProductSection = {
  id: string;
  name: string;
  imageUrl?: string | null;
  products: Product[];
  subcategoryId?: string;
};

const PREVIEW_LIMIT = 6;

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
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
    if (uncategorized.length > 0) {
      grouped.push({ id: 'other', name: 'منتجات أخرى', products: uncategorized });
    }
    return grouped;
  }, [products, subcategories]);

  useEffect(() => {
    if (!sections.length) return;
    setActiveSection(current => current || sections[0].id);
  }, [sections]);

  useEffect(() => {
    if (!id) return;
    const key = `category-scroll:${id}`;
    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [id]);

  useEffect(() => {
    if (loading || !id || restoredScroll.current) return;
    restoredScroll.current = true;
    const saved = Number(sessionStorage.getItem(`category-scroll:${id}`) || 0);
    if (saved > 0) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: 'auto' }));
  }, [loading, id]);

  useEffect(() => {
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActiveSection(visible.target.id.replace('category-section-', ''));
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0.01, 0.2, 0.5] });

    sections.forEach(section => {
      const node = sectionRefs.current[section.id];
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [sections]);

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

  const openSubcategory = (section: ProductSection) => {
    if (section.subcategoryId && id) navigate(`/category/${id}/subcategory/${section.subcategoryId}`);
    else if (id) navigate(`/category/${id}/products`);
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar hideLogo showBackButton onBack={() => navigate(-1)} searchPlaceholder="دور داخل القسم…" onSearchFocus={() => navigate('/search')} />
        <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-2">
          <div className="mb-4 h-36 animate-pulse rounded-[28px] bg-emerald-50" />
          <div className="mb-5 flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-10 w-24 shrink-0 animate-pulse rounded-full bg-gray-100" />)}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
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
        <div className="px-4 sm:px-5">
          <section className="relative mb-5 overflow-hidden rounded-[28px] border border-emerald-100 bg-[#ecf8f2] min-h-[145px]">
            {categoryInfo?.image_url && (
              <img src={categoryInfo.image_url} alt="" className="absolute inset-y-0 left-0 h-full w-[46%] object-cover opacity-95" decoding="async" />
            )}
            <div className="absolute inset-0 bg-gradient-to-l from-[#eefaf4] via-[#eefaf4]/95 to-[#eefaf4]/30" />
            <div className="relative z-10 flex min-h-[145px] max-w-[72%] flex-col justify-center p-5 sm:p-6">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-[#005931] shadow-sm"><Layers3 size={18} /></div>
              <h1 className="text-2xl font-black leading-tight text-slate-950">{categoryInfo?.name || 'القسم'}</h1>
              <p className="mt-1.5 text-sm font-medium text-slate-600">{products.length ? `${products.length} منتج متاح` : 'اكتشف منتجات القسم'}</p>
              {products.length > 0 && id && (
                <button type="button" onClick={() => navigate(`/category/${id}/products`)} className="mt-3 flex w-fit items-center gap-1 text-sm font-bold text-[#005931]">
                  كل المنتجات <ChevronLeft size={16} />
                </button>
              )}
            </div>
          </section>
        </div>

        {subcategories.length > 0 && (
          <div
            className="sticky z-30 mb-5 border-y border-emerald-100/70 bg-[#f6f8f7]/95 py-2.5 backdrop-blur-xl"
            style={{ top: 'var(--top-nav-height, 68px)' }}
          >
            <div className="flex gap-2 overflow-x-auto px-4 sm:px-5" style={{ scrollbarWidth: 'none' }}>
              {subcategories.map(subcategory => {
                const selected = activeSection === subcategory.id;
                const count = products.filter(product => product.subcategory_id === subcategory.id).length;
                return (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => scrollToSection(subcategory.id)}
                    className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition ${selected ? 'border-[#005931] bg-[#005931] text-white shadow-sm' : 'border-emerald-100 bg-white text-slate-700'}`}
                    aria-pressed={selected}
                  >
                    {subcategory.image_url && <img src={subcategory.image_url} alt="" className="h-6 w-6 rounded-full object-cover" loading="lazy" />}
                    <span>{subcategory.name}</span>
                    {count > 0 && <span className={`text-[10px] ${selected ? 'text-emerald-100' : 'text-slate-400'}`}>{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-7 px-4 sm:px-5">
          {sections.map(section => {
            const preview = getProductListWithVariants(section.products).slice(0, PREVIEW_LIMIT);
            return (
              <section
                key={section.id}
                id={`category-section-${section.id}`}
                ref={node => { sectionRefs.current[section.id] = node; }}
                style={{ scrollMarginTop: 'calc(var(--top-nav-height, 68px) + 72px)' }}
              >
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-slate-950">{section.name}</h2>
                    <p className="mt-0.5 text-xs font-medium text-slate-400">{section.products.length} منتج</p>
                  </div>
                  <button type="button" onClick={() => openSubcategory(section)} className="flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-[#005931]">
                    عرض الكل <ChevronLeft size={16} />
                  </button>
                </div>

                <div className="flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-5 xl:grid-cols-6" style={{ scrollbarWidth: 'none' }}>
                  {preview.map(product => (
                    <div key={product.variantKey || product.id} className="w-[170px] min-w-[170px] snap-start sm:w-[190px] sm:min-w-[190px] md:w-auto md:min-w-0">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {sections.length === 0 && subcategories.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-black text-slate-950">الأقسام الفرعية</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {subcategories.map(subcategory => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => id && navigate(`/category/${id}/subcategory/${subcategory.id}`)}
                    className="overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 text-right shadow-sm"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-emerald-50">
                      {subcategory.image_url ? <img src={subcategory.image_url} alt={subcategory.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-2xl font-black text-[#005931]">{subcategory.name.charAt(0)}</div>}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-2.5"><span className="line-clamp-1 text-sm font-bold">{subcategory.name}</span><ChevronLeft size={15} className="text-[#005931]" /></div>
                  </button>
                ))}
              </div>
            </section>
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
