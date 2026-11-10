import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { categoryArt } from '@/lib/categoryStyle';
import { getSubcategories, type MainCategory, type Product } from '@/lib/supabase';
import { displayOrder, inStock } from '@/hooks/useBranchCatalog';
import { getProductListWithVariants } from '@/utils/productUtils';

type Subcategory = { id: string; name: string; category_id: string };

const RAIL_LIMIT = 12;

/** Mounts its children only once the box gets near the screen (15 rails of cards is a lot to paint at once). */
function NearScreen({ minHeight, children }: { minHeight: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    if (typeof IntersectionObserver === 'undefined') { setNear(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: '700px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);
  return <div ref={ref} style={near ? undefined : { minHeight }}>{near ? children : null}</div>;
}

function CategoryRail({ category, products, subcategories }: { category: MainCategory; products: Product[]; subcategories: Subcategory[] }) {
  const [selected, setSelected] = React.useState<string | null>(null);

  // Only subsections that have something to order right now get a chip.
  const chips = React.useMemo(() => {
    const withStock = new Set(products.map(product => product.subcategory_id).filter(Boolean));
    return subcategories.filter(sub => withStock.has(sub.id));
  }, [products, subcategories]);

  const shown = React.useMemo(() => {
    const list = selected ? products.filter(product => product.subcategory_id === selected) : products;
    return getProductListWithVariants(displayOrder(list).slice(0, RAIL_LIMIT));
  }, [products, selected]);

  return (
    <section className={HOME_SECTION_CARD}>
      <HomeSectionHeader title={category.name.trim()} icon={categoryArt(category.id)} href={`/category/${category.id}`} />
      {chips.length > 1 && (
        <div className="hide-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1" dir="rtl" role="tablist" aria-label={`أقسام ${category.name}`}>
          {[{ id: null as string | null, name: 'الكل' }, ...chips].map(chip => {
            const on = selected === chip.id;
            return (
              <button
                key={chip.id || 'all'}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSelected(chip.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${on
                  ? 'border-[#005931] bg-[#005931] text-white'
                  : 'border-[#dfe8e3] bg-white text-[#23382d] dark:border-white/10 dark:bg-[#17211b] dark:text-[#dbe8e0]'}`}
              >
                {chip.name.trim()}
              </button>
            );
          })}
        </div>
      )}
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2" dir="rtl">
        {shown.map(product => (
          <div key={product.variantKey} className="w-[112px] shrink-0 sm:w-[148px]"><ProductCard product={product} /></div>
        ))}
      </div>
    </section>
  );
}

/** One rail per section (in the home grid's order) with its orderable products and subsection chips. */
export default function HomeCategoryRails({ categories, catalog, loading }: { categories: MainCategory[]; catalog: Product[]; loading: boolean }) {
  const subcategoriesQuery = useQuery({
    queryKey: ['categories', 'subcategories-all'],
    queryFn: () => getSubcategories() as Promise<Subcategory[]>,
    staleTime: 15 * 60_000,
  });

  const byCategory = React.useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    for (const product of catalog) {
      if (product.main_category_id && inStock(product)) (grouped[product.main_category_id] ||= []).push(product);
    }
    return grouped;
  }, [catalog]);

  const subsByCategory = React.useMemo(() => {
    const grouped: Record<string, Subcategory[]> = {};
    for (const sub of subcategoriesQuery.data || []) (grouped[sub.category_id] ||= []).push(sub);
    return grouped;
  }, [subcategoriesQuery.data]);

  if (loading) {
    return (
      <section className={HOME_SECTION_CARD}>
        <div className="mb-4 h-7 w-40 rounded-full bg-[#eef3f0]" />
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {categories.filter(category => byCategory[category.id]?.length).map(category => (
        <NearScreen key={category.id} minHeight={290}>
          <CategoryRail category={category} products={byCategory[category.id]} subcategories={subsByCategory[category.id] || []} />
        </NearScreen>
      ))}
    </div>
  );
}
