import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers3, PackageSearch } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import ProductCard from '@/components/ui/ProductCard';
import SmartImage from '@/components/ui/SmartImage';
import {
  getCategories, getProducts, getSubcategories, type MainCategory, type Product, type Subcategory,
} from '@/lib/supabase';
import { getProductListWithVariants } from '@/utils/productUtils';

type CategoryContent = { products: Product[]; subcategories: Subcategory[] };
type Chip = { id: string; name: string };
type JourneyChip = Chip & { categoryId: string };

const categoryContentKey = (categoryId: string) => ['customer-continuous-category', categoryId] as const;
const getCategoryContent = async (categoryId: string): Promise<CategoryContent> => {
  const [products, subcategories] = await Promise.all([
    getProducts(categoryId, false), getSubcategories(categoryId),
  ]);
  return {
    products: products.filter(item => Number(item.quantity || 0) > 0),
    subcategories: subcategories as Subcategory[],
  };
};

const topOffset = () => {
  if (typeof document === 'undefined') return 155;
  const nav = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-nav-height')) || 68;
  // One sticky subcategory rail (52px) plus breathing room for headings.
  return nav + 62;
};

const jumpTo = (element: HTMLElement | null, smooth = true) => {
  if (!element) return;
  const y = element.getBoundingClientRect().top + window.scrollY - topOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
};

/** A permanently mounted category section. Its content is only fetched near the viewport. */
const JourneyCategory = React.memo(function JourneyCategory({
  category, index, orderedCategories, eager, boundaryPull, onChips,
}: {
  category: MainCategory;
  index: number;
  orderedCategories: MainCategory[];
  eager: boolean;
  boundaryPull: -1 | 0 | 1;
  onChips: (categoryId: string, chips: Chip[]) => void;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [near, setNear] = useState(eager);
  const query = useQuery({
    queryKey: categoryContentKey(category.id),
    queryFn: () => getCategoryContent(category.id),
    enabled: near,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (near || !containerRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '950px 0px 950px 0px', threshold: 0 });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [near]);

  const sections = useMemo(() => {
    const products = query.data?.products || [];
    const subcategories = query.data?.subcategories || [];
    const grouped = subcategories.map(subcategory => ({
      id: subcategory.id,
      name: subcategory.name,
      products: products.filter(product => product.subcategory_id === subcategory.id),
    })).filter(section => section.products.length > 0);
    const remaining = products.filter(product =>
      !product.subcategory_id || !subcategories.some(item => item.id === product.subcategory_id)
    );
    if (remaining.length) grouped.push({ id: 'other', name: 'منتجات أخرى', products: remaining });
    return grouped;
  }, [query.data]);

  useEffect(() => {
    if (query.data) onChips(category.id, sections.map(section => ({ id: section.id, name: section.name })));
  }, [query.data, category.id, sections, onChips]);

  const next = orderedCategories[index + 1];
  return (
    <section
      ref={containerRef}
      id={`journey-category-${category.id}`}
      data-journey-category={category.id}
      className={`min-h-[270px] scroll-mt-40 pb-8 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${near ? "translate-y-0 opacity-100" : "translate-y-2 opacity-90"}`}
    >
      <div className={`relative mb-3 flex min-h-[86px] items-center overflow-hidden rounded-[20px] border border-emerald-100 bg-[#ecf8f2] px-4 py-3 sm:min-h-[108px] sm:px-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.2,0.8,0.3,1.2)] motion-reduce:transform-none ${boundaryPull === 1 ? 'translate-x-2' : boundaryPull === -1 ? '-translate-x-2' : 'translate-x-0'}`}>
        {category.image_url && (
          <div className="absolute inset-y-0 left-0 w-[38%] opacity-30">
            <SmartImage src={category.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="relative z-10 min-w-0">
          <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#005931]">
            <Layers3 size={18} />
          </span>
          <h2 className="text-xl font-black text-[#005931] sm:text-2xl">{category.name}</h2>
          <p className="mt-1 text-xs text-slate-600">
            {query.data ? `${query.data.products.length} منتج متاح` : 'اكتشف منتجات القسم'}
          </p>
        </div>
      </div>

      {query.isError ? (
        <button type="button" onClick={() => { setNear(true); void query.refetch(); }} className="w-full rounded-2xl bg-white p-5 text-[#005931]">
          تعذّر تحميل المنتجات · اضغط لإعادة المحاولة
        </button>
      ) : !query.data ? (
        <div className="space-y-3" role="status" aria-label={`تحميل ${category.name}`}>
          <div className="h-6 w-32 animate-pulse rounded-lg bg-emerald-100" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[.67] animate-pulse rounded-2xl bg-white" />)}
          </div>
        </div>
      ) : (
        <div
          className="space-y-7 motion-safe:animate-fade-in"
          data-category-product-sections
          data-next-category-path={next ? `/category/${next.id}` : undefined}
          data-next-category-name={next?.name}
        >
          {sections.map(section => (
            <div key={section.id} id={`journey-sub-${category.id}-${section.id}`} data-journey-sub-id={section.id} className="scroll-mt-40">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950 sm:text-lg">{section.name}</h3>
                  <p className="text-xs text-slate-400">{section.products.length} منتج</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
                {getProductListWithVariants(section.products).map(item => (
                  <ProductCard key={item.variantKey || item.id} product={item} />
                ))}
              </div>
            </div>
          ))}
          {!sections.length && (
            <div className="rounded-2xl border border-dashed border-emerald-100 bg-white px-5 py-8 text-center text-sm text-slate-600">
              مفيش منتجات متاحة في القسم حاليًا.
            </div>
          )}
        </div>
      )}
    </section>
  );
});

export default function CategoryJourney() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ['customer-main-categories-journey'],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  const categories = categoriesQuery.data || [];
  const initialIndex = categories.findIndex(category => category.id === id);
  const [activeCategory, setActiveCategory] = useState(id || '');
  const [readyForId, setReadyForId] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [subChips, setSubChips] = useState<Record<string, Chip[]>>({});
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [boundaryCue, setBoundaryCue] = useState<{ id: string; direction: -1 | 1 } | null>(null);
  const previousVisibleIndex = useRef<number | null>(null);
  const cueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollStartedFor = useRef<string | null>(null);
  const userScrolledBeforeAnchor = useRef(false);

  // Initial data may finish loading after a user starts swiping. Never let
  // the delayed starting-position anchor override their scroll gesture.
  useEffect(() => {
    const markUserScroll = () => { userScrolledBeforeAnchor.current = true; };
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    window.addEventListener('wheel', markUserScroll, { passive: true });
    return () => {
      window.removeEventListener('touchmove', markUserScroll);
      window.removeEventListener('wheel', markUserScroll);
    };
  }, []);

  const onChips = useCallback((categoryId: string, chips: Chip[]) => {
    setSubChips(prev => {
      const before = prev[categoryId] || [];
      if (before.length === chips.length && before.every((chip, i) => chip.id === chips[i].id && chip.name === chips[i].name)) return prev;
      return { ...prev, [categoryId]: chips };
    });
  }, []);

  // Fetch the starting category and the one ABOVE it before anchoring the
  // viewport. Later inserts should never make the current screen jump down.
  // Fetch the next category in parallel as lower-priority background work.
  useEffect(() => {
    if (!id || !categories.length) return;
    let active = true;
    if (initialIndex < 0) { setReadyForId(id); return; }
    const makeQuery = (cat: MainCategory) => ({
      queryKey: categoryContentKey(cat.id),
      queryFn: () => getCategoryContent(cat.id),
      staleTime: 60_000,
    });
    const essential = categories.slice(Math.max(0, initialIndex - 1), initialIndex + 1);
    void Promise.allSettled(essential.map(cat => client.fetchQuery(makeQuery(cat))))
      .then(() => { if (active) setReadyForId(id); });
    const next = categories[initialIndex + 1];
    if (next) void client.prefetchQuery(makeQuery(next));
    return () => { active = false; };
  }, [client, categories, id, initialIndex]);

  const isReady = readyForId === id;

  useLayoutEffect(() => {
    if (!isReady || initialIndex < 0 || !id || scrollStartedFor.current === id) return;
    scrollStartedFor.current = id;
    setActiveCategory(id);
    setVisibleIndex(initialIndex);
    const frame = requestAnimationFrame(() => {
      // The full ordered category skeleton is mounted, so both above and below
      // sections remain reachable without pushing a new route.
      if (!userScrolledBeforeAnchor.current) jumpTo(document.getElementById(`journey-category-${id}`), false);
    });
    return () => cancelAnimationFrame(frame);
  }, [id, initialIndex, isReady]);

  useEffect(() => {
    if (!categories.length || !isReady) return;
    let frame = 0;
    const observeScroll = () => {
      frame = 0;
      const line = topOffset() + 20;
      let currentIndex = 0;
      for (let i = 0; i < categories.length; i++) {
        const element = document.getElementById(`journey-category-${categories[i].id}`);
        if (element && element.getBoundingClientRect().top <= line) currentIndex = i;
        else break;
      }
      const current = categories[currentIndex];
      if (!current) return;
      if (previousVisibleIndex.current !== null && previousVisibleIndex.current !== currentIndex) {
        const direction = (currentIndex > previousVisibleIndex.current ? 1 : -1) as -1 | 1;
        setBoundaryCue({ id: current.id, direction });
        if (cueTimer.current) clearTimeout(cueTimer.current);
        cueTimer.current = setTimeout(() => setBoundaryCue(null), 160);
      }
      previousVisibleIndex.current = currentIndex;
      setVisibleIndex(prev => prev === currentIndex ? prev : currentIndex);
      setActiveCategory(prev => prev === current.id ? prev : current.id);

      const parent = document.getElementById(`journey-category-${current.id}`);
      let sub = '';
      for (const element of Array.from(parent?.querySelectorAll<HTMLElement>('[data-journey-sub-id]') || [])) {
        if (element.getBoundingClientRect().top <= line + 20) sub = element.dataset.journeySubId || '';
        else break;
      }
      setActiveSubcategory(prev => prev === sub ? prev : sub);
    };
    const requestScroll = () => { if (!frame) frame = requestAnimationFrame(observeScroll); };
    requestScroll();
    window.addEventListener('scroll', requestScroll, { passive: true });
    window.addEventListener('resize', requestScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestScroll);
      window.removeEventListener('resize', requestScroll);
      if (cueTimer.current) clearTimeout(cueTimer.current);
    };
  }, [categories, isReady]);

  useEffect(() => {
    const rail = railRef.current;
    const active = subRefs.current[`${activeCategory}:${activeSubcategory}`];
    if (!rail || !active) return;

    // scrollIntoView() also scrolls ancestors (including the entire page).
    // Move only the horizontal chip rail, leaving vertical touch scrolling
    // and the user's current product/category position completely untouched.
    const railRect = rail.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const distance = activeRect.left + activeRect.width / 2
      - (railRect.left + railRect.width / 2);
    if (Math.abs(distance) < 12) return;
    rail.scrollBy({
      left: distance,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [activeSubcategory, activeCategory]);

  // The one rail spans all loaded subcategories in catalog order. Adjacent
  // main categories are prefetched before their chips reach the viewport.
  const chips = useMemo<JourneyChip[]>(() => categories.flatMap(category =>
    (subChips[category.id] || []).map(chip => ({ ...chip, categoryId: category.id }))
  ), [categories, subChips]);

  useEffect(() => {
    if (!categories.length || !activeCategory) return;
    const currentIndex = categories.findIndex(category => category.id === activeCategory);
    if (currentIndex < 0) return;
    for (const adjacent of [categories[currentIndex - 1], categories[currentIndex + 1]]) {
      if (!adjacent) continue;
      void client.prefetchQuery({
        queryKey: categoryContentKey(adjacent.id),
        queryFn: () => getCategoryContent(adjacent.id),
        staleTime: 60_000,
      });
    }
  }, [activeCategory, categories, client]);

  if (categoriesQuery.isLoading || (categories.length > 0 && !isReady)) return (
    <MainLayout><TopNavBar hideLogo hideSearch pageTitle="الأقسام" showBackButton onBack={() => navigate(-1)} />
      <div className="flex min-h-[60vh] items-center justify-center"><BrandLoader /></div>
    </MainLayout>
  );
  if (categoriesQuery.isError || !categories.length) return (
    <MainLayout><TopNavBar hideLogo hideSearch pageTitle="الأقسام" showBackButton onBack={() => navigate(-1)} />
      <div className="p-6 text-center"><PackageSearch className="mx-auto mb-3 text-[#005931]" size={28} /><p>الأقسام مش متاحة حاليًا.</p></div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch pageTitle="تصفح الأقسام" showBackButton onBack={() => navigate('/categories')} />
      <div className="mx-auto max-w-7xl pb-20">
        <div className="sticky z-[45] bg-white/95 shadow-sm backdrop-blur-xl"
          style={{ top: 'var(--top-nav-height, 68px)' }}>
          <div ref={railRef} className="hide-scrollbar flex h-[52px] items-center gap-1.5 overflow-x-auto px-3" dir="rtl" aria-label="الأقسام الفرعية المتصلة">
            {chips.length ? chips.map((chip, index) => {
              const selected = chip.categoryId === activeCategory && chip.id === activeSubcategory;
              const mainBoundary = index > 0 && chips[index - 1].categoryId !== chip.categoryId;
              return (
                <React.Fragment key={`${chip.categoryId}:${chip.id}`}>
                  {mainBoundary && <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-emerald-200" />}
                  <button
                    ref={node => { subRefs.current[`${chip.categoryId}:${chip.id}`] = node; }}
                    type="button"
                    onClick={() => jumpTo(document.getElementById(`journey-sub-${chip.categoryId}-${chip.id}`))}
                    aria-current={selected ? 'true' : undefined}
                    className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition-colors duration-200 ${selected ? 'bg-[#005931] text-white' : 'bg-emerald-50 text-slate-600 hover:bg-emerald-100'}`}
                  >{chip.name}</button>
                </React.Fragment>
              );
            }) : <span className="text-xs font-medium text-slate-400">تصفح منتجات {categories[visibleIndex]?.name || ''}</span>}
          </div>
        </div>

        <div data-continuous-category-journey className="space-y-8 px-3 pt-4 sm:px-5">
          {categories.map((category, index) => (
            <JourneyCategory
              key={category.id}
              category={category}
              index={index}
              orderedCategories={categories}
              eager={Math.abs(index - Math.max(initialIndex, 0)) <= 1}
              boundaryPull={boundaryCue?.id === category.id ? boundaryCue.direction : 0}
              onChips={onChips}
            />
          ))}
        </div>
        <div className="px-4 py-8 text-center text-xs text-slate-400">وصلت لآخر الأقسام · اسحب لفوق علشان ترجع للأقسام اللي قبلها</div>
      </div>
    </MainLayout>
  );
}
