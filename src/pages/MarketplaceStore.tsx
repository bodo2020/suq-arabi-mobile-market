import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, MapPin, Search, ShoppingCart, Store } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import ProductCard from '@/components/ui/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/useCart';
import { getMarketplaceStore, getMarketplaceStoreCatalog } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

export default function MarketplaceStore() {
  const { branchId = '' } = useParams();
  const navigate = useNavigate();
  const { items } = useCart();
  const [search, setSearch] = useState('');

  const storeQuery = useQuery({ queryKey: ['marketplace-store', branchId], queryFn: () => getMarketplaceStore(branchId), enabled: !!branchId, staleTime: 15_000, retry: 1 });
  const productsQuery = useQuery({ queryKey: ['marketplace-store-products', branchId, search.trim()], queryFn: () => getMarketplaceStoreCatalog(branchId, search, 500), enabled: !!branchId && !!storeQuery.data, staleTime: 10_000, retry: 1 });
  const marketplaceItems = useMemo(() => items.filter(item => item.commerce_source === 'marketplace'), [items]);


  if (storeQuery.isLoading) return <MainLayout><div className="flex min-h-[70vh] items-center justify-center"><BrandLoader size="lg" /></div></MainLayout>;
  const store = storeQuery.data;
  if (!store) return <MainLayout><main className="mx-auto max-w-xl px-4 py-16 text-center" dir="rtl"><Store className="mx-auto h-12 w-12 text-primary" /><h1 className="mt-4 text-xl font-black">المتجر غير متاح لعنوانك الحالي</h1><p className="mt-2 text-sm text-gray-500">ممكن يكون خارج نطاق التوصيل أو متوقف مؤقتًا.</p><Button className="mt-5" onClick={() => navigate('/stores')}>عرض المتاجر المتاحة</Button></main></MainLayout>;

  return <MainLayout>
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-4" dir="rtl">
      <div className="mb-5 flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowRight /></Button><div className="min-w-0 flex-1"><p className="text-xs font-bold text-primary">متجر شريك</p><h1 className="truncate text-2xl font-black">{store.merchant_name}</h1><p className="truncate text-sm text-gray-500">{store.branch_name}</p></div><Button variant="outline" onClick={() => navigate('/cart')}><ShoppingCart size={17} />السلة{marketplaceItems.length ? ` (${marketplaceItems.length})` : ''}</Button></div>

      <section className="mb-6 rounded-3xl border border-green-100 bg-gradient-to-l from-green-50 to-white p-5">
        <div className="grid gap-3 text-sm sm:grid-cols-4"><span className="flex items-center gap-2"><MapPin size={17} className="text-primary" />{store.zone_name}</span><span className="flex items-center gap-2"><Clock3 size={17} className="text-primary" />{store.estimated_time || (store.estimated_delivery_minutes ? `${store.estimated_delivery_minutes} دقيقة` : 'حسب المنطقة')}</span><span>التوصيل: <strong>{store.delivery_fee > 0 ? `${money(store.delivery_fee)} ج.م` : 'مجاني'}</strong></span><span>الحد الأدنى: <strong>{money(store.min_order_amount)} ج.م</strong></span></div>
      </section>

      <div className="relative mb-5"><Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث داخل المتجر" className="h-12 rounded-2xl pr-12" /></div>

      {productsQuery.isLoading ? <div className="flex justify-center py-16"><BrandLoader size="lg" /></div> : productsQuery.isError ? <div className="rounded-2xl bg-red-50 p-5 text-center text-red-700">تعذر تحميل منتجات المتجر.</div> : !productsQuery.data?.length ? <div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">مفيش منتجات مطابقة للبحث حاليًا.</div> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {productsQuery.data.map(product => {
            return <ProductCard key={product.marketplace_listing_id} product={product} />;
          })}
        </div>
      )}
    </main>
  </MainLayout>;
}
