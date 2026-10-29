import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { useCustomerDeliveryHeader } from '@/hooks/useCustomerDeliveryHeader';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { MainCategory, getCategories } from '@/lib/supabase';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addressLabel, addressLoading, deliveryEstimateMinutes, openAddress } = useCustomerDeliveryHeader('/categories');

  useEffect(() => {
    let active = true;
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        if (active) setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchCategories();
    return () => { active = false; };
  }, []);

  return (
    <MainLayout>
      {/* Match the home hero on mobile while keeping the compact desktop navbar. */}
      <TopNavBar
        homeHero
        hideLogo
        showBackButton
        onBack={() => navigate(-1)}
        searchPlaceholder="دور على منتج أو قسم…"
        onSearchFocus={() => navigate('/search')}
        searchProps={{ appearance: 'category' }}
        addressLabel={addressLabel}
        addressLoading={addressLoading}
        deliveryEstimateMinutes={deliveryEstimateMinutes}
        onAddressClick={openAddress}
      />
      <div className="mx-auto w-full max-w-7xl px-3 pb-24 pt-2 sm:px-5">
        <h1 className="sr-only">الأقسام</h1>
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {Array.from({ length: 14 }, (_, index) => <CategorySkeleton key={index} />)}
          </div>
        ) : categories.length ? (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {categories.map(category => (
              <CategoryItem
                key={category.id}
                category={category}
                onClick={item => navigate(`/category/${item.id}`)}
                variant="modern"
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-100 bg-white px-5 py-12 text-center">
            <PackageSearch className="mx-auto mb-3 text-[#005931]" size={28} />
            <p className="font-bold text-slate-800">الأقسام مش متاحة حاليًا</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
