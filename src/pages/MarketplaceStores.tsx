import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, MapPin, RefreshCw, Store } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { getNearbyMarketplaceStores } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

export default function MarketplaceStores() {
  const navigate = useNavigate();
  const [addressVersion, setAddressVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setAddressVersion(value => value + 1);
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('delivery-address-changed', refresh);
    return () => {
      window.removeEventListener('guest-address-changed', refresh);
      window.removeEventListener('delivery-address-changed', refresh);
    };
  }, []);

  const query = useQuery({
    queryKey: ['marketplace-stores-page', addressVersion],
    queryFn: () => getNearbyMarketplaceStores(50),
    staleTime: 20_000,
    retry: 1,
  });

  return <MainLayout>
    <TopNavBar onSearchFocus={() => navigate('/search')} />
    <main className="mx-auto max-w-6xl px-3 pb-12 pt-4 sm:px-4" dir="rtl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="رجوع"><ArrowRight /></Button>
        <div><p className="text-xs font-bold text-primary">Marketplace</p><h1 className="text-2xl font-black">متاجر قريبة منك</h1><p className="mt-1 text-sm text-gray-500">النتائج حسب عنوان التوصيل الحالي، وكل طلب من متجر واحد.</p></div>
      </div>

      {query.isLoading ? <div className="flex justify-center py-20"><BrandLoader size="lg" /></div> : query.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center"><p className="font-bold text-red-700">تعذر تحميل المتاجر القريبة.</p><Button className="mt-4" variant="outline" onClick={() => void query.refetch()}><RefreshCw size={16} />إعادة المحاولة</Button></div>
      ) : !query.data?.length ? (
        <div className="rounded-3xl border border-dashed border-green-200 bg-green-50/50 p-8 text-center"><Store className="mx-auto h-12 w-12 text-primary" /><h2 className="mt-3 text-lg font-black">مفيش متجر شريك متاح للعنوان ده حاليًا</h2><p className="mt-2 text-sm text-gray-600">غيّر عنوان التوصيل أو ارجع لمنتجات المعداوي.</p><Button className="mt-5" onClick={() => navigate('/address-manager')}><MapPin size={17} />مراجعة العنوان</Button></div>
      ) : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.data.map(store => <Link key={store.branch_id} to={`/stores/${store.branch_id}`} className="rounded-3xl border border-green-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-primary"><Store size={24} /></span><div className="min-w-0"><h2 className="truncate text-lg font-black">{store.merchant_name}</h2><p className="truncate text-sm text-gray-500">{store.branch_name}</p></div></div>
          <p className="mt-4 line-clamp-2 min-h-10 text-sm text-gray-600">{store.address || store.zone_name}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-gray-50 px-3 py-1.5"><MapPin className="ml-1 inline h-3.5 w-3.5" />{money(store.distance_km)} كم</span><span className="rounded-full bg-gray-50 px-3 py-1.5"><Clock3 className="ml-1 inline h-3.5 w-3.5" />{store.estimated_time || (store.estimated_delivery_minutes ? `${store.estimated_delivery_minutes} دقيقة` : 'حسب المنطقة')}</span></div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm"><span>التوصيل: <strong>{store.delivery_fee > 0 ? `${money(store.delivery_fee)} ج.م` : 'مجاني'}</strong></span><strong className="text-primary">{money(store.available_products)} منتج</strong></div>
        </Link>)}
      </div>}
    </main>
  </MainLayout>;
}
