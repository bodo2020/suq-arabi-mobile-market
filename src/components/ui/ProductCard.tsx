import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Minus, Package, Plus, Scale, Trash2 } from 'lucide-react';
import BrandLoader from './BrandLoader';
import { Product } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import { useCart } from '@/contexts/useCart';
import FavoriteButton from './FavoriteButton';
import WeightSelector from './WeightSelector';
import SmartImage from './SmartImage';
import { productCardImage } from '@/lib/productCardImage';

interface ProductCardProps {
  product: Product & { displayType?: 'regular' | 'bulk'; variantKey?: string };
  hideIfUnavailable?: boolean;
  showBulkQuantity?: boolean;
  showRestockReminder?: boolean;
  restockReminderActive?: boolean;
  onRestockReminderToggle?: (nextActive: boolean) => Promise<void> | void;
}

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
  const [reminderPending, setReminderPending] = useState(false);

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
  const detailHref = bulk
    ? `/product/${product.id}?unit=bulk${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`
    : `/product/${product.id}${product.commerce_source === 'marketplace' && product.marketplace_branch_id ? `?store=${encodeURIComponent(product.marketplace_branch_id)}` : ''}`;
  const imageSrc = bulkImageUrl || product.image_urls?.[0] || '/placeholder.svg';

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
    addToCart({
      ...product,
      name: displayName,
      image_urls: bulk && bulkImageUrl ? [bulkImageUrl] : product.image_urls,
      price: product.price,
      quantity: 1,
      is_bulk: bulk,
    });
  };

  const addDefaultWeight = () => {
    if (!weighted || !isInitialized || unavailable || item || maxCartQuantity <= 0) return;
    const defaultWeight = Math.min(maxCartQuantity, Math.max(1, weightStep));
    addToCart({
      ...product,
      quantity: defaultWeight,
      price: product.price,
      unit_of_measure: 'weight',
      is_bulk: false,
    });
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

  return (
    <article
      className={`group/card relative flex h-full min-w-0 flex-col rounded-[18px] border bg-white p-1.5 shadow-[0_3px_14px_rgba(0,89,49,0.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#b8d8c8] hover:shadow-[0_9px_24px_rgba(0,89,49,0.10)] active:scale-[0.995] sm:rounded-[22px] sm:p-2.5 ${unavailable ? 'border-slate-200 bg-slate-50/50' : item ? 'border-[#9acbb2]' : 'border-[#e1eee7]'}`}
      dir="rtl"
      data-product-card="v3-compact"
      data-product-state={unavailable ? 'unavailable' : item ? 'in-cart' : 'available'}
    >
      <div className="relative mb-5 sm:mb-7">
        <Link to={detailHref} className="block rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] sm:rounded-[18px]">
          <div className={`relative aspect-square overflow-hidden rounded-[14px] p-2 sm:rounded-[18px] sm:p-3.5 ${unavailable ? 'bg-slate-50' : 'bg-[#f8fbf8]'}`}>
            <SmartImage
              src={productCardImage(imageSrc)}
              originalSrc={imageSrc}
              alt={displayName}
              preloadMargin="800px 0px"
              className={`h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover/card:scale-[1.04] ${unavailable ? 'opacity-70 saturate-75' : ''}`}
            />
          </div>
        </Link>

        <div className="absolute left-1 top-1 z-20 flex h-7 w-7 scale-90 items-center justify-center rounded-full bg-white/95 shadow-[0_3px_10px_rgba(15,23,42,0.09)] backdrop-blur-sm sm:left-2 sm:top-2 sm:h-9 sm:w-9 sm:scale-100">
          <FavoriteButton productId={product.id} variantId={variantId} size="sm" />
        </div>

        <div className="absolute right-1 top-1 z-20 flex flex-col items-start gap-1 sm:right-2 sm:top-2 sm:gap-1.5">
          {discount > 0 && (
            <span className="rounded-lg bg-[#FFC120] px-1.5 py-1 text-[9px] font-black text-[#005931] shadow-sm sm:rounded-xl sm:px-2.5 sm:py-1.5 sm:text-[11px]">-{money(discount)}%</span>
          )}
          {bulk && <span className="rounded-md bg-[#005931] px-1.5 py-0.5 text-[8px] font-extrabold text-white sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]">{bulkUnitType}</span>}
          {unavailable && <span className="rounded-md bg-white/95 px-1.5 py-0.5 text-[8px] font-bold text-slate-600 ring-1 ring-slate-200 sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]">غير متوفر</span>}
        </div>

        {!unavailable && (
          <div className="absolute -bottom-4 left-1 z-30 max-w-[calc(100%-8px)] sm:-bottom-5 sm:left-2 sm:max-w-[calc(100%-16px)]">
            {weighted ? (
              item ? (
                <div className="flex h-9 w-[98px] max-w-full items-center overflow-hidden rounded-full border border-[#e5c767] bg-[#fff5d3] text-[#005931] shadow-[0_6px_16px_rgba(0,89,49,0.10)] sm:h-12 sm:w-auto sm:min-w-[132px]">
                  <button type="button" onClick={decreaseWeight} disabled={!isInitialized} aria-label={selectedWeight <= weightStep ? `حذف ${displayName} من السلة` : `تقليل الوزن بمقدار ${formatWeightAmount(weightStep)}`} className="flex h-9 w-8 shrink-0 items-center justify-center text-[#005931] disabled:opacity-30 sm:h-12 sm:w-11">
                    {selectedWeight <= weightStep ? <Trash2 className="h-3.5 w-3.5 sm:h-[17px] sm:w-[17px]" /> : <Minus className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />}
                  </button>
                  <button type="button" onClick={() => setWeightOpen(true)} className="min-w-0 flex-1 px-0.5 text-center text-[#005931]" aria-label={`تعديل الوزن الحالي ${formatWeightAmount(selectedWeight)}`}>
                    <strong className="block truncate whitespace-nowrap text-[9px] sm:text-xs">{formatWeightAmount(selectedWeight)}</strong>
                  </button>
                  <button type="button" onClick={increaseWeight} disabled={!isInitialized || !weightCanIncrease} aria-label={`زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}`} className="flex h-9 w-8 shrink-0 items-center justify-center text-[#005931] disabled:opacity-30 sm:h-12 sm:w-11">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addDefaultWeight}
                  disabled={!isInitialized}
                  aria-label={`إضافة ${displayName} بوزن ${formatWeightAmount(Math.min(maxCartQuantity || weightStep, weightStep))}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#005931] text-[#FFC120] shadow-[0_7px_18px_rgba(0,89,49,0.22)] transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005931] disabled:opacity-50 sm:h-12 sm:w-12"
                >
                  <Plus className="h-5 w-5 sm:h-[27px] sm:w-[27px]" strokeWidth={2.4} />
                </button>
              )
            ) : item ? (
              <div className="flex h-9 w-[94px] max-w-full items-center overflow-hidden rounded-full border border-[#e5c767] bg-[#fff5d3] text-[#005931] shadow-[0_6px_16px_rgba(0,89,49,0.10)] sm:h-12 sm:w-auto sm:min-w-[122px]">
                <button type="button" onClick={decreaseRegularOrBulk} disabled={!isInitialized} aria-label={item.quantity <= 1 ? `حذف ${displayName} من السلة` : `تقليل كمية ${displayName}`} className="flex h-9 w-8 shrink-0 items-center justify-center text-[#005931] disabled:opacity-30 sm:h-12 sm:w-11">
                  {item.quantity <= 1 ? <Trash2 className="h-3.5 w-3.5 sm:h-[17px] sm:w-[17px]" /> : <Minus className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" />}
                </button>
                <span aria-live="polite" className="min-w-6 flex-1 text-center text-[11px] font-black text-[#005931] sm:min-w-9 sm:text-sm">{money(item.quantity)}</span>
                <button type="button" onClick={addRegularOrBulk} disabled={!isInitialized || reachedStockLimit} aria-label={reachedStockLimit ? `وصلت للكمية المتاحة من ${displayName}` : `زيادة كمية ${displayName}`} className="flex h-9 w-8 shrink-0 items-center justify-center text-[#005931] disabled:opacity-30 sm:h-12 sm:w-11">
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={addRegularOrBulk}
                disabled={!isInitialized}
                aria-label={`إضافة ${displayName} للسلة`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#005931] text-[#FFC120] shadow-[0_7px_18px_rgba(0,89,49,0.22)] transition-transform active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#005931] disabled:opacity-50 sm:h-12 sm:w-12"
              >
                <Plus className="h-5 w-5 sm:h-[27px] sm:w-[27px]" strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}
      </div>

      <Link to={detailHref} className="min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]">
        <h3 className="min-h-8 line-clamp-2 text-[11px] font-bold leading-4 text-slate-950 sm:min-h-10 sm:text-[15px] sm:leading-5">{displayName}</h3>
      </Link>

      <div className="mt-1 flex min-h-4 flex-wrap items-center gap-1 text-[9px] font-medium text-slate-500 sm:mt-1.5 sm:min-h-5 sm:gap-1.5 sm:text-[11px]">
        {weighted ? <Scale className="h-2.5 w-2.5 text-[#005931] sm:h-[13px] sm:w-[13px]" /> : bulk ? <Package className="h-2.5 w-2.5 text-[#005931] sm:h-[13px] sm:w-[13px]" /> : null}
        <span className="truncate">{unitLabel}</span>
        {bulkAlternative && <span className="rounded-full bg-emerald-50 px-1 py-0.5 text-[8px] font-bold text-[#005931] sm:px-1.5 sm:text-[10px]">جملة</span>}
        {limitedStock && <span className="mr-auto rounded-full bg-[#fff5d3] px-1 py-0.5 text-[8px] font-bold text-[#005931] sm:px-1.5 sm:text-[10px]">قليل</span>}
      </div>

      <div className="mt-auto pt-1.5 sm:pt-2.5">
        <div className="flex flex-wrap items-end gap-x-1 gap-y-0.5 sm:gap-x-1.5 sm:gap-y-1">
          <strong className={`rounded px-1 py-0.5 text-[17px] font-black leading-none tracking-tight sm:rounded-md sm:px-1.5 sm:text-[21px] ${discount > 0 ? 'bg-[#fff5d3] text-[#005931]' : 'text-slate-950'}`}>{money(price)}</strong>
          <span className="pb-0.5 text-[9px] font-bold text-[#005931] sm:text-[11px]">ج.م</span>
          {discount > 0 && <del className="w-full text-[9px] font-medium text-slate-400 sm:w-auto sm:pb-0.5 sm:text-xs">{money(regularPrice)}</del>}
        </div>

        {weighted && item && (
          <p className="mt-1 truncate text-[8px] font-semibold text-slate-500 sm:mt-1.5 sm:text-[11px]">{formatWeightAmount(selectedWeight)}: <span className="font-black text-[#005931]">{money(selectedWeightPrice)} ج.م</span></p>
        )}

        {unavailable && (
          showRestockReminder ? (
            <button
              type="button"
              onClick={() => void toggleRestockReminder()}
              disabled={reminderPending || !onRestockReminderToggle}
              className={`mt-1.5 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border px-2 text-[9px] font-black transition sm:mt-2 sm:min-h-10 sm:text-xs ${restockReminderActive ? 'border-[#e5c767] bg-[#fff5d3] text-[#005931]' : 'border-[#b8d8c8] bg-white text-[#005931]'} disabled:opacity-60`}
              aria-pressed={restockReminderActive}
            >
              {reminderPending ? <BrandLoader size="xs" /> : restockReminderActive ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
              <span>{restockReminderActive ? 'التذكير مفعّل' : 'نبّهني عند التوفر'}</span>
            </button>
          ) : (
            <div className="mt-1.5 flex h-7 items-center justify-center rounded-lg bg-slate-100 text-[9px] font-bold text-slate-600 sm:mt-2 sm:h-9 sm:rounded-xl sm:text-xs">غير متاح</div>
          )
        )}
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
