import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { MainCategory, getCategories, supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { readGuestAddress } from '@/lib/deliveryAddress';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, authLoading } = useUser();
  const [guestAddress, setGuestAddress] = useState(() => readGuestAddress());

  useEffect(() => {
    const refresh = () => setGuestAddress(readGuestAddress());
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('guest-address-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // The same query key as home means delivery details are reused between
  // pages instead of being fetched separately for each header.
  const addressQuery = useQuery({
    queryKey: ['home-default-address', user?.id],
    enabled: Boolean(user) && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('address,latitude,longitude')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
  const address = user ? addressQuery.data?.address || '' : guestAddress?.address || '';

  const openAddress = () => {
    if (!user && !guestAddress) {
      navigate('/add-address?returnTo=%2Fcategories');
      return;
    }
    navigate('/address-manager');
  };

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
      {/* Share the premium green header and animated search with Home.
          The categories grid itself stays compact and uncluttered. */}
      <TopNavBar
        homeHero
        hideLogo
        showBackButton
        onBack={() => navigate(-1)}
        searchPlaceholder="دور على منتج أو قسم…"
        onSearchFocus={() => navigate('/search')}
        searchProps={{ appearance: 'category' }}
        addressLabel={user && addressQuery.isError ? 'تعذّر تحميل العنوان — اضغط للمراجعة' : address}
        addressLoading={authLoading || Boolean(user && addressQuery.isLoading)}
        deliveryEstimateMinutes={!user ? guestAddress?.estimated_time : null}
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
