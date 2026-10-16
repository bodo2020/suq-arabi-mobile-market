import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, Store, Tag } from 'lucide-react';
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
      <div className="mx-auto max-w-7xl space-y-5 px-3 pb-8 pt-1 sm:space-y-6 sm:px-5 md:pt-3">
        <section aria-labelledby="home-heading" className="rounded-3xl bg-[#005931] p-4 text-white sm:flex sm:items-center sm:gap-6 sm:p-6">
          <div className="mb-4 min-w-0 sm:mb-0 sm:flex-1">
            <div>
              <h1 id="home-heading" className="text-xl font-black leading-8 sm:text-2xl">كل احتياجاتك، في مكان واحد</h1>
              <p className="mt-1 text-xs leading-5 text-white/80 sm:text-sm">اختار قسمك وابدأ تسوّق على مزاجك.</p>
            </div>
          </div>
        <button
          type="button"
          onClick={openAddress}
          className="flex min-h-16 w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-right transition hover:bg-[#f3f8f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFC120] sm:w-1/2 sm:px-4"
          aria-label={address ? 'تغيير عنوان التوصيل' : 'إضافة عنوان توصيل'}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff5d3] text-[#005931]"><MapPin size={20} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold text-slate-500">التوصيل إلى</span>
            <strong className="mt-0.5 line-clamp-2 text-sm font-bold leading-6 text-[#005931]">
              {authLoading || (user && addressQuery.isLoading)
                ? 'جاري تحميل عنوانك…'
                : user && addressQuery.isError
                  ? 'تعذّر تحميل العنوان — اضغط للمراجعة'
                  : address || 'حدد عنوانك على الخريطة'}
            </strong>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-[#005931]" />
        </button>
        </section>

        <nav className="grid grid-cols-2 gap-2.5 sm:gap-4" aria-label="اختصارات التسوق">
          <Link to="/offers" className="group flex min-h-20 items-center gap-2.5 rounded-2xl bg-[#fff5d3] p-3 text-[#005931] transition hover:bg-[#ffe78d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFC120]"><Tag size={21} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold">العروض</strong><span className="mt-1 block text-[11px] leading-4 text-[#526442]">اكتشف المتاح</span></span>
            <ChevronLeft size={16} className="hidden shrink-0 sm:block" />
          </Link>
          <Link to="/stores" className="group flex min-h-20 items-center gap-2.5 rounded-2xl border border-[#d8ebdf] bg-white p-3 text-[#005931] transition hover:bg-[#eaf6ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf6ee]"><Store size={21} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold">المحلات</strong><span className="mt-1 block text-[11px] leading-4 text-slate-500">تسوّق من محلك</span></span>
            <ChevronLeft size={16} className="hidden shrink-0 sm:block" />
          </Link>
        </nav>

        <DynamicHomeSections hidePromotions showBanners />
        <UnifiedCatalogSection />
      </div>
    </MainLayout>
  );
};

export default Index;
