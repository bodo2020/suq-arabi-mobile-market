import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin } from 'lucide-react';
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
      <TopNavBar onSearchFocus={() => navigate('/search')} />
      <div className="mx-auto max-w-7xl space-y-5 px-3 pb-10 pt-4 sm:px-4 md:pt-6">
        <button
          onClick={openAddress}
          className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#d8ebdf] bg-white px-3 py-2.5 text-right shadow-[0_6px_20px_rgba(0,89,49,0.04)] transition hover:border-[#9acbb2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-4"
          aria-label={address ? 'تغيير عنوان التوصيل' : 'إضافة عنوان توصيل'}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5d3] text-[#005931]"><MapPin size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-slate-500">التوصيل إلى</span>
            <strong className="mt-0.5 block truncate text-sm font-bold text-[#005931]">
              {authLoading || (user && addressQuery.isLoading)
                ? 'جاري تحميل عنوانك…'
                : user && addressQuery.isError
                  ? 'تعذّر تحميل العنوان — اضغط للمراجعة'
                  : address || 'حدد عنوانك على الخريطة'}
            </strong>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-[#005931]" />
        </button>

        <DynamicHomeSections hidePromotions showBanners />
        <UnifiedCatalogSection />
      </div>
    </MainLayout>
  );
};

export default Index;
