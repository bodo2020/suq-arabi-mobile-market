import React from 'react';
import { useQuery } from '@tanstack/react-query';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { categoryArt } from '@/lib/categoryStyle';
import { getSubcategories, type MainCategory, type Product } from '@/lib/supabase';
import { inStock } from '@/hooks/useBranchCatalog';
import { pickForRail } from '@/lib/homeRanking';
import { getRegularVariants } from '@/utils/productUtils';

type Subcategory = { id: string; name: string; category_id: string };

type Group = {
  key: string;
  title: string;
  subtitle?: string;
  icon: string | null;
  href: string;
  products: Product[];
  score: number;
};

/** Products per group row. */
const GROUP_LIMIT = 10;
/** Groups shown per app open; the rest rotate in on later opens (all are in the sections grid). */
const GROUPS_PER_OPEN = 8;
/** A group needs at least this many orderable products. */
const MIN_GROUP_PRODUCTS = 4;

const OPEN_SEED = Math.random();

/** Mounts its children only once the box gets near the screen. */
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

function GroupRail({ group, sold, exclude }: { group: Group; sold?: Map<string, number>; exclude?: Set<string> }) {
  const shown = React.useMemo(
    () => getRegularVariants(pickForRail(group.products, { limit: GROUP_LIMIT, sold, exclude })),
    [group.products, sold, exclude],
  );
  if (!shown.length) return null;
  return (
    <section className={HOME_SECTION_CARD}>
      <HomeSectionHeader title={group.title} subtitle={group.subtitle} icon={group.icon} href={group.href} />
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2" dir="rtl">
        {shown.map(product => (
          <div key={product.variantKey} className="w-[112px] shrink-0 sm:w-[148px]"><ProductCard product={product} /></div>
        ))}
      </div>
    </section>
  );
}

/**
 * Product groups under the fixed rails. Instead of one long row per section,
 * the groups are specific subsections ("زبادي", "شيبس", "بن"...) that are
 * selling this week, plus a rotating share of the others, so every open
 * shows a different handful. At most one group per section in the first
 * pass (two if needed to fill), and a section with no subsections falls
 * back to a single group for the whole section.
 */
export default function HomeCategoryRails({ categories, catalog, sold, exclude, loading }: {
  categories: MainCategory[];
  catalog: Product[];
  sold?: Map<string, number>;
  exclude?: Set<string>;
  loading: boolean;
}) {
  const subcategoriesQuery = useQuery({
    queryKey: ['categories', 'subcategories-all'],
    queryFn: () => getSubcategories() as Promise<Subcategory[]>,
    staleTime: 15 * 60_000,
  });

  const groups = React.useMemo(() => {
    const categoryById = new Map(categories.map(category => [category.id, category]));
    const bySub = new Map<string, Product[]>();
    const byCategoryNoSub = new Map<string, Product[]>();
    for (const product of catalog) {
      if (!inStock(product) || !product.main_category_id || !categoryById.has(product.main_category_id)) continue;
      if (product.subcategory_id) {
        const list = bySub.get(product.subcategory_id) || [];
        list.push(product);
        bySub.set(product.subcategory_id, list);
      } else {
        const list = byCategoryNoSub.get(product.main_category_id) || [];
        list.push(product);
        byCategoryNoSub.set(product.main_category_id, list);
      }
    }

    // Selling this week counts most; the random share rotates the rest in.
    const scoreOf = (products: Product[]) =>
      products.reduce((sum, product) => sum + Math.log1p(sold?.get(product.id) || 0), 0);
    // Stable per app open, different next open.
    const rotation = (key: string) => {
      let h = Math.floor(OPEN_SEED * 2 ** 31);
      for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x5bd1e995) ^ (h >>> 15);
      return ((h >>> 0) / 4294967296) * 3;
    };

    const candidates: (Group & { categoryId: string })[] = [];
    for (const sub of subcategoriesQuery.data || []) {
      const products = bySub.get(sub.id) || [];
      const category = categoryById.get(sub.category_id);
      if (!category || products.length < MIN_GROUP_PRODUCTS) continue;
      candidates.push({
        key: sub.id,
        categoryId: category.id,
        title: sub.name.trim(),
        subtitle: category.name.trim(),
        icon: categoryArt(category.id),
        href: `/category/${category.id}/subcategory/${sub.id}`,
        products,
        score: scoreOf(products) + rotation(sub.id),
      });
    }
    for (const [categoryId, products] of byCategoryNoSub) {
      const category = categoryById.get(categoryId);
      if (!category || products.length < MIN_GROUP_PRODUCTS) continue;
      candidates.push({
        key: `cat:${categoryId}`,
        categoryId,
        title: category.name.trim(),
        icon: categoryArt(categoryId),
        href: `/category/${categoryId}`,
        products,
        score: scoreOf(products) + rotation(categoryId),
      });
    }
    candidates.sort((a, b) => b.score - a.score);

    const picked: typeof candidates = [];
    const perCategory = new Map<string, number>();
    for (const cap of [1, 2]) {
      for (const candidate of candidates) {
        if (picked.length >= GROUPS_PER_OPEN) break;
        if (picked.includes(candidate) || (perCategory.get(candidate.categoryId) || 0) >= cap) continue;
        picked.push(candidate);
        perCategory.set(candidate.categoryId, (perCategory.get(candidate.categoryId) || 0) + 1);
      }
    }
    return picked.sort((a, b) => b.score - a.score);
  }, [categories, catalog, sold, subcategoriesQuery.data]);

  if (loading || subcategoriesQuery.isLoading) {
    return (
      <section className={HOME_SECTION_CARD}>
        <div className="mb-4 h-7 w-40 rounded-full bg-[#eef3f0]" />
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      </section>
    );
  }

  return (
    <div className="space-y-7">
      {groups.map(group => (
        <NearScreen key={group.key} minHeight={250}>
          <GroupRail group={group} sold={sold} exclude={exclude} />
        </NearScreen>
      ))}
    </div>
  );
}
