import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Clock3, Flame, Search, Tag, X } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import HomeSectionHeader, { HOME_SECTION_CARD } from '@/components/sections/HomeSectionHeader';
import { Button } from '@/components/ui/button';
import { getCategories, getProducts, type Product } from '@/lib/supabase';
import { productUnitPrice } from '@/lib/productPurchase';
import { getCatalogCampaigns, campaignState, countdown, type CatalogCampaign } from '@/lib/catalogCampaigns';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(value);
const discountOf = (product: Product) => Math.round((1 - productUnitPrice(product) / Number(product.price)) * 100);
const DISCOUNT_STEPS = [40, 25, 10];
type Sort = 'discount' | 'low' | 'high';
const SORT_LABEL: Record<Sort, string> = { discount: 'أعلى خصم', low: 'الأقل سعرًا', high: 'الأعلى سعرًا' };
const chip = (active: boolean) =>
  `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold transition-colors ${active
    ? 'bg-[#005931] text-white shadow-[0_4px_12px_rgba(0,89,49,0.18)]'
    : 'bg-white text-[#005931] ring-1 ring-[#d6eee0]'}`;

/** Ticks once a second on its own, so the product grid doesn't re-render. */
function Countdown({ campaign }: { campaign: CatalogCampaign }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const state = campaignState(campaign, now);
  return (
    <span className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#cf9700]">
      <Clock3 size={14} />
      {state === 'upcoming' ? 'يبدأ بعد ' : 'ينتهي بعد '}
      <span dir="ltr">{countdown(state === 'upcoming' ? campaign.starts_at : campaign.ends_at, now)}</span>
    </span>
  );
}

export default function Offers() {
  const location = useLocation();
  const navigate = useNavigate();
  const flash = location.pathname === '/flash-sale';
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [seller, setSeller] = useState('');
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<Sort>('discount');
  const [campaignId, setCampaignId] = useState('');
  const [limit, setLimit] = useState(30);

  useEffect(() => { setCampaignId(''); setLimit(30); }, [flash]);
  useEffect(() => setLimit(30), [search, category, seller, sort, campaignId, minDiscount]);

  const products = useQuery({ queryKey: ['offers-catalog'], queryFn: () => getProducts(), staleTime: 15000, refetchInterval: 60000 });
  const campaigns = useQuery({ queryKey: ['catalog-campaigns'], queryFn: getCatalogCampaigns, staleTime: 15000, refetchInterval: 60000 });
  const categories = useQuery({ queryKey: ['categories'], queryFn: getCategories });

  const now = Date.now();
  const flashCampaigns = (campaigns.data || []).filter(c => c.kind === 'flash' && campaignState(c, now) !== 'ended');
  const hasFlash = flashCampaigns.length > 0;
  const relevant = (campaigns.data || []).filter(c => c.kind === (flash ? 'flash' : 'offer') && campaignState(c, now) !== 'ended');
  const live = relevant.filter(c => campaignState(c, now) === 'live');
  const liveIds = new Set((campaignId ? live.filter(c => c.id === campaignId) : live).flatMap(c => c.product_ids));

  // Every discounted, in-stock product (before the shopper's filters).
  const allOffers = (products.data || []).filter(p =>
    p.quantity > 0 && productUnitPrice(p) < Number(p.price) && (!flash || liveIds.has(p.id)));

  const maxDiscount = allOffers.reduce((max, p) => Math.max(max, discountOf(p)), 0);
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    allOffers.forEach(p => { if (p.main_category_id) counts.set(p.main_category_id, (counts.get(p.main_category_id) || 0) + 1); });
    return (categories.data || []).filter(c => counts.has(c.id)).map(c => ({ id: c.id, name: c.name, count: counts.get(c.id)! }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data, categories.data, flash, campaigns.data]);
  const sellers = [...new Map(allOffers.filter(p => p.merchant_id).map(p => [p.merchant_id!, p.merchant_name || 'متجر شريك'])).entries()];
  const discountSteps = DISCOUNT_STEPS.filter(step => allOffers.some(p => discountOf(p) >= step));

  const query = search.trim().toLocaleLowerCase();
  const visible = allOffers
    .filter(p => (!campaignId || liveIds.has(p.id))
      && (!category || p.main_category_id === category)
      && (!seller || (seller === 'owned' ? p.commerce_source !== 'marketplace' : p.merchant_id === seller))
      && discountOf(p) >= minDiscount
      && (!query || p.name.toLocaleLowerCase().includes(query)))
    .sort((a, b) => sort === 'low' ? productUnitPrice(a) - productUnitPrice(b) : sort === 'high' ? productUnitPrice(b) - productUnitPrice(a) : discountOf(b) - discountOf(a));
  const topDeals = [...allOffers].sort((a, b) => discountOf(b) - discountOf(a)).slice(0, 8);
  const filtering = Boolean(category || seller || minDiscount || query || campaignId);

  const loading = products.isLoading || (flash && campaigns.isLoading);
  const error = products.isError || (flash && campaigns.isError);
  const clearFilters = () => { setCategory(''); setSeller(''); setMinDiscount(0); setSearch(''); setCampaignId(''); };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch pageTitle={flash ? 'الفلاش سيل' : 'العروض'} showBackButton onBack={() => navigate(-1)} />
      <main className="mx-auto max-w-7xl px-3 pb-10 pt-4">
        {/* Hero: brand green with gold, real numbers from the current offers. */}
        <section className={`relative mb-4 overflow-hidden rounded-[28px] p-5 text-white shadow-[0_12px_30px_rgba(0,89,49,0.20)] ${flash ? 'bg-gradient-to-l from-[#b45309] to-[#cf9700]' : 'bg-[radial-gradient(120%_140%_at_100%_0%,#0b7a47_0%,#005931_55%,#004425_100%)]'}`}>
          <span aria-hidden="true" className="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full bg-[#FFC120]/15" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 left-16 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold">
                {flash ? <Flame size={13} /> : <Tag size={13} className="text-[#FFC120]" />}
                {flash ? 'لفترة محدودة' : 'عروض سوبر ماركو'}
              </span>
              <h1 className="mt-3 text-[26px] font-black leading-tight">
                {flash ? 'الفلاش سيل' : <>وفّر في <span className="text-[#FFC120]">كل طلب</span></>}
              </h1>
              <p className="mt-1.5 text-sm text-white/85">
                {loading ? 'بنجهّز العروض…' : allOffers.length
                  ? <>{money(allOffers.length)} عرض متاح لعنوانك{maxDiscount > 0 && <> · خصومات لحد <strong className="text-[#FFC120]">{money(maxDiscount)}٪</strong></>}</>
                  : 'مفيش عروض متاحة لعنوانك دلوقتي'}
              </p>
            </div>
            <span aria-hidden="true" className="flex h-16 w-16 shrink-0 rotate-[-8deg] items-center justify-center rounded-2xl bg-[#FFC120] text-[26px] font-black text-[#005931] shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
              ٪
            </span>
          </div>
          {/* Only offer the flash-sale tab when a flash campaign actually exists. */}
          {(hasFlash || flash) && (
            <nav className="relative mt-4 flex gap-2">
              <Link className={`rounded-full px-4 py-2 text-sm font-bold ${!flash ? 'bg-[#FFC120] text-[#005931]' : 'bg-white/15'}`} to="/offers">كل العروض</Link>
              <Link className={`rounded-full px-4 py-2 text-sm font-bold ${flash ? 'bg-white text-[#b45309]' : 'bg-white/15'}`} to="/flash-sale">الفلاش سيل ⚡</Link>
            </nav>
          )}
        </section>

        {relevant.length > 0 && (
          <div className="hide-scrollbar -mx-3 mb-4 flex gap-3 overflow-x-auto px-3 pb-1">
            {relevant.map(c => {
              const state = campaignState(c, now);
              return (
                <button key={c.id} type="button" disabled={state !== 'live'} onClick={() => setCampaignId(v => v === c.id ? '' : c.id)}
                  className={`min-w-60 rounded-2xl border p-4 text-right ${campaignId === c.id ? 'border-[#FFC120] bg-[#fffaeb]' : 'border-[#dcefe4] bg-white'}`}>
                  <strong className="block text-[#005931]">{c.title}</strong>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p>
                  <Countdown campaign={c} />
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className={HOME_SECTION_CARD}>
            <div className="skeleton-shimmer mb-4 h-6 w-40" />
            <div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-6 text-center">
            <p>تعذر تحميل العروض</p>
            <Button className="mt-3" onClick={() => { void products.refetch(); void campaigns.refetch(); }}>إعادة المحاولة</Button>
          </div>
        ) : !allOffers.length ? (
          <div className="rounded-[28px] border border-[#dcefe4] bg-white p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fffaeb] text-[#cf9700]"><Tag size={28} /></span>
            <h2 className="mt-3 text-lg font-black text-[#005931]">{flash ? 'مفيش فلاش سيل دلوقتي' : 'مفيش عروض دلوقتي'}</h2>
            <p className="mt-1 text-sm text-slate-500">{flash ? 'تابعنا، العروض السريعة بتنزل من وقت للتاني.' : 'ارجع تاني قريب، العروض بتتجدد.'}</p>
            {flash && <Link to="/offers" className="mt-4 inline-block rounded-full bg-[#005931] px-5 py-2.5 text-sm font-bold text-white">تصفّح كل العروض</Link>}
          </div>
        ) : (
          <>
            {/* Strongest deals first, as a quick rail. */}
            {!filtering && topDeals.length >= 4 && (
              <section className={`mb-4 ${HOME_SECTION_CARD}`}>
                <HomeSectionHeader title="أقوى الخصومات" subtitle="أكبر توفير في سوبر ماركو دلوقتي" />
                <div className="hide-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-2" dir="rtl">
                  {topDeals.map(p => <div key={p.id} className="w-[124px] shrink-0"><ProductCard product={p} /></div>)}
                </div>
              </section>
            )}

            {/* Filters as chips instead of three big select boxes. */}
            <div className="sticky top-[calc(var(--top-nav-height,64px)+4px)] z-20 -mx-3 mb-3 space-y-2 bg-[#f6f8f7]/95 px-3 py-2 backdrop-blur">
              <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
                <button type="button" onClick={() => setSearchOpen(v => !v)} aria-label="بحث في العروض" className={chip(searchOpen || Boolean(query))}><Search size={15} /></button>
                <button type="button" onClick={() => setSort(s => s === 'discount' ? 'low' : s === 'low' ? 'high' : 'discount')} className={chip(false)}>
                  <ArrowUpDown size={14} />{SORT_LABEL[sort]}
                </button>
                {discountSteps.map(step => (
                  <button key={step} type="button" onClick={() => setMinDiscount(v => v === step ? 0 : step)} className={chip(minDiscount === step)}>
                    خصم {money(step)}٪+
                  </button>
                ))}
                {sellers.length > 0 && (
                  <select aria-label="البائع" value={seller} onChange={e => setSeller(e.target.value)} className={`${chip(Boolean(seller))} appearance-none pr-3.5`}>
                    <option value="">كل البائعين</option>
                    <option value="owned">ماركت المعداوي</option>
                    {sellers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                )}
              </div>
              {searchOpen && (
                <label className="relative block">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input autoFocus aria-label="بحث في العروض" className="h-10 w-full rounded-xl border border-[#d6eee0] bg-white pr-9 text-sm outline-none focus:border-[#005931]" placeholder="دوّر في العروض…" value={search} onChange={e => setSearch(e.target.value)} />
                </label>
              )}
              {categoryChips.length > 1 && (
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  <button type="button" onClick={() => setCategory('')} className={chip(!category)}>كل الأقسام <span className="opacity-70">{money(allOffers.length)}</span></button>
                  {categoryChips.map(c => (
                    <button key={c.id} type="button" onClick={() => setCategory(v => v === c.id ? '' : c.id)} className={chip(category === c.id)}>
                      {c.name} <span className="opacity-70">{money(c.count)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[#005931]">{money(visible.length)} عرض</p>
              {filtering && <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs font-bold text-slate-500"><X size={13} />مسح الفلاتر</button>}
            </div>

            {!visible.length ? (
              <div className="rounded-[24px] border border-[#dcefe4] bg-white p-8 text-center">
                <h2 className="font-black text-[#005931]">مفيش عروض بالفلاتر دي</h2>
                <button type="button" onClick={clearFilters} className="mt-3 rounded-full bg-[#eaf7ef] px-4 py-2 text-sm font-bold text-[#005931]">مسح الفلاتر</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visible.slice(0, limit).map(p => <ProductCard key={p.id} product={p} />)}</div>
                {visible.length > limit && <Button className="mx-auto mt-6 block rounded-full" variant="outline" onClick={() => setLimit(v => v + 30)}>عرض عروض أكتر</Button>}
              </>
            )}
          </>
        )}
        <p className="mt-6 text-center text-[11px] text-slate-400">الأسعار والتوفر بيتراجعوا تاني وقت تأكيد الطلب.</p>
      </main>
    </MainLayout>
  );
}
