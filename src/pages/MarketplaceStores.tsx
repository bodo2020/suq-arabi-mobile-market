import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MapPin, RefreshCw, Store } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import MarketplaceStoreCard from '@/components/ui/MarketplaceStoreCard';
import { getNearbyMarketplaceStores } from '@/lib/marketplace';

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
      <div className="mb-6 flex items-center gap-3 rounded-[24px] border border-[#d8ebdf] bg-gradient-to-l from-[#eaf6ee] via-white to-[#fff5d3] p-4 sm:p-5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="رجوع"><ArrowRight /></Button>
        <div><p className="text-xs font-bold text-primary">محلات شركاء ســــــوبـرمــــاركو</p><h1 className="text-2xl font-black">متاجر قريبة منك</h1><p className="mt-1 text-sm text-slate-600">النتائج حسب عنوان التوصيل الحالي، وكل طلب من متجر واحد.</p></div>
      </div>

      {query.isLoading ? <div className="flex justify-center py-20"><BrandLoader size="lg" /></div> : query.isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center"><p className="font-bold text-red-700">تعذر تحميل المتاجر القريبة.</p><Button className="mt-4" variant="outline" onClick={() => void query.refetch()}><RefreshCw size={16} />إعادة المحاولة</Button></div>
      ) : !query.data?.length ? (
        <div className="rounded-3xl border border-dashed border-[#c8e0d2] bg-white p-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Store size={30} /></span><h2 className="mt-3 text-lg font-black">مفيش متجر شريك متاح للعنوان ده حاليًا</h2><p className="mt-2 text-sm text-gray-600">غيّر عنوان التوصيل أو ارجع لمنتجات ســــــوبـرمــــاركو.</p><Button className="mt-5" onClick={() => navigate('/address-manager')}><MapPin size={17} />مراجعة العنوان</Button></div>
      ) : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {query.data.map(store => <MarketplaceStoreCard key={store.branch_id} store={store} />)}
      </div>}
    </main>
  </MainLayout>;
}
