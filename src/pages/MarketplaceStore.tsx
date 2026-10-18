import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Store, X, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import MainCategoryProductSections from '@/components/sections/MainCategoryProductSections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/useCart';
import { cartLineTotal } from '@/lib/storeCarts';
import { getMarketplaceStore, getMarketplaceStoreCatalog } from '@/lib/marketplace';

export default function MarketplaceStore() {
  const { branchId = '' } = useParams();
  const navigate = useNavigate();
  const { items } = useCart();
  const storeItems = items.filter(item => item.marketplace_branch_id === branchId);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => { setSearch(''); setQuery(''); }, [branchId]);

  const storeQuery = useQuery({
    queryKey: ['marketplace-store', branchId],
    queryFn: () => getMarketplaceStore(branchId),
    enabled: Boolean(branchId),
    staleTime: 15_000,
    retry: 1,
  });
  const productsQuery = useQuery({
    queryKey: ['marketplace-store-products', branchId, query],
    queryFn: () => getMarketplaceStoreCatalog(branchId, query, 500),
    enabled: Boolean(branchId && storeQuery.data),
    staleTime: 10_000,
    retry: 1,
  });

  const store = storeQuery.data;
  const restaurant = store?.business_profile === 'restaurant';
  if (storeQuery.isLoading) return (
    <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle="المتجر" showBackButton onBack={() => navigate(-1)} />
      <div className="flex min-h-[70vh] items-center justify-center"><BrandLoader size="lg" /></div>
    </MainLayout>
  );

  if (storeQuery.isError || !store) return (
    <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle="المتجر" showBackButton onBack={() => navigate(-1)} />
      <main className="mx-auto max-w-xl px-4 py-16 text-center" dir="rtl">
        <div className="rounded-3xl border border-dashed border-[#c8e0d2] bg-white p-8">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Store size={30} /></span>
          <h1 className="mt-4 text-xl font-black">{storeQuery.isError ? 'تعذّر تحميل المتجر' : 'المتجر غير متاح لعنوانك الحالي'}</h1>
          <p className="mt-2 text-sm text-slate-500">{storeQuery.isError ? 'راجع اتصالك وحاول مرة تانية.' : 'ممكن يكون خارج نطاق التوصيل أو متوقف مؤقتًا.'}</p>
          <Button className="mt-5" onClick={() => storeQuery.isError ? void storeQuery.refetch() : navigate('/stores')}>
            {storeQuery.isError ? 'إعادة المحاولة' : 'عرض المتاجر المتاحة'}
          </Button>
        </div>
      </main>
    </MainLayout>
  );

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle={store.merchant_name} showBackButton onBack={() => navigate(-1)} />
      <main className="mx-auto max-w-7xl pb-24 pt-1" dir="rtl">
        <div className="px-3 sm:px-5">
          <section className="relative mb-4 overflow-hidden rounded-[24px] border border-[#d8ebdf] bg-gradient-to-l from-[#eaf6ee] via-white to-[#fff5d3] sm:rounded-[28px]">
            <div className="flex min-h-[135px] flex-col justify-center p-4 sm:min-h-[145px] sm:p-6">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#005931] text-[#FFC120] shadow-sm">{restaurant ? <UtensilsCrossed size={19}/> : <Store size={19}/>}</div>
              <h1 className="break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">{store.merchant_name}</h1>
              <p className="mt-1.5 text-xs font-medium text-slate-600 sm:text-sm">{store.branch_name}</p>
              <p className="mt-2 w-fit rounded-full bg-[#fff5d3] px-3 py-1.5 text-xs font-bold text-[#005931]">{productsQuery.data?.length || 0} {restaurant ? 'صنف · اختار وجبتك' : 'منتج · تسوق حسب الأقسام'}</p>
            </div>
          </section>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#005931]" />
            <Input aria-label="ابحث داخل المتجر" value={search} onChange={event => setSearch(event.target.value)} placeholder={restaurant ? 'بتدور على أكلة إيه؟' : 'ابحث داخل المتجر'} className="h-12 rounded-2xl border-[#c8e0d2] bg-white pr-12 pl-11 focus-visible:ring-[#005931]" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="مسح بحث المتجر" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#fff5d3] text-[#005931]"><X size={16} /></button>}
          </div>
        </div>

        <div className="px-3 sm:px-5">
          {productsQuery.isLoading ? (
            <div className="flex justify-center py-16"><BrandLoader size="lg" /></div>
          ) : productsQuery.isError ? (
            <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center text-red-700">
              تعذّر تحميل منتجات المتجر.
              <Button variant="outline" className="mx-auto mt-3 block" onClick={() => void productsQuery.refetch()}>إعادة المحاولة</Button>
            </div>
          ) : !productsQuery.data?.length ? (
            <div className="rounded-2xl border border-dashed border-[#c8e0d2] bg-white p-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]"><Search size={22} /></span>
              <p className="mt-3 font-bold text-slate-700">{query ? 'مفيش منتجات مطابقة للبحث حاليًا' : 'مفيش منتجات متاحة في المتجر حاليًا'}</p>
              {query && <Button variant="outline" className="mt-4" onClick={() => setSearch('')}>عرض كل المنتجات</Button>}
            </div>
          ) : <MainCategoryProductSections key={branchId} products={productsQuery.data.map(product => ({...product, business_profile: store.business_profile}))} level={restaurant ? 'sub' : 'main'} />}
        </div>
        {storeItems.length > 0 && <div className="sticky bottom-20 z-30 mx-3 mt-6 sm:mx-5">
          <Button className="flex h-14 w-full justify-between rounded-2xl bg-[#005931] px-4 shadow-lg" onClick={() => navigate('/cart')}>
            <span className="flex items-center gap-2"><ShoppingBag size={19}/>{restaurant ? 'سلة المطعم' : 'سلة المحل'}<small className="rounded-full bg-white/15 px-2 py-1">{storeItems.length}</small></span>
            <strong className="text-[#FFC120]">{storeItems.reduce((sum,item)=>sum+cartLineTotal(item),0).toLocaleString('ar-EG')} ج.م</strong>
          </Button>
        </div>}
      </main>
    </MainLayout>
  );
}
