import React, { useEffect, useState } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import StoreStructuredData from '@/components/seo/StoreStructuredData';
import DynamicHomeSections from '@/components/sections/DynamicHomeSections';
import NearbyMarketplaceStores from '@/components/sections/NearbyMarketplaceStores';
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
  const latitude = user ? addressQuery.data?.latitude : guestAddress?.latitude;
  const longitude = user ? addressQuery.data?.longitude : guestAddress?.longitude;
  const marketplaceLocationKey = latitude != null && longitude != null ? `${Number(latitude).toFixed(5)}:${Number(longitude).toFixed(5)}` : '';

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
      <TopNavBar onSearchFocus={() => navigate('/search')} />
      <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:pt-6">
        <button
          onClick={openAddress}
          className="mb-5 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 text-right shadow-sm transition hover:border-green-200"
          aria-label={address ? 'تغيير عنوان التوصيل' : 'إضافة عنوان توصيل'}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary"><MapPin size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-gray-500">التوصيل إلى</span>
            <strong className="block truncate text-sm text-gray-900">
              {authLoading || (user && addressQuery.isLoading)
                ? 'جاري تحميل عنوانك…'
                : user && addressQuery.isError
                  ? 'تعذّر تحميل العنوان — اضغط للمراجعة'
                  : address || 'حدد عنوانك على الخريطة'}
            </strong>
            {!user && guestAddress && <span className="mt-1 block text-[11px] text-primary">ضيف · {Number(guestAddress.distance_km).toFixed(1)} كم من الفرع</span>}
          </span>
          <ChevronLeft size={20} className="text-primary" />
        </button>

        <NearbyMarketplaceStores locationKey={marketplaceLocationKey} />
        <DynamicHomeSections />
      </div>
    </MainLayout>
  );
};

export default Index;
