import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpLeft, Search as SearchIcon, SlidersHorizontal } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import BrandLoader from '@/components/ui/BrandLoader';
import SearchBarcodeScanner from '@/components/search/SearchBarcodeScanner';
import SearchDiscovery from '@/components/search/SearchDiscovery';
import { Button } from '@/components/ui/button';
import { type Product } from '@/lib/supabase';
import {
  searchBranchProductByBarcodeIncludingUnavailable,
  searchBranchProductsIncludingUnavailable,
} from '@/lib/searchCatalog';
import { normalizeArabicSearch, relevanceScore, type SearchMatchProduct } from '@/lib/arabicSearch';
import { useToast } from '@/hooks/use-toast';
import { getProductListWithVariants } from '@/utils/productUtils';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type SearchDisplayProduct = SearchMatchProduct & { displayType?: 'regular' | 'bulk'; variantKey?: string };
const available = (p: SearchDisplayProduct) => {
  const quantity = Math.max(0, Number(p.quantity || 0));
  return p.displayType === 'bulk'
    ? Boolean(p.bulk_enabled) && Number(p.bulk_quantity || 0) > 0 && quantity >= Number(p.bulk_quantity)
    : quantity > 0;
};
const currentPrice = (p: SearchDisplayProduct) =>
  p.displayType === 'bulk' ? Number(p.bulk_price || 0)
  : Number(p.offer_price || 0) > 0 && Number(p.offer_price) < Number(p.price)
    ? Number(p.offer_price) : Number(p.price);
const hasOffer = (p: SearchDisplayProduct) =>
  p.displayType !== 'bulk' && Number(p.offer_price || 0) > 0 && Number(p.offer_price) < Number(p.price);

export default function Search() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const query = (searchParams.get('q') || '').trim();
  const [draft, setDraft] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [sort, setSort] = useState<'relevance' | 'low' | 'high'>('relevance');
  const [showScanner, setShowScanner] = useState(false);
  const [findingBarcode, setFindingBarcode] = useState(false);
  const lastAutoScan = useRef<string | null>(null);

  const draftKey = normalizeArabicSearch(draft);
  const queryKey = normalizeArabicSearch(query);
  const changingQuery = Boolean(draftKey && draftKey !== queryKey);

  useEffect(() => { setDraft(query); }, [query]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      if (Array.isArray(saved)) setRecent(saved.filter(item => typeof item === 'string').slice(0, 7));
    } catch { /* Search is usable without local storage. */ }
  }, []);

  useEffect(() => {
    if (!query) return;
    setRecent(current => {
      const next = [query, ...current.filter(item => normalizeArabicSearch(item) !== queryKey)].slice(0, 7);
      try { localStorage.setItem('recentSearches', JSON.stringify(next)); } catch { /* optional */ }
      return next;
    });
  }, [query, queryKey]);

  useEffect(() => {
    let active = true;
    setProducts([]);
    setError('');
    setAvailabilityFilter('all');
    setOnlyOffers(false);
    setSort('relevance');
    setLoading(Boolean(query));
    if (query) {
      searchBranchProductsIncludingUnavailable(query, 180, true)
        .then(rows => { if (active) setProducts(rows); })
        .catch(e => {
          if (!active) return;
          console.error('Smart product search failed', e);
          setError(String(e?.message || e));
        })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [query, retry]);

  // Debounced, abort-by-generation suggestions while the user is typing.
  // Avoid opening a full product grid or loading the camera bundle on every key.
  useEffect(() => {
    if (!changingQuery || draftKey.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    let active = true;
    setSuggestions([]);
    setSuggesting(true);
    const timer = window.setTimeout(() => {
      searchBranchProductsIncludingUnavailable(draft, 8, draftKey.length >= 3)
        .then(rows => { if (active) setSuggestions(rows.slice(0, 5)); })
        .catch(() => { if (active) setSuggestions([]); })
        .finally(() => { if (active) setSuggesting(false); });
    }, 420);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [draft, draftKey, changingQuery]);

  const variants = useMemo(() => getProductListWithVariants(products) as SearchDisplayProduct[], [products]);
  const counts = useMemo(() => ({
    all: variants.length,
    available: variants.filter(available).length,
    unavailable: variants.filter(p => !available(p)).length,
  }), [variants]);
  const visible = useMemo(() => {
    const rows = variants.filter(p =>
      (availabilityFilter === 'all' || (availabilityFilter === 'available' ? available(p) : !available(p))) &&
      (!onlyOffers || hasOffer(p)),
    );
    rows.sort((a, b) => {
      if (sort === 'low') return currentPrice(a) - currentPrice(b);
      if (sort === 'high') return currentPrice(b) - currentPrice(a);
      const relevance = relevanceScore(b, query) - relevanceScore(a, query);
      if (relevance) return relevance;
      return Number(available(b)) - Number(available(a));
    });
    return rows;
  }, [variants, availabilityFilter, onlyOffers, sort, query]);

  const submitTerm = (term: string) => {
    const value = term.trim();
    if (!value) return;
    setDraft(value);
    navigate('/search?q=' + encodeURIComponent(value));
  };
  const goBack = () => {
    if (showScanner) { setShowScanner(false); return; }
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // Header barcode tap from home, categories or catalog opens the *same*
  // in-search scanner rather than a differently styled legacy scanner page.
  useEffect(() => {
    const state = location.state as { openScanner?: boolean } | null;
    if (!state?.openScanner || lastAutoScan.current === location.key) return;
    lastAutoScan.current = location.key;
    setShowScanner(true);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location.key, location.pathname, location.search, location.state, navigate]);

  const onBarcode = async (barcode: string) => {
    setFindingBarcode(true);
    try {
      const found = await searchBranchProductByBarcodeIncludingUnavailable(barcode);
      if (found) {
        setShowScanner(false);
        navigate('/product/' + found.id);
      } else {
        setShowScanner(false);
        toast({ title: 'المنتج مش موجود', description: 'الباركود ده مش مسجل في كتالوج الفرع.' });
      }
    } catch (e) {
      console.error('Barcode search failed', e);
      setShowScanner(false);
      toast({ title: 'تعذر البحث بالباركود', description: 'راجع الاتصال أو عنوان التوصيل وحاول تاني.', variant: 'destructive' });
    } finally {
      setFindingBarcode(false);
    }
  };
  const clearHistory = () => {
    setRecent([]);
    try { localStorage.removeItem('recentSearches'); } catch { /* optional */ }
  };

  return (
    <MainLayout hideBottomNav>
      {query && <SEOHead title={'البحث عن ' + query + ' - سوبر ماركو'} description={'نتائج البحث عن ' + query} type="search" />}
      {query && products.length > 0 && <ProductListStructuredData products={products} listName={'البحث عن ' + query} />}
      <TopNavBar
        variant="search"
        showBackButton
        onBack={goBack}
        searchPlaceholder="ابحث عن منتج..."
        searchProps={{
          initialQuery: query,
          onQueryChange: setDraft,
          onBarcodeClick: () => setShowScanner(true),
        }}
        hideLogo
      />
      {showScanner && (
        <SearchBarcodeScanner
          onDetected={onBarcode}
          onClose={() => setShowScanner(false)}
          finding={findingBarcode}
        />
      )}

      <main className="mx-auto w-full max-w-7xl px-3 pb-10 pt-3 sm:px-4 sm:pt-5">
        {changingQuery ? (
          <div className="overflow-hidden rounded-[22px] border border-emerald-100 bg-white shadow-[0_8px_25px_rgba(0,65,35,.05)]">
            <button type="button" onClick={() => submitTerm(draft)} className="flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-4 text-right hover:bg-emerald-50">
              <SearchIcon size={18} className="shrink-0 text-[#005931]" />
              <span className="min-w-0 flex-1 truncate font-bold text-slate-900">البحث عن «{draft}»</span>
              <ArrowUpLeft size={17} className="text-slate-400" />
            </button>
            <div className="px-4 py-2">
              {(suggesting || suggestions.length > 0) && (
                <p className="mb-2 text-xs font-bold text-slate-500">اقتراحات</p>
              )}
              {suggesting && suggestions.length === 0 && (
                <div className="flex min-h-14 items-center gap-2 text-xs text-slate-500"><BrandLoader size="sm" /> جاري البحث…</div>
              )}
              {suggestions.map(product => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => navigate('/product/' + product.id)}
                  className="brand-search-suggestion-enter flex min-h-16 w-full items-center gap-3 border-b border-slate-50 py-2 text-right last:border-b-0 hover:bg-emerald-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                    {product.image_urls?.[0]
                      ? <img src={product.image_urls[0]} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                      : <SearchIcon size={21} className="text-slate-300" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{product.name}</span>
                    <span className="block text-xs text-slate-500">{Number(product.quantity || 0) > 0 ? 'متوفر في فرعك' : 'غير متوفر حاليًا'}</span>
                  </span>
                  <ArrowUpLeft size={16} className="text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        ) : !query ? (
          <SearchDiscovery recent={recent} onSearch={submitTerm} onClearRecent={clearHistory} />
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[#005931]">نتائج البحث عن</p>
                <h1 className="truncate text-lg font-black text-slate-900">«{query}»</h1>
              </div>
              {!loading && !error && <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#005931]">{counts.all} نتيجة</span>}
            </div>
            {/* Chips scroll sideways: hide the native scrollbar and fade the far (left) edge so the cut-off chip reads as "more". */}
            <div className="hide-scrollbar mb-4 flex items-center gap-2 overflow-x-auto pb-1 pl-6 [-webkit-mask-image:linear-gradient(to_right,transparent,black_28px)] [mask-image:linear-gradient(to_right,transparent,black_28px)]" dir="rtl">
              {([
                ['all','الكل'],
                ['available','متوفر'],
                ['unavailable','غير متوفر'],
              ] as const).map(([key,label]) => (
                <button type="button" key={key} onClick={() => setAvailabilityFilter(key)}
                  aria-pressed={availabilityFilter === key}
                  className={'min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ' +
                    (availabilityFilter === key ? 'border-[#005931] bg-[#005931] text-white' : 'border-slate-200 bg-white text-slate-700')}>
                  {label}
                </button>
              ))}
              <button type="button" aria-pressed={onlyOffers} onClick={() => setOnlyOffers(v => !v)}
                className={'min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ' +
                  (onlyOffers ? 'border-[#ffc120] bg-yellow-50 text-[#005931]' : 'border-slate-200 bg-white text-slate-700')}>العروض</button>
              <span className="mx-1 h-6 w-px shrink-0 bg-slate-200" />
              <SlidersHorizontal size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
              <select
                aria-label="ترتيب النتائج"
                value={sort}
                onChange={event => setSort(event.target.value as 'relevance' | 'low' | 'high')}
                className="min-h-10 min-w-[110px] shrink-0 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
              >
                <option value="relevance">الأكثر صلة</option>
                <option value="low">الأقل سعرًا</option>
                <option value="high">الأعلى سعرًا</option>
              </select>
            </div>
            {error ? (
              <div role="alert" className="rounded-[22px] bg-white px-5 py-9 text-center">
                <p className="font-bold text-slate-900">{error.includes('DELIVERY_ADDRESS_REQUIRED') ? 'حدد عنوان التوصيل الأول' : 'تعذر تحميل نتائج البحث'}</p>
                <p className="mt-1 text-sm text-slate-500">راجع العنوان أو اتصال الإنترنت وحاول مرة تانية.</p>
                <Button className="mt-4" onClick={() => error.includes('DELIVERY_ADDRESS_REQUIRED') ? navigate('/address-manager') : setRetry(v => v + 1)}>
                  {error.includes('DELIVERY_ADDRESS_REQUIRED') ? 'تحديد العنوان' : 'إعادة المحاولة'}
                </Button>
              </div>
            ) : loading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 rounded-[22px] bg-white" role="status">
                <BrandLoader size="md" /><span className="text-sm text-slate-500">بنبحث في منتجات فرعك…</span>
              </div>
            ) : visible.length ? (
              <div className="brand-search-results-enter grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {visible.map(product => (
                  <div className="min-w-0" key={product.variantKey || (product.displayType || 'regular') + ':' + product.id}>
                    {product.search_match_type === 'related' && (
                      <p className="mb-1 rounded-md bg-amber-50 px-2 py-1 text-center text-[11px] font-bold text-amber-800">
                        صنف قريب، مش نفس المنتج
                      </p>
                    )}
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] bg-white px-5 py-10 text-center">
                <SearchIcon size={30} className="mx-auto mb-3 text-[#005931]" />
                <h2 className="font-black text-slate-900">ملقيناش منتجات مطابقة</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {counts.all ? 'جرّب تشيل الفلاتر عشان تشوف باقي النتائج.' : 'جرّب كلمة أبسط أو امسح باركود المنتج.'}
                </p>
                {counts.all > 0 && (
                  <Button variant="outline" className="mt-4" onClick={() => {setAvailabilityFilter('all'); setOnlyOffers(false);}}>عرض الكل</Button>
                )}
                {!counts.all && <Button variant="ghost" className="mt-3 text-[#005931]" onClick={() => navigate('/categories')}>تصفح الأقسام</Button>}
              </div>
            )}
          </>
        )}
      </main>
    </MainLayout>
  );
}
