import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock3, MapPin, Search, ShoppingCart, Store } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/useCart';
import { useToast } from '@/hooks/use-toast';
import { getMarketplaceStore, getMarketplaceStoreCatalog } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
const isWeightProduct = (product: { barcode_type?: string; unit_of_measure?: string }) => product.barcode_type === 'scale' || ['weight','kg','كيلوجرام','كجم'].includes(product.unit_of_measure || '');

export default function MarketplaceStore() {
  const { branchId = '' } = useParams();
  const navigate = useNavigate();
  const { addToCart, items } = useCart();
  const { toast } = useToast();
  const [search, setSearch] = useState('');

  const storeQuery = useQuery({ queryKey: ['marketplace-store', branchId], queryFn: () => getMarketplaceStore(branchId), enabled: !!branchId, staleTime: 15_000, retry: 1 });
  const productsQuery = useQuery({ queryKey: ['marketplace-store-products', branchId, search.trim()], queryFn: () => getMarketplaceStoreCatalog(branchId, search, 300), enabled: !!branchId && !!storeQuery.data, staleTime: 10_000, retry: 1 });
  const marketplaceItems = useMemo(() => items.filter(item => item.commerce_source === 'marketplace'), [items]);

  const add = (product: NonNullable<typeof productsQuery.data>[number]) => {
    const weight = isWeightProduct(product);
    const quantity = weight ? Math.max(100, Number(product.default_weight_grams || 250)) : 1;
    const result = addToCart({
      ...product,
      price: Number(product.price || 0),
      quantity,
      is_bulk: false,
      unit_of_measure: weight ? 'weight' : 'piece',
      commerce_source: 'marketplace',
      marketplace_listing_id: product.marketplace_listing_id,
      merchant_id: product.merchant_id,
      merchant_name: product.merchant_name,
      marketplace_branch_id: product.marketplace_branch_id,
      marketplace_branch_name: product.marketplace_branch_name,
    });
    if (result === 'added') toast({ title: 'اتضاف للسلة', description: `${product.name} من ${product.merchant_name}` });
  };

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
            const price = Number(product.is_offer && product.offer_price != null ? product.offer_price : product.price || 0);
            return <article key={product.marketplace_listing_id} className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
              <div className="aspect-square overflow-hidden rounded-xl bg-gray-50"><img src={product.image_urls?.[0] || '/placeholder.svg'} alt={product.name} className="h-full w-full object-contain" loading="lazy" onError={event => { event.currentTarget.onerror=null; event.currentTarget.src='/placeholder.svg'; }} /></div>
              <h2 className="mt-3 line-clamp-2 min-h-10 text-sm font-bold text-gray-900">{product.name}</h2>
              <div className="mt-2"><strong className="text-base text-primary">{money(price)} ج.م</strong>{product.is_offer && product.offer_price != null && Number(product.offer_price) < Number(product.price) && <span className="mr-2 text-xs text-gray-400 line-through">{money(Number(product.price))}</span>}</div>
              <p className="mt-1 text-[11px] text-gray-500">{isWeightProduct(product) ? 'يباع بالوزن' : `متاح ${money(Number(product.quantity || 0))}`}</p>
              <Button className="mt-3 w-full" size="sm" onClick={() => add(product)}>إضافة</Button>
            </article>;
          })}
        </div>
      )}
    </main>
  </MainLayout>;
}
