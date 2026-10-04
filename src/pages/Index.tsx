import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock3, MapPin, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import StoreStructuredData from '@/components/seo/StoreStructuredData';
import DynamicHomeSections from '@/components/sections/DynamicHomeSections';
import { useBranch } from '@/contexts/BranchContext';
import { activeHomePurchase, homeDeliverySummary } from '@/lib/homeMerchandising';
import { getHomePurchases } from '@/lib/homePurchases';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { readGuestAddress } from '@/lib/deliveryAddress';

const Index = () => {
  const navigate = useNavigate();
  const { user, authLoading } = useUser();
  const { branch, branchLoading } = useBranch();
  const [now, setNow] = useState(() => new Date());
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const purchasesQuery = useQuery({
    queryKey: ['home-purchases', user?.id], queryFn: getHomePurchases,
    enabled: Boolean(user) && !authLoading, staleTime: 30_000,
    refetchInterval: query => activeHomePurchase(query.state.data || []) ? 15_000 : 60_000,
    refetchOnWindowFocus: true,
  });
  const activeOrder = activeHomePurchase(purchasesQuery.data || []);
  const delivery = homeDeliverySummary(branch, now);
  const orderLabels: Record<string, string> = { pending: 'تم استلام طلبك', confirmed: 'طلبك اتأكد', preparing: 'بنجهز طلبك', ready: 'طلبك جاهز', shipped: 'طلبك في الطريق' };

  const addressQuery = useQuery({
    queryKey: ['home-default-address', user?.id],
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('address,latitude,longitude')
        .eq('user_id', user!.id)
        .eq('is_deliverable', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('is_default', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });

  const address = user ? addressQuery.data?.address || '' : guestAddress?.address || '';

  const openAddress = () => {
    if (!user) {
      navigate('/add-address?returnTo=%2F');
      return;
    }
    navigate('/address-manager');
  };

  return (
    <MainLayout>
      <StoreStructuredData />
      <TopNavBar onSearchFocus={() => navigate('/search')} />
      <div className="mx-auto max-w-7xl space-y-6 px-3 pb-10 pt-3 sm:px-4 md:pt-5">
        <div className="overflow-hidden rounded-2xl border border-[#d8ebdf] bg-white">
        <button
          onClick={openAddress}
          className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-right transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-4"
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
        {branchLoading ? <p role="status" className="px-3 pb-3 text-xs text-slate-500">بنحدد خدمة التوصيل لعنوانك…</p> : delivery && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#edf4ef] px-3 py-2.5 text-xs sm:px-4">
          <span className={`font-bold ${delivery.available ? 'text-[#005931]' : 'text-amber-700'}`}>{delivery.label}</span>
          {delivery.eta && <span className="flex items-center gap-1 text-slate-600"><Clock3 size={14} />{delivery.eta}</span>}
          {delivery.fee !== null && <span className="text-slate-600">رسوم الفرع {delivery.fee.toLocaleString('ar-EG')} ج.م</span>}
        </div>}
        </div>
        {activeOrder && <button type="button" onClick={() => navigate(`/orders?order_id=${encodeURIComponent(activeOrder.id)}`)} className="flex min-h-20 w-full items-center gap-3 rounded-2xl bg-[#005931] p-3 text-right text-white">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10"><Truck size={22} /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm">{orderLabels[activeOrder.status]}</strong><span className="mt-1 block truncate text-xs text-emerald-100">تابع حالة الطلب {activeOrder.tracking_number || activeOrder.id.slice(0, 8)}</span></span><ChevronLeft size={18} />
        </button>}
        <DynamicHomeSections />
      </div>
    </MainLayout>
  );
};

export default Index;
