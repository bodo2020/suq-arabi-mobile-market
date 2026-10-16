import BrandLoader from '@/components/ui/BrandLoader';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Barcode, Search as SearchIcon, X } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import { getProducts, type Product } from '@/lib/supabase';
import {
  searchBranchProductByBarcodeIncludingUnavailable,
  searchBranchProductsIncludingUnavailable,
} from '@/lib/searchCatalog';
import { useToast } from '@/hooks/use-toast';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProductListWithVariants } from '@/utils/productUtils';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';

type SearchDisplayProduct = Product & {
  displayType?: 'regular' | 'bulk';
  variantKey?: string;
};

const isProductAvailable = (product: SearchDisplayProduct) => {
  const stock = Math.max(0, Number(product.quantity || 0));
  if (product.displayType === 'bulk') {
    const pack = Math.max(0, Number(product.bulk_quantity || 0));
    return Boolean(product.bulk_enabled) && pack > 0 && stock >= pack;
  }
  return stock > 0;
};

const productDisplayPrice = (product: SearchDisplayProduct) => {
  if (product.displayType === 'bulk') return Number(product.bulk_price || 0);
  const offer = Number(product.offer_price || 0);
  const price = Number(product.price || 0);
  return offer > 0 && offer < price ? offer : price;
};

const productHasOffer = (product: SearchDisplayProduct) => {
  if (product.displayType === 'bulk') return false;
  const offer = Number(product.offer_price || 0);
  const price = Number(product.price || 0);
  return offer > 0 && offer < price;
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') || '').trim();
  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [onlyOffers, setOnlyOffers] = useState(false);
  const [sortOrder, setSortOrder] = useState<'relevance' | 'low' | 'high'>('relevance');
  const [searchError, setSearchError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStartTimerRef = useRef<number | null>(null);
  const scannerMountedRef = useRef(false);
  const scanBusyRef = useRef(false);
  const autoScanStartedRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const allVariants = useMemo(
    () => getProductListWithVariants(products) as SearchDisplayProduct[],
    [products],
  );

  const availabilityCounts = useMemo(() => {
    let available = 0;
    let unavailable = 0;
    allVariants.forEach(product => {
      if (isProductAvailable(product)) available += 1;
      else unavailable += 1;
    });
    return { total: allVariants.length, available, unavailable };
  }, [allVariants]);

  const visibleProducts = useMemo(() => {
    const variants = allVariants.filter(product => {
      const available = isProductAvailable(product);
      if (availabilityFilter === 'available' && !available) return false;
      if (availabilityFilter === 'unavailable' && available) return false;
      if (onlyOffers && !productHasOffer(product)) return false;
      return true;
    });

    variants.sort((a, b) => {
      const aAvailable = isProductAvailable(a);
      const bAvailable = isProductAvailable(b);
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      if (sortOrder === 'low') return productDisplayPrice(a) - productDisplayPrice(b);
      if (sortOrder === 'high') return productDisplayPrice(b) - productDisplayPrice(a);
      return 0;
    });

    return variants;
  }, [allVariants, availabilityFilter, onlyOffers, sortOrder]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      if (Array.isArray(saved)) {
        setRecentSearches(saved.filter(search => typeof search === 'string').slice(0, 6));
      }
    } catch {
      // Browsing still works when local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPopularProducts = async () => {
      try {
        const allProducts = await getProducts();
        if (!active) return;
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        setPopularProducts(shuffled.slice(0, 8));
      } catch (error) {
        console.error('Error fetching popular products:', error);
      }
    };
    void fetchPopularProducts();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!query) return;
    setRecentSearches(current => {
      const updated = [query, ...current.filter(item => item !== query)].slice(0, 6);
      try { localStorage.setItem('recentSearches', JSON.stringify(updated)); } catch { /* Optional history. */ }
      return updated;
    });
  }, [query]);

  useEffect(() => {
    scannerMountedRef.current = true;
    return () => {
      scannerMountedRef.current = false;
      if (scannerStartTimerRef.current !== null) {
        window.clearTimeout(scannerStartTimerRef.current);
        scannerStartTimerRef.current = null;
      }
      if (!scannerRef.current) return;
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(error => console.error('Error stopping scanner:', error));
        }
      } finally {
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;
    setProducts([]);
    setSearchError(false);
    setLoading(Boolean(query));
    setAvailabilityFilter('all');
    setOnlyOffers(false);
    setSortOrder('relevance');

    if (query) {
      searchBranchProductsIncludingUnavailable(query)
        .then(results => {
          if (active) setProducts(results);
        })
        .catch(error => {
          console.error('Error searching products:', error);
          if (active) setSearchError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => { active = false; };
  }, [query, retry]);

  const handleBack = () => {
    if (showScanner) {
      stopBarcodeScanner();
      return;
    }
    navigate(-1);
  };

  const handleSearchClick = (search: string) => {
    navigate(`/search?q=${encodeURIComponent(search)}`);
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    try { localStorage.removeItem('recentSearches'); } catch { /* Optional history. */ }
  };

  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    if (scanBusyRef.current) return;
    scanBusyRef.current = true;
    try {
      const product = await searchBranchProductByBarcodeIncludingUnavailable(barcode);

      if (scannerRef.current?.isScanning) await scannerRef.current.stop();
      setShowScanner(false);
      scannerRef.current = null;

      if (product) {
        toast({
          title: Number(product.quantity || 0) > 0 ? 'تم العثور على المنتج' : 'المنتج موجود لكنه غير متوفر حاليًا',
          description: product.name,
        });
        navigate(`/product/${product.id}`);
        return;
      }

      toast({
        title: 'المنتج غير موجود',
        description: 'لم نتمكن من العثور على منتج بهذا الباركود',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Error processing barcode:', error);
      if (scannerRef.current?.isScanning) {
        try { await scannerRef.current.stop(); } catch (stopError) { console.error('Error stopping scanner:', stopError); }
      }
      setShowScanner(false);
      scannerRef.current = null;
      toast({
        title: 'خطأ في البحث',
        description: 'حدث خطأ أثناء البحث عن المنتج',
        variant: 'destructive',
      });
    } finally {
      scanBusyRef.current = false;
    }
  }, [navigate, toast]);

  const startBarcodeScanner = useCallback(() => {
    if (scannerRef.current || scannerStartTimerRef.current !== null) return;
    scanBusyRef.current = false;
    setShowScanner(true);

    scannerStartTimerRef.current = window.setTimeout(() => {
      scannerStartTimerRef.current = null;
      if (!scannerMountedRef.current) return;
      try {
        const barcodeScanner = new Html5Qrcode('barcode-reader');
        scannerRef.current = barcodeScanner;

        barcodeScanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.777778,
          },
          decodedText => { void handleBarcodeDetected(decodedText); },
          () => undefined,
        ).then(() => {
          if ((!scannerMountedRef.current || scannerRef.current !== barcodeScanner) && barcodeScanner.isScanning) {
            void barcodeScanner.stop();
          }
        }).catch(error => {
          console.error('Failed to start scanner:', error);
          toast({
            title: 'فشل تشغيل ماسح الباركود',
            description: 'تأكد من السماح للتطبيق باستخدام الكاميرا',
            variant: 'destructive',
          });
          setShowScanner(false);
          scannerRef.current = null;
        });
      } catch (error) {
        console.error('Error creating scanner instance:', error);
        toast({
          title: 'فشل تشغيل ماسح الباركود',
          description: 'حدث خطأ أثناء تهيئة الكاميرا',
          variant: 'destructive',
        });
        setShowScanner(false);
        scannerRef.current = null;
      }
    }, 120);
  }, [handleBarcodeDetected, toast]);

  const stopBarcodeScanner = () => {
    if (scannerStartTimerRef.current !== null) {
      window.clearTimeout(scannerStartTimerRef.current);
      scannerStartTimerRef.current = null;
    }
    const scanner = scannerRef.current;
    if (!scanner) {
      setShowScanner(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        scanner.stop().catch(error => console.error('Error stopping scanner:', error)).finally(() => {
          setShowScanner(false);
          scannerRef.current = null;
        });
      } else {
        setShowScanner(false);
        scannerRef.current = null;
      }
    } catch (error) {
      console.error('Error during scanner cleanup:', error);
      setShowScanner(false);
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (searchParams.get('scan') !== '1' || autoScanStartedRef.current) return;
    autoScanStartedRef.current = true;
    startBarcodeScanner();
  }, [searchParams, startBarcodeScanner]);

  const availabilityButtonClass = (value: AvailabilityFilter) =>
    `min-h-10 rounded-full border px-3.5 text-xs font-bold transition sm:text-sm ${
      availabilityFilter === value
        ? 'border-[#005931] bg-[#005931] text-white shadow-[0_5px_14px_rgba(0,89,49,0.15)]'
        : 'border-[#c8e0d2] bg-white text-[#005931] hover:bg-[#fff5d3]'
    }`;

  return (
    <MainLayout>
      {query && (
        <SEOHead
          title={`البحث عن "${query}" - ســــــوبـرمــــاركو`}
          description={`نتائج البحث عن ${query} في ســــــوبـرمــــاركو`}
          type="search"
        />
      )}

      {products.length > 0 && query && (
        <ProductListStructuredData
          products={products}
          listName={`نتائج البحث عن "${query}"`}
        />
      )}

      <div className="py-0">
        <TopNavBar
          searchPlaceholder="دور باسم المنتج أو الباركود..."
          searchProps={{
            initialQuery: query,
            onBarcodeClick: startBarcodeScanner,
            readOnly: false,
          }}
          hideLogo
          pageTitle="البحث"
        />

        <div className="pb-10 pt-4 sm:pt-6">
          <div className="w-full px-3 sm:px-4">
            <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
              {!isMobile && (
                <div className="mb-5 flex items-center">
                  <button
                    onClick={handleBack}
                    className="rounded-full p-2 text-[#005931] transition-colors hover:bg-[#fff5d3]"
                    aria-label="الرجوع"
                  >
                    <ArrowRight size={24} className="text-[#005931]" />
                  </button>
                  <h1 className="flex-1 text-center text-xl font-black text-slate-950">البحث</h1>
                  <div className="w-10" />
                </div>
              )}

              {showScanner && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
                  <Card className="w-full max-w-md overflow-hidden border-0 shadow-2xl">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff5d3] text-[#005931]">
                            <Barcode size={24} strokeWidth={2.3} />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-950">امسح باركود المنتج</h3>
                            <p className="text-xs text-slate-500">وجّه الخطوط داخل الإطار</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={stopBarcodeScanner}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff5d3] text-[#005931]"
                          aria-label="إغلاق ماسح الباركود"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="p-4">
                        <div className="relative overflow-hidden rounded-2xl bg-black">
                          <div id="barcode-reader" className="min-h-[260px] w-full overflow-hidden" />
                          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-[2px] -translate-y-1/2 bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
                          <div className="pointer-events-none absolute inset-5 rounded-xl border-2 border-white/65" />
                        </div>
                        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                          قرّب الباركود التقليدي من الكاميرا وخليه أفقي وواضح.
                        </p>
                        <Button
                          type="button"
                          onClick={stopBarcodeScanner}
                          variant="outline"
                          className="mt-4 min-h-11 w-full border-slate-200"
                        >
                          إلغاء
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!query && (
                  <section className="mb-6 rounded-[26px] border border-[#d8ebdf] bg-gradient-to-l from-[#eaf6ee] via-white to-[#fff5d3] p-5 shadow-sm sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-[#FFC120]">
                      <SearchIcon size={22} />
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-slate-950 sm:text-xl">هتلاقي اللي بتدور عليه أسرع</h1>
                      <p className="mt-1 text-sm leading-6 text-slate-600">ابحث بالاسم أو امسح الباركود، والمنتج هيظهر حتى لو غير متوفر حاليًا.</p>
                    </div>
                  </div>
                </section>
              )}

              {!query && recentSearches.length > 0 && (
                <section className="mb-7">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-black text-slate-950 sm:text-lg">آخر عمليات البحث</h2>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="rounded-full px-3 py-1.5 text-xs font-bold text-[#005931] hover:bg-[#fff5d3]"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(search => (
                      <button
                        key={search}
                        type="button"
                        onClick={() => handleSearchClick(search)}
                        className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#c8e0d2] bg-white px-3.5 text-sm font-bold text-[#005931] shadow-sm transition hover:bg-[#fff5d3]"
                      >
                        <SearchIcon size={14} className="text-[#005931]" />
                        {search}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {!query && popularProducts.length > 0 && (
                <section className="mb-7">
                  <div className="mb-3">
                    <h2 className="text-base font-black text-slate-950 sm:text-lg">منتجات ممكن تحتاجها</h2>
                    <p className="mt-1 text-xs text-slate-500">اختيارات متاحة حاليًا في فرعك.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {getProductListWithVariants(popularProducts).map(product => (
                      <ProductCard key={product.variantKey} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {query && (
                <>
                  <section className="mb-4 rounded-[22px] border border-[#d8ebdf] bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#005931]">نتائج البحث</p>
                        <h2 className="mt-1 break-words text-lg font-black text-slate-950 sm:text-xl">«{query}»</h2>
                      </div>
                      {!loading && !searchError && (
                        <div className="rounded-2xl bg-[#fff5d3] px-3 py-2 text-center">
                          <strong className="block text-lg font-black text-[#005931]">{availabilityCounts.total}</strong>
                          <span className="text-[10px] font-bold text-slate-500">نتيجة</span>
                        </div>
                      )}
                    </div>

                    {!loading && !searchError && availabilityCounts.total > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:flex sm:flex-wrap sm:text-right">
                        <div className="rounded-xl bg-[#eaf6ee] px-3 py-2">
                          <span className="text-xs text-slate-500">متوفر</span>
                          <strong className="mr-1 text-sm font-black text-[#005931]">{availabilityCounts.available}</strong>
                        </div>
                        <div className="rounded-xl bg-slate-100 px-3 py-2">
                          <span className="text-xs text-slate-500">غير متوفر</span>
                          <strong className="mr-1 text-sm font-black text-slate-700">{availabilityCounts.unavailable}</strong>
                        </div>
                      </div>
                    )}
                  </section>

                  <section className="mb-5 rounded-[22px] border border-[#d8ebdf] bg-white p-3 shadow-sm sm:p-4">
                    <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" dir="rtl">
                      <button type="button" onClick={() => setAvailabilityFilter('all')} className={availabilityButtonClass('all')}>الكل</button>
                      <button type="button" onClick={() => setAvailabilityFilter('available')} className={availabilityButtonClass('available')}>متوفر الآن</button>
                      <button type="button" onClick={() => setAvailabilityFilter('unavailable')} className={availabilityButtonClass('unavailable')}>غير متوفر</button>
                      <button
                        type="button"
                        onClick={() => setOnlyOffers(value => !value)}
                        aria-pressed={onlyOffers}
                        className={`min-h-10 shrink-0 rounded-full border px-3.5 text-xs font-bold transition sm:text-sm ${onlyOffers ? 'border-[#FFC120] bg-[#FFC120] text-[#005931]' : 'border-[#c8e0d2] bg-white text-[#005931] hover:bg-[#fff5d3]'}`}
                      >
                        العروض
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <p role="status" className="text-xs font-semibold text-slate-500">{visibleProducts.length} نتيجة مع الفلاتر الحالية</p>
                      <select
                        aria-label="ترتيب نتائج البحث"
                        value={sortOrder}
                        onChange={event => setSortOrder(event.target.value as 'relevance' | 'low' | 'high')}
                        className="min-h-10 max-w-[170px] rounded-xl border border-[#c8e0d2] bg-white px-2.5 text-xs font-bold text-[#005931] outline-none focus:border-[#005931] focus:ring-2 focus:ring-[#fff5d3]"
                      >
                        <option value="relevance">الأكثر صلة</option>
                        <option value="low">السعر: الأقل</option>
                        <option value="high">السعر: الأعلى</option>
                      </select>
                    </div>
                  </section>

                  {searchError ? (
                    <div role="alert" className="rounded-[24px] border border-red-100 bg-white p-8 text-center shadow-sm">
                      <h3 className="font-black text-slate-900">تعذّر تحميل النتائج</h3>
                      <p className="my-3 text-sm text-slate-500">راجع اتصالك وحاول مرة تانية.</p>
                      <Button onClick={() => setRetry(value => value + 1)}>إعادة المحاولة</Button>
                    </div>
                  ) : loading ? (
                    <div className="flex h-44 items-center justify-center rounded-[24px] border border-[#d8ebdf] bg-white">
                      <BrandLoader size="md" className="" />
                    </div>
                  ) : visibleProducts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {visibleProducts.map(product => (
                        <ProductCard key={product.variantKey || `${product.displayType || 'regular'}:${product.id}`} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#c8e0d2] bg-white px-5 py-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff5d3] text-[#005931]">
                        <SearchIcon size={27} />
                      </div>
                      <h3 className="text-lg font-black text-slate-900">مفيش نتائج بالفلاتر دي</h3>
                      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">جرّب تعرض الكل أو امسح فلتر العروض. المنتجات غير المتوفرة موجودة في البحث ومعلّمة بوضوح.</p>
                      {(availabilityFilter !== 'all' || onlyOffers) && (
                        <Button
                          variant="outline"
                          className="mt-4 min-h-11"
                          onClick={() => { setAvailabilityFilter('all'); setOnlyOffers(false); }}
                        >
                          مسح الفلاتر
                        </Button>
                      )}
                      <Button variant="ghost" className="mt-2 min-h-11 text-[#005931]" onClick={() => navigate('/categories')}>تصفح الأقسام</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Search;
