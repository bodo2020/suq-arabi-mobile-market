import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryTile, { CategoryOffersBanner } from '@/components/categories/CategoryTile';
import { useCustomerDeliveryHeader } from '@/hooks/useCustomerDeliveryHeader';
import { getCategories } from '@/lib/supabase';
import { useBranchCatalog } from '@/hooks/useBranchCatalog';
import { buildCategoryCovers } from '@/lib/categoryCovers';
import { categoryArt, categoryStyle } from '@/lib/categoryStyle';
import '@/components/categories/category-tiles.css';

const Categories = () => {
  const navigate = useNavigate();
  const { addressLabel, addressLoading, deliveryEstimateMinutes, openAddress } = useCustomerDeliveryHeader('/categories');

  // Saved on the phone (the "categories" root is in deviceQueryCache), so the
  // page opens instantly and refreshes in the background.
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'main'],
    queryFn: getCategories,
    staleTime: 10 * 60_000,
  });

  // Same cached catalog as the home page; the card photos are picked here.
  const catalogQuery = useBranchCatalog();
  const covers = useMemo(() => (catalogQuery.data ? buildCategoryCovers(catalogQuery.data) : undefined), [catalogQuery.data]);
  const tiles = useMemo(() => {
    const list = (categoriesQuery.data || []).map((category, index) => ({ category, ...categoryStyle(category.name, index) }));
    // Hide sections with nothing to order in this branch (once we know).
    return covers ? list.filter(tile => (covers.counts[tile.category.id] || 0) > 0) : list;
  }, [categoriesQuery.data, covers]);

  const loading = categoriesQuery.isLoading && !categoriesQuery.data;

  return (
    <MainLayout>
      {/* Match the home hero on mobile while keeping the compact desktop navbar. */}
      <TopNavBar
        variant="hero"
        homeHero
        hideLogo
        searchPlaceholder="دور على منتج أو قسم…"
        onSearchFocus={() => navigate('/search', { state: { focusSearch: true } })}
        searchProps={{ appearance: 'category' }}
        addressLabel={addressLabel}
        addressLoading={addressLoading}
        deliveryEstimateMinutes={deliveryEstimateMinutes}
        onAddressClick={openAddress}
      />
      <div className="home-hero-content mx-auto w-full max-w-7xl px-3 pb-24 pt-2 sm:px-5" dir="rtl">
        <h1 className="sr-only">الأقسام</h1>

        {loading ? (
          <div className="cat-grid">
            {Array.from({ length: 12 }, (_, index) => <div key={index} className="cat-tile-skeleton" />)}
          </div>
        ) : tiles.length ? (
          <div className="cat-grid">
            {covers && covers.offers.length > 0 && (
              <CategoryOffersBanner
                title="عروض الأسبوع"
                subtitle="خصومات على حاجات البيت"
                images={covers.offers}
                onClick={() => navigate('/offers')}
              />
            )}
            {tiles.map(({ category, color }) => (
              <CategoryTile
                key={category.id}
                name={category.name}
                color={color}
                images={covers?.byCategory[category.id] || []}
                art={categoryArt(category.id)}
                fallbackImage={category.image_url}
                onClick={() => navigate(`/category/${category.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-100 bg-white px-5 py-12 text-center dark:border-emerald-900 dark:bg-transparent">
            <PackageSearch className="mx-auto mb-3 text-[#005931]" size={28} />
            <p className="font-bold text-slate-800 dark:text-slate-200">الأقسام مش متاحة حاليًا</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
