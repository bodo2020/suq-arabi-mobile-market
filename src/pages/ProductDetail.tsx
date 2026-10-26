import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { readProductBrowseState } from '@/lib/productBrowsing';
import { Check, ChevronLeft, ChevronRight, ImageIcon, Minus, Package, Plus, Scale, Share2, ShoppingCart, Trash2, X } from 'lucide-react';
import TopNavBar from '@/components/layout/TopNavBar';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import ProductStructuredData from '@/components/seo/ProductStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import FavoriteButton from '@/components/ui/FavoriteButton';
import WeightSelector from '@/components/ui/WeightSelector';
import { getMarketplaceStore, getMarketplaceStoreProduct } from '@/lib/marketplace';
import RestaurantModifierPreview from '@/components/restaurant/RestaurantModifierPreview';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/useCart';
import { Product, getProductById, getRelatedProducts, getCompanyById, Company } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';

const money = (value: number) => Number(value || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const browse = useMemo(() => readProductBrowseState(location.state), [location.state]);
  const browseIndex = browse?.paths.indexOf(location.pathname + location.search) ?? -1;
  const canSwipePrevious = browseIndex > 0;
  const canSwipeNext = browseIndex >= 0 && browseIndex < (browse?.paths.length ?? 0) - 1;
  const sheetTouch = useRef<{ x: number; y: number; gallery: boolean } | null>(null);
  const requestedBulk = searchParams.get('unit') === 'bulk';
  const requestedVariantId = searchParams.get('variant');
  const requestedStoreId = searchParams.get('store');

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRestaurantStore, setIsRestaurantStore] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [detailWeight, setDetailWeight] = useState(0);
  const [weightOpen, setWeightOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const { addToCart, items, updateQuantity, removeFromCart, isInitialized } = useCart();
  const { toast } = useToast();

  // Lock the background document only on handheld product sheets.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const previous = document.body.style.overflow;
    if (media.matches) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  const closeSheet = () => {
    if (browse) navigate(-1);
    else navigate('/');
  };

  const browseProduct = (offset: -1 | 1) => {
    if (!browse || browseIndex < 0 || weightOpen) return;
    const next = browse.paths[browseIndex + offset];
    if (!next) return;
    sheetTouch.current = null;
    navigate(next, { replace: true, state: location.state });
  };

  const startSheetSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch || weightOpen) return;
    sheetTouch.current = {
      x: touch.clientX,
      y: touch.clientY,
      gallery: Boolean((event.target as HTMLElement).closest('[data-product-gallery]')),
    };
  };

  const finishSheetSwipe = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = sheetTouch.current;
    sheetTouch.current = null;
    const end = event.changedTouches[0];
    if (!start || !end || weightOpen) return;
    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    // Let vertical scrolling, taps and short diagonal movements work normally.
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (start.gallery && images.length > 1) {
      goToImage(dx < 0 ? 1 : -1);
      return;
    }
    // In RTL, dragging left reveals the next product, dragging right the previous.
    browseProduct(dx < 0 ? 1 : -1);
  };

  const weighted = product ? isWeightedProduct(product) : false;
  const bulkAvailable = product ? hasBulkPurchase(product) : false;
  const variantMatches = !requestedVariantId || product?.bulk_variant_id === requestedVariantId;
  const bulkMode = Boolean(product && requestedBulk && bulkAvailable && variantMatches);
  const unitPrice = product ? productUnitPrice(product) : 0;
  const pack = product ? Math.max(1, Number(product.bulk_quantity || 1)) : 1;
  const packNumber = String(Math.max(1, Math.trunc(pack)));
  const bulkImageUrl = product ? String(product.bulk_image_url || '').trim() : '';
  const bulkUnitType = product
    ? (String((product as Product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
    : 'جملة';
  const displayName = product
    ? bulkMode
      ? (String(product.bulk_name || '').trim() || product.name)
      : product.name
    : '';
  const favoriteVariantId = bulkMode ? product?.bulk_variant_id || null : null;
  const stock = Math.max(0, Number(product?.quantity || 0));
  const maxRegularQuantity = Math.floor(stock);
  const maxBulkQuantity = Math.floor(stock / pack);
  const weightStep = product && weighted ? productWeightStepGrams(product) : 0;
  const maxWeight = weighted ? Math.floor(stock * 1000) : 0;
  const listingId = product?.marketplace_listing_id || null;
  const regularCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && !item.restaurant_modifier_selection_key && !item.is_bulk && item.unit_of_measure !== 'weight');
  const weightedCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && !item.is_bulk && item.unit_of_measure === 'weight');
  const bulkCartItem = items.find(item => item.product.id === id && (item.marketplace_listing_id || null) === listingId && item.is_bulk);
  const activeCartItem = bulkMode ? bulkCartItem : weighted ? weightedCartItem : regularCartItem;
  const currentWeight = weighted && product
    ? Math.min(maxWeight || weightStep, Math.max(1, Math.round(Number(weightedCartItem?.quantity || detailWeight || weightStep))))
    : 0;
  const displayPrice = product
    ? bulkMode
      ? Number(product.bulk_price || 0)
      : weighted
        ? unitPrice * currentWeight / 1000
        : unitPrice
    : 0;
  const originalWeightedPrice = product && weighted
    ? Number(product.price || 0) * currentWeight / 1000
    : 0;
  const regularPrice = Number(product?.price || 0);
  const discount = !bulkMode && regularPrice > unitPrice && unitPrice > 0
    ? Math.round((1 - unitPrice / regularPrice) * 100)
    : 0;
  const unavailable = bulkMode ? maxBulkQuantity <= 0 : weighted ? maxWeight <= 0 : maxRegularQuantity <= 0;
  const limitedStock = !weighted && !unavailable && (bulkMode ? maxBulkQuantity : maxRegularQuantity) <= 5;

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(false);
      setIsRestaurantStore(false);
      setProduct(null);
      setSelectedImageIndex(0);
      setRelatedProducts([]);
      setCompany(null);
      setQuantity(1);
      setDetailWeight(0);

      try {
        const store = requestedStoreId ? await getMarketplaceStore(requestedStoreId) : null;
        const data = requestedStoreId
          ? store ? await getMarketplaceStoreProduct(requestedStoreId, id) : null
          : await getProductById(id);
        if (!data) throw new Error('PRODUCT_NOT_FOUND');
        if (active) {
          setIsRestaurantStore(Boolean(store?.business_profile === 'restaurant'));
          const typed = data as Product;
          setProduct(typed);
          if (isWeightedProduct(typed)) setDetailWeight(productWeightStepGrams(typed));
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchProduct();
    return () => { active = false; };
  }, [id, requestedBulk, requestedVariantId, requestedStoreId]);

  useEffect(() => {
    if (!product) return;
    let active = true;

    const loadExtras = async () => {
      const [related, companyData] = await Promise.allSettled([
        getRelatedProducts(product.id, product.main_category_id),
        product.company_id ? getCompanyById(product.company_id) : Promise.resolve(null),
      ]);

      if (!active) return;
      if (related.status === 'fulfilled') setRelatedProducts((related.value || []) as Product[]);
      if (companyData.status === 'fulfilled') setCompany(companyData.value as Company | null);
    };

    void loadExtras();
    return () => { active = false; };
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    if (bulkMode) return bulkImageUrl ? [bulkImageUrl] : [];
    return product.image_urls?.filter(Boolean) || [];
  }, [product, bulkMode, bulkImageUrl]);

  const structuredProduct = useMemo(() => {
    if (!product || !bulkMode) return product;
    return {
      ...product,
      name: displayName,
      price: Number(product.bulk_price || 0),
      offer_price: undefined,
      image_urls: bulkImageUrl ? [bulkImageUrl] : [],
    } as Product;
  }, [product, bulkMode, displayName, bulkImageUrl]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [bulkMode]);

  const notifyAdded = () => toast({ title: 'تمت الإضافة', description: `اتضاف ${displayName || 'المنتج'} للسلة.` });

  const openRegular = () => {
    if (!product) return;
    navigate(`/product/${product.id}${requestedStoreId ? `?store=${encodeURIComponent(requestedStoreId)}` : ''}`, { replace: true, state: location.state });
  };

  const openBulk = () => {
    if (!product || !bulkAvailable) return;
    const variant = product.bulk_variant_id ? `&variant=${encodeURIComponent(product.bulk_variant_id)}` : '';
    navigate(`/product/${product.id}?unit=bulk${variant}${requestedStoreId ? `&store=${encodeURIComponent(requestedStoreId)}` : ''}`, { replace: true, state: location.state });
  };

  const addRegular = () => {
    if (!product || !isInitialized || unavailable) return;
    const safeQuantity = Math.min(quantity, maxRegularQuantity);
    const result = addToCart({ ...product, price: product.price, quantity: safeQuantity, is_bulk: false });
    if (result === 'added') {
      setQuantity(1);
      notifyAdded();
    }
  };

  const addBulk = () => {
    if (!product || !isInitialized || !bulkMode || unavailable) return;
    const result = addToCart({
      ...product,
      name: displayName,
      image_urls: bulkImageUrl ? [bulkImageUrl] : product.image_urls,
      price: product.price,
      quantity: 1,
      is_bulk: true,
    });
    if (result === 'added') notifyAdded();
  };

  const changePieceQuantity = (bulk: boolean, delta: number) => {
    if (!product || !isInitialized) return;
    const item = bulk ? bulkCartItem : regularCartItem;
    if (!item) return;
    const max = bulk ? maxBulkQuantity : maxRegularQuantity;
    const next = item.quantity + delta;
    if (next <= 0) {
      removeFromCart(product.id, bulk, listingId);
      return;
    }
    updateQuantity(product.id, Math.min(max, next), bulk, listingId);
  };

  const applyWeight = (grams: number) => {
    if (!product || !weighted || !isInitialized || maxWeight <= 0) return;
    const next = Math.min(maxWeight, Math.max(1, Math.round(grams)));
    setDetailWeight(next);
    if (weightedCartItem) {
      updateQuantity(product.id, next, false, listingId);
    } else {
      const result = addToCart({
        ...product,
        quantity: next,
        price: product.price,
        unit_of_measure: 'weight',
        is_bulk: false,
      });
      if (result === 'added') notifyAdded();
    }
  };

  const changeWeight = (delta: number) => {
    if (!product || !weightedCartItem || !isInitialized) return;
    const next = currentWeight + delta * weightStep;
    if (next <= 0 || (delta < 0 && currentWeight <= weightStep)) {
      removeFromCart(product.id, false, listingId);
      return;
    }
    updateQuantity(product.id, Math.min(maxWeight, next), false, listingId);
  };

  const handleShare = async () => {
    if (!product) return;
    const { getCurrentUrl } = await import('@/utils/urlUtils');
    const shareUrl = getCurrentUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, text: product.description || '', url: shareUrl });
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: 'تم النسخ', description: 'تم نسخ رابط المنتج.' });
    } catch {
      toast({ title: 'تعذر النسخ', description: 'حاول مرة تانية.', variant: 'destructive' });
    }
  };

  const goToImage = (direction: 1 | -1) => {
    if (images.length <= 1) return;
    setSelectedImageIndex(current => (current + direction + images.length) % images.length);
  };

  const finishSwipe = (endX: number) => {
    if (touchStartX === null) return;
    const distance = endX - touchStartX;
    if (Math.abs(distance) > 45) goToImage(distance < 0 ? 1 : -1);
    setTouchStartX(null);
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar hideLogo hideSearch pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} />
        <div className="flex min-h-[60vh] items-center justify-center"><BrandLoader size="md" /></div>
      </MainLayout>
    );
  }

  const invalidBulkPage = Boolean(product && requestedBulk && (!bulkAvailable || !variantMatches));

  if (!product || loadError || invalidBulkPage) {
    return (
      <MainLayout>
        <TopNavBar hideLogo hideSearch pageTitle={requestedBulk ? 'تفاصيل الجملة' : 'تفاصيل المنتج'} showBackButton onBack={() => navigate(-1)} />
        <section className="mx-auto mt-10 max-w-md rounded-[28px] border border-slate-100 bg-white p-7 text-center shadow-sm">
          <Package className="mx-auto text-slate-300" size={42} />
          <h1 className="mt-4 text-xl font-black text-slate-900">{requestedBulk ? 'وحدة الجملة مش متاحة دلوقتي' : 'المنتج مش متاح دلوقتي'}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">ارجع للمنتجات واختار بديل، أو جرّب فتح الصفحة تاني.</p>
          <Button className="mt-5 rounded-xl" onClick={() => navigate(-1)}>رجوع</Button>
        </section>
      </MainLayout>
    );
  }

  const currentCartQuantity = Number(activeCartItem?.quantity || 0);
  const purchaseTotal = weighted
    ? displayPrice
    : displayPrice * (activeCartItem ? currentCartQuantity : bulkMode ? 1 : quantity);
  const unitDescription = weighted
    ? `${money(unitPrice)} ج.م / كجم`
    : bulkMode
      ? `${bulkUnitType} · ${packNumber} قطعة`
      : String(product.unit_of_measure || '').trim() || 'قطعة';

  const piecePurchaseControl = (
    <div className="space-y-3">
      {activeCartItem ? (
        <div className="flex h-14 items-center justify-between overflow-hidden rounded-2xl border border-[#e5c767] bg-[#fff5d3] text-[#005931]">
          <button
            type="button"
            onClick={() => changePieceQuantity(bulkMode, -1)}
            className="flex h-14 w-14 items-center justify-center"
            aria-label={currentCartQuantity <= 1 ? 'حذف من السلة' : 'تقليل الكمية'}
          >
            {currentCartQuantity <= 1 ? <Trash2 size={20} /> : <Minus size={20} />}
          </button>
          <div className="text-center">
            <strong className="block text-lg font-black text-slate-950">{money(currentCartQuantity)}</strong>
            <span className="text-[11px] font-semibold text-slate-500">{bulkMode ? bulkUnitType : 'قطعة'}</span>
          </div>
          <button
            type="button"
            onClick={() => changePieceQuantity(bulkMode, 1)}
            disabled={currentCartQuantity >= (bulkMode ? maxBulkQuantity : maxRegularQuantity)}
            className="flex h-14 w-14 items-center justify-center bg-[#005931] text-[#FFC120] disabled:opacity-30"
            aria-label="زيادة الكمية"
          >
            <Plus size={21} />
          </button>
        </div>
      ) : (
        <>
          {!bulkMode && (
            <div className="flex h-12 items-center justify-between rounded-2xl border border-[#b8d8c8] bg-white text-[#005931]">
              <button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="flex h-12 w-12 items-center justify-center" aria-label="تقليل الكمية"><Minus size={18} /></button>
              <strong className="text-base font-black">{money(quantity)}</strong>
              <button type="button" onClick={() => setQuantity(value => Math.min(maxRegularQuantity, value + 1))} disabled={quantity >= maxRegularQuantity} className="flex h-12 w-12 items-center justify-center disabled:opacity-30" aria-label="زيادة الكمية"><Plus size={18} /></button>
            </div>
          )}
          <Button
            type="button"
            disabled={!isInitialized || unavailable}
            onClick={bulkMode ? addBulk : addRegular}
            className="h-14 w-full rounded-2xl bg-[#005931] text-base font-black shadow-[0_10px_24px_rgba(0,89,49,0.16)]"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex items-center gap-2"><Plus size={19} />أضف للسلة</span>
              <span>{money(purchaseTotal)} ج.م</span>
            </span>
          </Button>
        </>
      )}
    </div>
  );

  const weightedPurchaseControl = (
    <div className="space-y-3">
      {weightedCartItem ? (
        <div className="flex h-14 items-center justify-between overflow-hidden rounded-2xl border border-[#e5c767] bg-[#fff5d3] text-[#005931]">
          <button type="button" onClick={() => changeWeight(-1)} className="flex h-14 w-14 items-center justify-center" aria-label={currentWeight <= weightStep ? 'حذف من السلة' : 'تقليل الوزن'}>
            {currentWeight <= weightStep ? <Trash2 size={20} /> : <Minus size={20} />}
          </button>
          <button type="button" onClick={() => setWeightOpen(true)} className="min-w-0 flex-1 text-center" aria-label="تعديل الوزن">
            <strong className="block text-base font-black text-slate-950">{formatWeightAmount(currentWeight)}</strong>
            <span className="text-[11px] font-semibold text-slate-500">{money(displayPrice)} ج.م</span>
          </button>
          <button type="button" onClick={() => changeWeight(1)} disabled={currentWeight >= maxWeight} className="flex h-14 w-14 items-center justify-center bg-[#005931] text-[#FFC120] disabled:opacity-30" aria-label="زيادة الوزن"><Plus size={21} /></button>
        </div>
      ) : (
        <Button type="button" disabled={!isInitialized || unavailable} onClick={() => setWeightOpen(true)} className="h-14 w-full rounded-2xl bg-[#005931] text-base font-black shadow-[0_10px_24px_rgba(0,89,49,0.16)]">
          <span className="flex w-full items-center justify-between gap-3">
            <span className="flex items-center gap-2"><Scale size={18} />اختار الوزن</span>
            <span>من {money(unitPrice * weightStep / 1000)} ج.م</span>
          </span>
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <SEOHead
        title={`${displayName} - ســــــوبـرمــــاركو`}
        description={product.description || `اشتري ${displayName} من ســــــوبـرمــــاركو`}
        image={images[0]}
        type="product"
      />
      {structuredProduct && <ProductStructuredData product={structuredProduct} />}
      <BreadcrumbStructuredData items={[
        { name: 'الرئيسية', url: '/' },
        { name: bulkMode ? 'منتجات الجملة' : 'المنتجات', url: bulkMode ? '/bulk-products' : '/categories' },
        { name: displayName, url: bulkMode ? `/product/${product.id}?unit=bulk` : `/product/${product.id}` },
      ]} />

      <div className="hidden md:block"><TopNavBar hideLogo hideSearch pageTitle="تفاصيل المنتج" showBackButton onBack={() => navigate(-1)} /></div>


      {/* Handheld immersive product browsing: the desktop detail route stays intact. */}
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 px-3 pt-7 pb-1 md:hidden">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={`تفاصيل ${displayName}`}
          dir="rtl"
          className="relative flex h-[calc(100dvh-36px)] w-full max-w-[600px] flex-col overflow-hidden rounded-[32px] bg-[#f6f8f7] shadow-[0_22px_70px_rgba(0,0,0,.22)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-5">
            <button type="button" className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-md" onClick={closeSheet} aria-label="إغلاق تفاصيل المنتج"><X size={23} /></button>
            <div className="pointer-events-auto flex flex-col gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md" aria-label="مشاركة المنتج" onClick={handleShare}><Share2 size={19} /></button>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md"><FavoriteButton productId={product.id} variantId={favoriteVariantId} size="sm" /></div>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md" aria-label="عرض السلة" onClick={() => navigate('/cart')}><ShoppingCart size={19} /></button>
            </div>
          </div>
          <div
            key={`product-sheet-${id}`}
            className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-contain px-3 pb-5 pt-2"
            onTouchStart={startSheetSwipe}
            onTouchEnd={finishSheetSwipe}
          >
            <div data-product-gallery className="relative flex h-[min(43vh,340px)] items-center justify-center overflow-hidden rounded-[26px] bg-white">
              {bulkMode && !bulkImageUrl ? (
                <div className="flex h-40 w-40 items-center justify-center rounded-[30px] bg-[#005931] text-6xl font-black text-white">{packNumber}</div>
              ) : images.length > 0 ? (
                <img
                  className="h-full w-full object-contain px-5 py-7"
                  src={images[selectedImageIndex] || '/placeholder.svg'}
                  alt={displayName}
                  draggable={false}
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400"><ImageIcon size={45} /><span>لا توجد صورة</span></div>
              )}
              {discount > 0 && <span className="absolute bottom-4 right-4 rounded-xl bg-[#FFC120] px-3 py-1.5 text-xs font-black text-[#005931]">خصم {discount}%</span>}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1.5">
                  {images.map((_, index) => <span key={index} className={`h-1.5 rounded-full ${index === selectedImageIndex ? 'w-5 bg-[#005931]' : 'w-1.5 bg-slate-300'}`} />)}
                </div>
              )}
            </div>
            {browse && browseIndex >= 0 && browse.paths.length > 1 && (
              <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-xs font-bold text-[#005931]">
                <button type="button" onClick={() => browseProduct(-1)} disabled={!canSwipePrevious} aria-label="المنتج السابق" className="flex min-h-10 items-center gap-1 rounded-xl px-2 disabled:opacity-30"><ChevronRight size={16} /> السابق</button>
                <span className="text-slate-500">{browseIndex + 1} من {browse.paths.length} · اسحب يمين أو شمال</span>
                <button type="button" onClick={() => browseProduct(1)} disabled={!canSwipeNext} aria-label="المنتج التالي" className="flex min-h-10 items-center gap-1 rounded-xl px-2 disabled:opacity-30">التالي <ChevronLeft size={16} /></button>
              </div>
            )}
            <div className="rounded-[24px] bg-white px-4 py-5">
              <h1 className="text-[22px] font-black leading-[1.55] text-slate-950">{displayName}</h1>
              <p className="mt-1 text-sm text-slate-500">{weighted ? 'يباع بالوزن · ' : ''}{unitDescription}</p>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <strong className="text-[30px] font-black leading-none text-[#005931]">{money(displayPrice)} <small className="text-base">ج.م</small></strong>
                {discount > 0 && <del className="pb-1 text-sm text-slate-400">{money(weighted ? originalWeightedPrice : regularPrice)} ج.م</del>}
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                <span className={`rounded-full px-3 py-1.5 ${unavailable ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-[#005931]'}`}>{unavailable ? 'غير متوفر حاليًا' : 'متوفر للطلب'}</span>
                {limitedStock && <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">كمية محدودة</span>}
              </div>
              {product.commerce_source === 'marketplace' && product.marketplace_branch_id && (
                <button type="button" className="mt-4 block w-full rounded-xl bg-emerald-50 px-3 py-3 text-right text-sm font-bold text-[#005931]" onClick={() => navigate(`/stores/${product.marketplace_branch_id}`)}>
                  يباع بواسطة {product.merchant_name || 'متجر شريك'} · عرض المتجر
                </button>
              )}
              {bulkAvailable && !weighted && (
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={openRegular} aria-pressed={!bulkMode} className={`flex-1 rounded-xl px-3 py-3 text-sm font-bold ${!bulkMode ? 'bg-[#005931] text-white' : 'bg-slate-100 text-slate-600'}`}>قطاعي · {money(unitPrice)} ج.م</button>
                  <button type="button" onClick={openBulk} aria-pressed={bulkMode} className={`flex-1 rounded-xl px-3 py-3 text-sm font-bold ${bulkMode ? 'bg-[#005931] text-white' : 'bg-slate-100 text-slate-600'}`}>{bulkUnitType} · {money(Number(product.bulk_price || 0))} ج.م</button>
                </div>
              )}
            </div>
            {product.description && <div className="rounded-[24px] bg-white p-4"><h2 className="mb-2 text-base font-black">الوصف</h2><p className="whitespace-pre-line text-sm leading-7 text-slate-600">{product.description}</p></div>}
            {isRestaurantStore && requestedStoreId && id && (
              <div className="rounded-[24px] bg-white p-3"><RestaurantModifierPreview key={`mobile:${requestedStoreId}:${id}`} branchId={requestedStoreId} productId={id} basePrice={displayPrice} product={product as typeof product & { quantity: number }} /></div>
            )}
            <div className="rounded-[24px] bg-white p-4">
              <h2 className="text-base font-black">تفاصيل المنتج</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">طريقة البيع: {weighted ? 'بالوزن' : bulkMode ? bulkUnitType : 'بالقطعة'} · الوحدة: {unitDescription}</p>
              {company && <button type="button" className="mt-2 text-sm font-bold text-[#005931]" onClick={() => navigate(`/company/${company.id}`)}>اكتشف منتجات {company.name}</button>}
            </div>
          </div>
          <footer className="shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            {weighted ? weightedPurchaseControl : piecePurchaseControl}
          </footer>
        </section>
      </div>

      <main className="mx-auto hidden max-w-6xl px-3 pb-40 pt-2 sm:px-5 md:block md:pb-10">
        <div className="grid gap-4 lg:grid-cols-[1.06fr_.94fr] lg:items-start lg:gap-6">
          <section className="relative overflow-hidden rounded-[28px] bg-white p-3 shadow-[0_10px_35px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035] sm:p-5">
            <div
              className={`relative aspect-square touch-pan-y overflow-hidden rounded-[24px] ${bulkMode && !bulkImageUrl ? 'bg-emerald-50' : 'bg-[#f7f8f7]'}`}
              onTouchStart={event => setTouchStartX(event.touches[0]?.clientX ?? null)}
              onTouchEnd={event => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
            >
              {bulkMode && !bulkImageUrl ? (
                <div className="flex h-full w-full items-center justify-center p-8" aria-label={`${bulkUnitType} ${packNumber} قطعة`}>
                  <div className="flex aspect-square w-[52%] max-w-56 items-center justify-center rounded-[26%] bg-[#005931] shadow-[0_18px_44px_rgba(0,89,49,0.22)]">
                    <span className="select-none text-6xl font-black leading-none tracking-tight text-white sm:text-7xl">{packNumber}</span>
                  </div>
                </div>
              ) : images.length > 0 ? (
                <img
                  src={images[selectedImageIndex] || '/placeholder.svg'}
                  alt={displayName}
                  className="h-full w-full object-contain p-6 sm:p-8"
                  onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-300"><ImageIcon size={42} /><span className="text-sm font-semibold">لا توجد صورة</span></div>
              )}

              <div className="absolute right-3 top-3 flex flex-col gap-2">
                <button onClick={handleShare} aria-label="مشاركة المنتج" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur"><Share2 size={18} className="text-slate-700" /></button>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_6px_18px_rgba(15,23,42,.12)] backdrop-blur"><FavoriteButton productId={product.id} variantId={favoriteVariantId} size="sm" /></div>
              </div>

              <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                {discount > 0 && <span className="rounded-xl bg-[#FFC120] px-2.5 py-1.5 text-xs font-black text-[#005931] shadow-sm">خصم {discount}%</span>}
                {bulkMode && <span className="rounded-xl bg-[#005931] px-2.5 py-1.5 text-xs font-black text-white">{bulkUnitType}</span>}
              </div>

              {images.length > 1 && !bulkMode && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur sm:hidden">
                  {images.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${selectedImageIndex === index ? 'w-5 bg-[#005931]' : 'w-1.5 bg-slate-300'}`} />)}
                </div>
              )}
            </div>

            {!bulkMode && images.length > 1 && (
              <div className="mt-3 hidden gap-2 overflow-x-auto pb-1 sm:flex">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" aria-label={`عرض صورة ${index + 1}`} aria-pressed={selectedImageIndex === index} onClick={() => setSelectedImageIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-[#f7f8f7] p-1 ring-2 transition ${selectedImageIndex === index ? 'ring-[#005931]' : 'ring-transparent'}`}>
                    <img src={url} alt="" className="h-full w-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035] sm:p-7 lg:sticky lg:top-[calc(var(--top-nav-height,68px)+16px)]">
            <div className="flex flex-wrap items-center gap-2">
              {weighted && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#005931]"><Scale size={13} />بالوزن</span>}
              {limitedStock && <span className="rounded-full bg-[#fff5d3] px-3 py-1.5 text-xs font-bold text-[#005931]">كمية محدودة</span>}
              {!unavailable && <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"><Check size={13} />متوفر</span>}
              {unavailable && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">غير متوفر</span>}
            </div>

            <h1 className="mt-4 text-[25px] font-black leading-[1.45] text-slate-950 sm:text-3xl">{displayName}</h1>
            {product.commerce_source === 'marketplace' && product.marketplace_branch_id && <button type="button" onClick={() => navigate(`/stores/${product.marketplace_branch_id}`)} className="mt-3 w-full rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right"><span className="block text-xs text-slate-500">يباع بواسطة</span><strong className="text-primary">{product.merchant_name || 'متجر شريك'}</strong><span className="mt-1 block text-xs text-primary">عرض جميع منتجات المتجر ←</span></button>}
            <p className="mt-1.5 text-sm font-medium text-slate-500">{unitDescription}</p>

            {bulkAvailable && !weighted && (
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#f6f8f7] p-1.5">
                <button type="button" onClick={openRegular} className={`rounded-xl px-3 py-3 text-right transition ${!bulkMode ? 'bg-white shadow-sm ring-1 ring-black/[0.04]' : 'text-slate-500'}`}>
                  <span className="block text-xs font-semibold">قطاعي</span>
                  <strong className={`mt-0.5 block text-sm ${!bulkMode ? 'text-[#005931]' : 'text-slate-700'}`}>{money(unitPrice)} ج.م</strong>
                </button>
                <button type="button" onClick={openBulk} className={`rounded-xl px-3 py-3 text-right transition ${bulkMode ? 'bg-white shadow-sm ring-1 ring-black/[0.04]' : 'text-slate-500'}`}>
                  <span className="block text-xs font-semibold">{bulkUnitType}</span>
                  <strong className={`mt-0.5 block text-sm ${bulkMode ? 'text-[#005931]' : 'text-slate-700'}`}>{money(Number(product.bulk_price || 0))} ج.م</strong>
                </button>
              </div>
            )}

            <div className="mt-5 border-y border-slate-100 py-5">
              {discount > 0 && <div className="mb-1.5 flex items-center gap-2"><del className="text-sm font-medium text-slate-400">{money(weighted ? originalWeightedPrice : regularPrice)} ج.م</del><span className="rounded-md bg-[#FFC120] px-2 py-1 text-xs font-black text-[#005931]">وفر {discount}%</span></div>}
              <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                <strong className="text-4xl font-black tracking-tight text-slate-950">{money(displayPrice)}</strong>
                <span className="pb-1 text-sm font-black text-[#005931]">ج.م</span>
                {weighted && <span className="pb-1 text-xs font-bold text-slate-500">/ {formatWeightAmount(currentWeight)}</span>}
              </div>
              {company && <button type="button" onClick={() => navigate(`/company/${company.id}`)} className="mt-3 text-sm font-bold text-[#005931] underline decoration-emerald-200 underline-offset-4">منتجات {company.name}</button>}
            </div>

            {isRestaurantStore && requestedStoreId && id && (
              <RestaurantModifierPreview key={`${requestedStoreId}:${id}`} branchId={requestedStoreId} productId={id} basePrice={displayPrice} product={product as typeof product & { quantity: number }} />
            )}

            <div className="mt-5 hidden md:block">
              {weighted ? weightedPurchaseControl : piecePurchaseControl}
              {activeCartItem && <button type="button" onClick={() => navigate('/cart')} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 text-sm font-bold text-[#005931]"><ShoppingCart size={17} />مراجعة السلة</button>}
            </div>
          </section>
        </div>

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white px-5 shadow-[0_10px_35px_rgba(15,23,42,0.04)] ring-1 ring-black/[0.035] sm:px-6">
          <Accordion type="single" collapsible defaultValue={product.description ? 'description' : undefined}>
            {product.description && (
              <AccordionItem value="description" className="border-slate-100">
                <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">عن المنتج</AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-7 text-slate-600"><p className="whitespace-pre-line">{product.description}</p></AccordionContent>
              </AccordionItem>
            )}
            <AccordionItem value="details" className="border-slate-100">
              <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">تفاصيل البيع</AccordionTrigger>
              <AccordionContent className="pb-5">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-2xl bg-[#f7f8f7] p-3"><span className="block text-xs text-slate-400">طريقة البيع</span><strong className="mt-1 block text-slate-800">{weighted ? 'بالوزن' : bulkMode ? bulkUnitType : 'بالقطعة'}</strong></div>
                  <div className="rounded-2xl bg-[#f7f8f7] p-3"><span className="block text-xs text-slate-400">الوحدة</span><strong className="mt-1 block text-slate-800">{unitDescription}</strong></div>
                  {bulkAvailable && <div className="col-span-2 rounded-2xl bg-emerald-50 p-3"><span className="block text-xs text-emerald-700">الجملة متاحة</span><strong className="mt-1 block text-[#005931]">{bulkUnitType} = {packNumber} قطعة · {money(Number(product.bulk_price || 0))} ج.م</strong></div>}
                </div>
              </AccordionContent>
            </AccordionItem>
            {company && (
              <AccordionItem value="brand" className="border-0">
                <AccordionTrigger className="py-5 text-base font-black text-slate-900 hover:no-underline">الشركة / البراند</AccordionTrigger>
                <AccordionContent className="pb-5"><button type="button" onClick={() => navigate(`/company/${company.id}`)} className="flex w-full items-center justify-between rounded-2xl bg-[#f7f8f7] p-4 text-right"><span><strong className="block text-slate-900">{company.name}</strong>{company.description && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">{company.description}</span>}</span><span className="text-sm font-bold text-[#005931]">عرض المنتجات</span></button></AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </section>

        {relatedProducts.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between px-1"><div><h2 className="text-xl font-black text-slate-950">منتجات مشابهة</h2><p className="mt-0.5 text-xs font-medium text-slate-400">ممكن تعجبك كمان</p></div></div>
            <div className="flex snap-x gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-4 md:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {relatedProducts.slice(0, 8).map(relatedProduct => <div key={relatedProduct.id} className="w-[170px] min-w-[170px] snap-start sm:w-[190px] sm:min-w-[190px] md:w-auto md:min-w-0"><ProductCard product={relatedProduct} /></div>)}
            </div>
          </section>
        )}
      </main>

      {weightOpen && weighted && (
        <WeightSelector product={product} isOpen={weightOpen} onClose={() => setWeightOpen(false)} initialWeight={weightedCartItem ? currentWeight : weightStep} onSelect={applyWeight} />
      )}
    </MainLayout>
  );
};

export default ProductDetail;
