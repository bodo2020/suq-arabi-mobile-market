import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collectProductBrowseState } from '@/lib/productBrowsing';
import { captureProductCardOrigin } from '@/lib/productSheetMotion';
import { announceProductAdded } from '@/lib/brandMicroMotion';
import { observeProductCardImage, prepareProductBrowseImages } from '@/lib/productImagePipeline';
import { registerBrowsableProduct, seedProductBrowseCache } from '@/lib/productDetailCache';
import { Bell, BellRing, Loader2, Minus, Package, Plus, Scale, Trash2 } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import { useCart } from '@/contexts/useCart';
import FavoriteButton from './FavoriteButton';
import WeightSelector from './WeightSelector';
import SmartImage from './SmartImage';
import { productCardImage } from '@/lib/productCardImage';

// Warm the lazily loaded detail page once the catalog is on screen, instead
// of downloading the route only after the shopper taps a product.
let detailModuleWarmupScheduled = false;
const warmDetailModule = () => { void import('@/pages/ProductDetail').catch(() => {}); };
const scheduleDetailWarmup = () => {
  if (detailModuleWarmupScheduled || typeof window === 'undefined') return;
  detailModuleWarmupScheduled = true;
  window.setTimeout(warmDetailModule, 650);
};

interface ProductCardProps {
  product: Product & { displayType?: 'regular' | 'bulk'; variantKey?: string };
  hideIfUnavailable?: boolean;
  showBulkQuantity?: boolean;
  showRestockReminder?: boolean;
  restockReminderActive?: boolean;
  onRestockReminderToggle?: (nextActive: boolean) => Promise<void> | void;
}

// Branded stand-in for products without a photo (instead of a grey box).
const PRODUCT_PLACEHOLDER = '/product-placeholder.svg';

const money = (value: number) => Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  hideIfUnavailable = false,
  showBulkQuantity = false,
  showRestockReminder = false,
  restockReminderActive = false,
  onRestockReminderToggle,
}) => {
  const { items, addToCart, updateQuantity, removeFromCart, isInitialized } = useCart();
  const [weightOpen, setWeightOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [reminderPending, setReminderPending] = useState(false);
  const cardRef = React.useRef<HTMLElement>(null);

  const weighted = isWeightedProduct(product);
  const weightStep = weighted ? productWeightStepGrams(product) : 0;
  const wantsBulk = product.displayType === 'bulk' || showBulkQuantity;
  const bulk = wantsBulk && hasBulkPurchase(product);
  const bulkAlternative = !bulk && !weighted && hasBulkPurchase(product);
  const listingId = product.marketplace_listing_id || null;
  const item = items.find(i => i.product.id === product.id && (i.marketplace_listing_id || null) === listingId && !!i.is_bulk === bulk && (weighted ? i.unit_of_measure === 'weight' : true));
  const pack = bulk ? Number(product.bulk_quantity || 1) : 1;
  const stock = Math.max(0, Number(product.quantity || 0));
  const maxCartQuantity = weighted ? Math.floor(stock * 1000) : bulk ? Math.floor(stock / Math.max(pack, 1)) : Math.floor(stock);
  const price = bulk ? Number(product.bulk_price || 0) : productUnitPrice(product);
  const regularPrice = Number(product.price || 0);
  const discount = !bulk && regularPrice > price && price > 0 ? Math.round((1 - price / regularPrice) * 100) : 0;
  const unavailable = stock <= 0 || (wantsBulk && (!bulk || maxCartQuantity <= 0));
  const reachedStockLimit = Boolean(item && item.quantity >= maxCartQuantity);
  const limitedStock = !weighted && !unavailable && maxCartQuantity > 0 && maxCartQuantity <= 5;
  const bulkImageUrl = bulk ? String(product.bulk_image_url || '').trim() : '';
  const displayName = bulk ? (String(product.bulk_name || '').trim() || product.name) : product.name;
  const bulkUnitType = bulk
    ? (String((product as Product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
    : '';
  const variantId = bulk ? product.bulk_variant_id || null : null;
  const storeQuery = product.commerce_source === 'marketplace' && product.marketplace_branch_id
    ? `store=${encodeURIComponent(product.marketplace_branch_id)}`
    : '';
  const detailHref = bulk
    ? `/product/${product.id}?unit=bulk${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}${storeQuery ? `&${storeQuery}` : ''}`
    : `/product/${product.id}${storeQuery ? `?${storeQuery}` : ''}`;
  const imageSrc = bulkImageUrl || product.image_urls?.[0] || PRODUCT_PLACEHOLDER;
  useEffect(() => {
    registerBrowsableProduct(detailHref, product);
    scheduleDetailWarmup();
  }, [detailHref, product]);

  useEffect(() => {
    if (!cardRef.current) return;
    return observeProductCardImage(cardRef.current, imageSrc);
  }, [imageSrc]);

  const openDetails = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    const browseState = collectProductBrowseState(event.currentTarget, location.pathname + location.search);
    // The active card must win even if a very large catalog evicted it from memory.
    registerBrowsableProduct(detailHref, product);
    const index = browseState.productBrowse.paths.indexOf(detailHref);
    seedProductBrowseCache(queryClient, browseState.productBrowse.paths, index);
    // Begin image decode before routing, while the listing images are already
    // on screen and likely present in the browser's HTTP cache.
    prepareProductBrowseImages(browseState.productBrowse.previews, browseState.productBrowse.paths, index);
    const productCardOrigin = captureProductCardOrigin(event.currentTarget, detailHref);
    const inheritedBackground = (location.state as { backgroundLocation?: typeof location } | null)?.backgroundLocation;
    const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
    const backgroundLocation = inheritedBackground ||
      (mobile && !location.pathname.startsWith('/product/') ? location : undefined);
    navigate(detailHref, {
      state: {
        // Reference the complete in-memory journey rather than cloning every
        // product into browser history on each swipe.
        productBrowseKey: browseState.productBrowseKey,
        ...(backgroundLocation ? { backgroundLocation } : {}),
        ...(mobile && productCardOrigin ? { productCardOrigin } : {}),
      },
      // Don't stack nested sheets when tapping a recommendation inside a sheet.
      replace: Boolean(inheritedBackground),
    });
  };

  const selectedWeight = weighted
    ? Math.min(maxCartQuantity || weightStep, Math.max(1, Math.round(Number(item?.quantity || weightStep))))
    : 0;
  const weightCanIncrease = weighted && selectedWeight < maxCartQuantity;
  const selectedWeightPrice = weighted ? price * selectedWeight / 1000 : price;

  if (hideIfUnavailable && unavailable) return null;

  const addRegularOrBulk = () => {
    if (!isInitialized || unavailable || reachedStockLimit || weighted) return;
    if (item) {
      updateQuantity(product.id, Math.min(item.quantity + 1, maxCartQuantity), bulk, listingId);
      return;
    }
    const result = addToCart({
      ...product,
      name: displayName,
      image_urls: bulk && bulkImageUrl ? [bulkImageUrl] : product.image_urls,
      price: product.price,
      quantity: 1,
      is_bulk: bulk,
    });
    if (result === 'added') announceProductAdded(cardRef.current?.querySelector('img') || null, imageSrc);
  };

  const addDefaultWeight = () => {
    if (!weighted || !isInitialized || unavailable || item || maxCartQuantity <= 0) return;
    const defaultWeight = Math.min(maxCartQuantity, Math.max(1, weightStep));
    const result = addToCart({
      ...product,
      quantity: defaultWeight,
      price: product.price,
      unit_of_measure: 'weight',
      is_bulk: false,
    });
    if (result === 'added') announceProductAdded(cardRef.current?.querySelector('img') || null, imageSrc);
  };

  const decreaseRegularOrBulk = () => {
    if (!isInitialized || !item || weighted) return;
    if (item.quantity <= 1) {
      removeFromCart(product.id, bulk, listingId);
      return;
    }
    updateQuantity(product.id, item.quantity - 1, bulk, listingId);
  };

  const applyWeight = (grams: number) => {
    if (!weighted || maxCartQuantity <= 0 || !item) return;
    const next = Math.min(maxCartQuantity, Math.max(1, Math.round(grams)));
    updateQuantity(product.id, next, false, listingId);
  };

  const increaseWeight = () => {
    if (!weighted || !isInitialized || !item || !weightCanIncrease) return;
    updateQuantity(product.id, Math.min(maxCartQuantity, selectedWeight + weightStep), false, listingId);
  };

  const decreaseWeight = () => {
    if (!weighted || !isInitialized || !item) return;
    if (selectedWeight <= weightStep) {
      removeFromCart(product.id, false, listingId);
      return;
    }
    updateQuantity(product.id, Math.max(1, selectedWeight - weightStep), false, listingId);
  };

  const toggleRestockReminder = async () => {
    if (!onRestockReminderToggle || reminderPending) return;
    setReminderPending(true);
    try {
      await onRestockReminderToggle(!restockReminderActive);
    } finally {
      setReminderPending(false);
    }
  };

  const rawUnit = String(product.unit_of_measure || '').trim();
  const unitLabel = weighted
    ? 'السعر / كجم'
    : bulk
      ? `${bulkUnitType} · ${money(pack)} قطعة`
      : rawUnit || 'للقطعة';

  // Shared look for the in-cart stepper and the add button. Every control is
  // at least 44px tall so it is comfortable to hit with a thumb.
  const counterClass = 'brand-card-counter flex h-11 w-full items-center overflow-hidden rounded-full border border-[#dcefe5] bg-[#eef9f3] text-[#005931]';
  const counterButtonClass = 'flex h-11 w-11 shrink-0 items-center justify-center text-[#005931] disabled:opacity-30';
  const addButtonClass = 'flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#005931] text-sm font-black text-white shadow-[0_6px_16px_rgba(0,89,49,0.18)] transition-transform active:scale-[0.97] disabled:opacity-50';

  const action = unavailable ? (
    showRestockReminder ? (
      <button
        type="button"
        onClick={() => void toggleRestockReminder()}
        disabled={reminderPending || !onRestockReminderToggle}
        className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-black transition ${restockReminderActive ? 'border-emerald-200 bg-emerald-50 text-[#005931]' : 'border-slate-200 bg-slate-50 text-slate-700'} disabled:opacity-60`}
        aria-pressed={restockReminderActive}
      >
        {reminderPending ? <Loader2 className="h-4 w-4 animate-spin" /> : restockReminderActive ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        <span>{restockReminderActive ? 'التذكير مفعّل' : 'نبّهني عند التوفر'}</span>
      </button>
    ) : (
      <div className="flex h-11 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">غير متاح</div>
    )
  ) : weighted ? (
    item ? (
      <div className={counterClass}>
        <button type="button" onClick={decreaseWeight} disabled={!isInitialized} aria-label={selectedWeight <= weightStep ? `حذف ${displayName} من السلة` : `تقليل الوزن بمقدار ${formatWeightAmount(weightStep)}`} className={counterButtonClass}>
          {selectedWeight <= weightStep ? <Trash2 className="h-[18px] w-[18px]" /> : <Minus className="h-5 w-5" />}
        </button>
        <button type="button" onClick={() => setWeightOpen(true)} className="min-w-0 flex-1 px-0.5 text-center text-[#005931]" aria-label={`تعديل الوزن الحالي ${formatWeightAmount(selectedWeight)}`}>
          <strong key={selectedWeight} className="brand-quantity-pop block truncate whitespace-nowrap text-xs sm:text-sm">{formatWeightAmount(selectedWeight)}</strong>
        </button>
        <button type="button" onClick={increaseWeight} disabled={!isInitialized || !weightCanIncrease} aria-label={`زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}`} className={counterButtonClass}>
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={addDefaultWeight}
        disabled={!isInitialized}
        aria-label={`إضافة ${displayName} بوزن ${formatWeightAmount(Math.min(maxCartQuantity || weightStep, weightStep))}`}
        className={addButtonClass}
      >
        <Plus className="h-5 w-5 text-brand-yellow" strokeWidth={2.6} />
        <span>أضف</span>
      </button>
    )
  ) : item ? (
    <div className={counterClass}>
      <button type="button" onClick={decreaseRegularOrBulk} disabled={!isInitialized} aria-label={item.quantity <= 1 ? `حذف ${displayName} من السلة` : `تقليل كمية ${displayName}`} className={counterButtonClass}>
        {item.quantity <= 1 ? <Trash2 className="h-[18px] w-[18px]" /> : <Minus className="h-5 w-5" />}
      </button>
      <span key={item.quantity} aria-live="polite" className="brand-quantity-pop min-w-6 flex-1 text-center text-base font-black text-[#005931]">{money(item.quantity)}</span>
      <button type="button" onClick={addRegularOrBulk} disabled={!isInitialized || reachedStockLimit} aria-label={reachedStockLimit ? `وصلت للكمية المتاحة من ${displayName}` : `زيادة كمية ${displayName}`} className={counterButtonClass}>
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={addRegularOrBulk}
      disabled={!isInitialized}
      aria-label={`إضافة ${displayName} للسلة`}
      className={addButtonClass}
    >
      <Plus className="h-5 w-5 text-brand-yellow" strokeWidth={2.6} />
      <span>أضف</span>
    </button>
  );

  return (
    <article
      ref={cardRef}
      className={`group/card relative flex h-full min-w-0 flex-col rounded-[20px] bg-white p-2 shadow-[0_3px_14px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.035] transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_24px_rgba(0,89,49,0.09)] active:scale-[0.995] sm:rounded-[22px] sm:p-2.5 ${unavailable ? 'opacity-[0.82]' : ''}`}
      dir="rtl"
      data-product-card="v3-compact"
      data-product-name={displayName}
      data-product-image={imageSrc}
      data-product-price={money(price)}
    >
      <div className="relative mb-2 sm:mb-2.5">
        <Link to={detailHref} onClick={openDetails} onPointerEnter={warmDetailModule} onTouchStart={warmDetailModule} className="block rounded-[16px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] sm:rounded-[18px]">
          <div className="relative aspect-square overflow-hidden rounded-[16px] bg-white p-2.5 sm:rounded-[18px] sm:p-3.5">
            <SmartImage
              src={productCardImage(imageSrc)}
              originalSrc={imageSrc}
              fallbackSrc={PRODUCT_PLACEHOLDER}
              alt={displayName}
              preloadMargin="800px 0px"
              className="h-full w-full object-contain motion-safe:md:transition-transform motion-safe:md:duration-150 motion-safe:md:group-hover/card:scale-[1.02]"
            />
          </div>
        </Link>

        <div className="absolute left-1.5 top-1.5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-[0_3px_10px_rgba(15,23,42,0.09)] sm:left-2 sm:top-2">
          <FavoriteButton productId={product.id} variantId={variantId} size="sm" className="h-10 w-10" />
        </div>

        <div className="absolute right-1.5 top-1.5 z-20 flex flex-col items-start gap-1 sm:right-2 sm:top-2 sm:gap-1.5">
          {discount > 0 && (
            <span className="rounded-lg bg-[#ff6767] px-2 py-1 text-xs font-black text-white shadow-sm sm:rounded-xl sm:px-2.5 sm:py-1.5">-{money(discount)}%</span>
          )}
          {bulk && <span className="rounded-lg bg-[#005931] px-2 py-0.5 text-xs font-extrabold text-white">{bulkUnitType}</span>}
          {unavailable && <span className="rounded-lg bg-slate-800/85 px-2 py-0.5 text-xs font-bold text-white">غير متوفر</span>}
        </div>
      </div>

      <Link to={detailHref} onClick={openDetails} className="min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]">
        <h3 className="min-h-10 line-clamp-2 text-[13px] font-bold leading-5 text-slate-950 sm:text-[15px]">{displayName}</h3>
      </Link>

      <div className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
        {weighted ? <Scale className="h-3.5 w-3.5 text-[#005931]" /> : bulk ? <Package className="h-3.5 w-3.5 text-[#005931]" /> : null}
        <span className="truncate">{unitLabel}</span>
        {bulkAlternative && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-[#005931]">جملة</span>}
        {limitedStock && <span className="mr-auto rounded-full bg-brand-cream px-1.5 py-0.5 text-[11px] font-bold text-brand-green">قليل</span>}
      </div>

      <div className="mt-auto pt-2 sm:pt-2.5">
        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-0.5">
          <strong className={`rounded-md px-1 py-0.5 text-[19px] font-black leading-none tracking-tight sm:px-1.5 sm:text-[21px] ${discount > 0 ? 'bg-[#eaf6f0] text-[#005931]' : 'text-slate-950'}`}>{money(price)}</strong>
          <span className="pb-0.5 text-xs font-bold text-[#005931]">ج.م</span>
          {discount > 0 && <del className="pb-0.5 text-xs font-medium text-slate-400">{money(regularPrice)}</del>}
        </div>

        {weighted && item && (
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{formatWeightAmount(selectedWeight)}: <span className="font-black text-[#005931]">{money(selectedWeightPrice)} ج.م</span></p>
        )}

        <div className="mt-2">{action}</div>
      </div>

      {weightOpen && weighted && item && (
        <WeightSelector
          product={product}
          isOpen={weightOpen}
          onClose={() => setWeightOpen(false)}
          initialWeight={selectedWeight}
          onSelect={applyWeight}
        />
      )}
    </article>
  );
};

export default React.memo(ProductCard);
