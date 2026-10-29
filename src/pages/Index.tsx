import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import StoreStructuredData from '@/components/seo/StoreStructuredData';
import DynamicHomeSections from '@/components/sections/DynamicHomeSections';
import UnifiedCatalogSection from '@/components/sections/UnifiedCatalogSection';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { readGuestAddress } from '@/lib/deliveryAddress';

const Index = () => {
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

  const addressQuery = useQuery({
    queryKey: ['home-default-address', user?.id],
    enabled: !!user && !authLoading,
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
      navigate('/add-address?returnTo=%2F');
      return;
    }
    navigate('/address-manager');
  };

  return (
    <MainLayout>
      <StoreStructuredData />
      <TopNavBar
        homeHero
        onSearchFocus={() => navigate('/search')}
        addressLabel={address}
        addressLoading={authLoading || Boolean(user && addressQuery.isLoading)}
        deliveryEstimateMinutes={!user ? guestAddress?.estimated_time : null}
        onAddressClick={openAddress}
      />
      <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:pt-6">
        <button
          onClick={openAddress}
          className="mb-5 hidden w-full items-center gap-2 rounded-2xl md:flex border border-emerald-100 bg-white px-3 py-2 text-right transition hover:bg-brand-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label={address ? 'تغيير عنوان التوصيل' : 'إضافة عنوان توصيل'}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-cream text-brand-green"><MapPin size={19} /></span>
          <span className="shrink-0 text-xs text-gray-500">التوصيل إلى</span>
            <strong className="min-w-0 truncate text-sm font-bold text-primary">
              {authLoading || (user && addressQuery.isLoading)
                ? 'جاري تحميل عنوانك…'
                : user && addressQuery.isError
                  ? 'تعذّر تحميل العنوان — اضغط للمراجعة'
                  : address || 'حدد عنوانك على الخريطة'}
            </strong>
        </button>

        <DynamicHomeSections hidePromotions showBanners />
        <UnifiedCatalogSection />
      </div>
    </MainLayout>
  );
};

export default Index;
