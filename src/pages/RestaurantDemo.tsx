import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChefHat, Clock3, ImageOff, Search, UtensilsCrossed } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import SmartImage from '@/components/ui/SmartImage';
import RestaurantModifierPreview from '@/components/restaurant/RestaurantModifierPreview';
import { getMarketplaceStoreCatalog } from '@/lib/marketplace';
import {
  DEMO_RESTAURANT_BRANCH_ID, DEMO_RESTAURANT_CATEGORIES,
  DEMO_RESTAURANT_CUSTOMIZABLE, demoRestaurantCategory, demoRestaurantImage,
  type DemoRestaurantCategory,
} from '@/lib/demoRestaurant';

const money = (value: number) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

/** Public demo showcase independent of delivery address. Real checkout stays disabled. */
export default function RestaurantDemo() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<DemoRestaurantCategory | 'الكل'>('الكل');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ['restaurant-demo-catalog', DEMO_RESTAURANT_BRANCH_ID],
    queryFn: () => getMarketplaceStoreCatalog(DEMO_RESTAURANT_BRANCH_ID, null, 100),
    staleTime: 60_000, retry: 1,
  });
  const products = useMemo(() => (catalog.data || []).filter(p => p.commerce_source === 'marketplace'), [catalog.data]);
  const visible = useMemo(() => products.filter(product =>
    (category === 'الكل' || demoRestaurantCategory(product) === category)
    && (!search.trim() || `${product.name} ${product.description || ''}`.includes(search.trim())),
  ), [products, category, search]);
  useEffect(() => {
    if (!selectedId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('demo-meal-preview')?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedId]);
  const selected = products.find(p => p.id === selectedId) || null;
  const previewSupported = Boolean(selected && DEMO_RESTAURANT_CUSTOMIZABLE.has(selected.id));

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch pageTitle="مطعم التجربة" showBackButton onBack={() => navigate(-1)}/>
      <main className="mx-auto max-w-6xl px-3 pb-24 pt-3 sm:px-5" dir="rtl">
        <div className="relative overflow-hidden rounded-[28px] bg-[#005931] text-white">
          <div className="absolute inset-y-0 left-0 w-2/5 bg-cover bg-center opacity-35"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=70)' }}/>
          <div className="relative max-w-xl px-5 py-7 sm:px-8 sm:py-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#FFC120] px-3 py-1 text-xs font-black text-[#005931]">
              <UtensilsCrossed size={14}/> قسم المطاعم · تجربة المنيو
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">مطعم التجربة</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-white/90">
              شوف صور الساندوتشات والوجبات واختار الحجم والجبنة والصوص في معاينة تفاعلية.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/90">
              <span className="inline-flex items-center gap-1"><ChefHat size={15}/> منتجات تجريبية</span>
              <span className="inline-flex items-center gap-1"><Clock3 size={15}/> وقت التجهيز حسب الصنف</span>
            </div>
          </div>
        </div>

        <div role="note" className="my-5 rounded-2xl border border-amber-200 bg-[#fff8e2] px-4 py-3 text-sm leading-7 text-amber-950">
          <strong>معاينة تجريبية فقط:</strong> الصور توضيحية وليست صورًا رسمية من المطعم. الإضافات والأسعار المعروضة للتجربة،
          ويمكن حفظ تكوين الوجبة في السلة إذا توفرت الكمية، لكن لا يمكن طلب الإضافات أو تحصيل ثمنها بعد. إتاحة الطلب الفعلي تعتمد على التوصيل والمخزون وتفعيل الدفع المخصص.
        </div>

        <label className="relative mb-4 block">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-primary" size={18}/>
          <input value={search} onChange={event => setSearch(event.target.value)}
            placeholder="بتدور على برجر، شاورما، بطاطس…؟" aria-label="ابحث في منيو مطعم التجربة"
            className="w-full rounded-2xl border border-emerald-100 bg-white px-11 py-3 text-sm outline-none focus:ring-2 focus:ring-[#005931]"/>
        </label>
        <nav aria-label="أقسام منيو المطعم" className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {(['الكل', ...DEMO_RESTAURANT_CATEGORIES] as const).map(c =>
            <button type="button" key={c} aria-pressed={category === c} onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold ${category === c
                ? 'border-[#005931] bg-[#005931] text-white'
                : 'border-emerald-100 bg-white text-primary'}`}>{c}</button>,
          )}
        </nav>

        {catalog.isLoading ? <div className="flex justify-center py-16"><BrandLoader size="lg"/></div>
          : catalog.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            تعذر تحميل منتجات المطعم التجريبي.
            <button type="button" onClick={() => void catalog.refetch()} className="mr-3 font-bold underline">إعادة المحاولة</button>
          </div>
          : !visible.length ? <div className="rounded-xl border bg-white p-6 text-center text-slate-600">
            مفيش أصناف مطابقة. <button type="button" onClick={() => { setSearch(''); setCategory('الكل'); }} className="font-bold text-primary underline">عرض المنيو كاملًا</button>
          </div>
          : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map(product => {
              const canTryOptions = DEMO_RESTAURANT_CUSTOMIZABLE.has(product.id);
              const image = demoRestaurantImage(product);
              return <article key={product.marketplace_listing_id} className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm">
                <div className="relative h-44 overflow-hidden bg-[#f5f8f1]">
                  {image ? <SmartImage src={image} alt={product.name} className="h-full w-full object-cover" />
                    : <span className="flex h-full items-center justify-center text-slate-400"><ImageOff size={34}/></span>}
                  {canTryOptions && <span className="absolute right-3 top-3 rounded-full bg-[#FFC120] px-3 py-1 text-xs font-black text-primary">
                    حجم وإضافات
                  </span>}
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-bold text-emerald-700">{demoRestaurantCategory(product)}</p>
                  <h2 className="mt-1 text-base font-black">{product.name.replace(' (تجريبي)', '')}</h2>
                  {product.description && <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-slate-500">{product.description}</p>}
                  <p className="mt-3 text-lg font-black text-[#005931]">{money(product.price)} <span className="text-xs">ج.م</span></p>
                  <button type="button" onClick={() => setSelectedId(product.id)}
                    className="mt-3 w-full rounded-xl bg-[#FFC120] px-4 py-3 text-sm font-black text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    {canTryOptions ? 'جرّب الحجم والإضافات' : 'عرض تفاصيل الصنف'}
                  </button>
                </div>
              </article>;
            })}
          </div>}

        {selected && <section id="demo-meal-preview" aria-label="تفاصيل الصنف المختار"
          className="mt-6 scroll-mt-24 rounded-3xl border border-emerald-200 bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs text-emerald-700">الصنف المختار للمعاينة</p>
              <h2 className="mt-1 text-lg font-black">{selected.name.replace(' (تجريبي)', '')}</h2>
              <p className="text-sm text-slate-600">سعر الصنف الأساسي {money(selected.price)} ج.م</p>
            </div>
            <button type="button" aria-label="إغلاق تفاصيل الصنف" className="rounded-lg border px-3 py-2 text-xs" onClick={() => setSelectedId(null)}>إغلاق</button>
          </div>
          {previewSupported
            ? <RestaurantModifierPreview key={selected.id} branchId={DEMO_RESTAURANT_BRANCH_ID} productId={selected.id} basePrice={Number(selected.price)} product={selected}/>
            : <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">الصنف ده مفيش له إضافات مفعّلة في منيو التجربة حاليًا.</p>}
        </section>}

        <Link to="/stores" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary underline underline-offset-4">
          <ArrowRight size={16}/> تصفح المتاجر المتاحة حسب عنوان التوصيل
        </Link>
      </main>
    </MainLayout>
  );
}
