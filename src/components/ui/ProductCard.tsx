import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Package, Plus, Scale, Trash2 } from 'lucide-react';
import { Product } from '@/lib/supabase';
import { formatWeightAmount, hasBulkPurchase, isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';
import { useCart } from '@/contexts/useCart';
import FavoriteButton from './FavoriteButton';
import WeightSelector from './WeightSelector';

interface ProductCardProps {
  product: Product & { displayType?: 'regular' | 'bulk'; variantKey?: string };
  hideIfUnavailable?: boolean;
  showBulkQuantity?: boolean;
}

const money = (value: number) => Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

const ProductCard: React.FC<ProductCardProps> = ({ product, hideIfUnavailable = false, showBulkQuantity = false }) => {
  const { items, addToCart, updateQuantity, removeFromCart, isInitialized } = useCart();
  const [weightOpen, setWeightOpen] = useState(false);
  const [failedBulkImage, setFailedBulkImage] = useState<string | null>(null);

  const weighted = isWeightedProduct(product);
  const weightStep = weighted ? productWeightStepGrams(product) : 0;
  const wantsBulk = product.displayType === 'bulk' || showBulkQuantity;
  const bulk = wantsBulk && hasBulkPurchase(product);
  const bulkAlternative = !bulk && !weighted && hasBulkPurchase(product);
  const item = items.find(i => i.product.id === product.id && !!i.is_bulk === bulk && (weighted ? i.unit_of_measure === 'weight' : true));
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
  const showBulkImage = Boolean(bulkImageUrl && failedBulkImage !== bulkImageUrl);
  const packNumber = String(Math.max(1, Math.trunc(pack)));
  const displayName = bulk ? (String(product.bulk_name || '').trim() || product.name) : product.name;
  const bulkUnitType = bulk
    ? (String((product as Product & { bulk_variant_type?: string | null }).bulk_variant_type || '').trim() || 'جملة')
    : '';
  const variantId = bulk ? product.bulk_variant_id || null : null;
  const detailHref = bulk
    ? `/product/${product.id}?unit=bulk${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`
    : `/product/${product.id}`;

  const selectedWeight = weighted
    ? Math.min(maxCartQuantity || weightStep, Math.max(1, Math.round(Number(item?.quantity || weightStep))))
    : 0;
  const weightCanIncrease = weighted && selectedWeight < maxCartQuantity;
  const selectedWeightPrice = weighted ? price * selectedWeight / 1000 : price;

  if (hideIfUnavailable && unavailable) return null;

  const addRegularOrBulk = () => {
    if (!isInitialized || unavailable || reachedStockLimit || weighted) return;
    if (item) {
      updateQuantity(product.id, Math.min(item.quantity + 1, maxCartQuantity), bulk);
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

  const decreaseRegularOrBulk = () => {
    if (!isInitialized || !item || weighted) return;
    if (item.quantity <= 1) {
      removeFromCart(product.id, bulk);
      return;
    }
    updateQuantity(product.id, item.quantity - 1, bulk);
  };

  const applyWeight = (grams: number) => {
    if (!weighted || maxCartQuantity <= 0 || !item) return;
    const next = Math.min(maxCartQuantity, Math.max(1, Math.round(grams)));
    updateQuantity(product.id, next, false);
  };

  const increaseWeight = () => {
    if (!weighted || !isInitialized || !item || !weightCanIncrease) return;
    updateQuantity(product.id, Math.min(maxCartQuantity, selectedWeight + weightStep), false);
  };

  const decreaseWeight = () => {
    if (!weighted || !isInitialized || !item) return;
    if (selectedWeight <= weightStep) {
      removeFromCart(product.id, false);
      return;
    }
    updateQuantity(product.id, Math.max(1, selectedWeight - weightStep), false);
  };

  const rawUnit = String(product.unit_of_measure || '').trim();
  const unitLabel = weighted
    ? 'السعر / كجم'
    : bulk
      ? `${bulkUnitType} · ${money(pack)} قطعة`
      : rawUnit || 'للقطعة';

  return (
    <article
      className={`group/card relative flex h-full min-w-0 flex-col rounded-[22px] bg-white p-2.5 shadow-[0_5px_20px_rgba(15,23,42,0.055)] ring-1 ring-black/[0.035] transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,89,49,0.10)] active:scale-[0.995] ${unavailable ? 'opacity-[0.82]' : ''}`}
      dir="rtl"
      data-product-card="v3"
    >
      <div className="relative mb-7">
        <Link to={detailHref} className="block rounded-[18px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]">
          <div className={`relative aspect-square overflow-hidden rounded-[18px] p-3.5 ${bulk && !showBulkImage ? 'bg-emerald-50' : 'bg-gradient-to-b from-[#fafbfa] to-[#f4f7f5]'}`}>
            {bulk ? (
              showBulkImage ? (
                <img
                  src={bulkImageUrl}
                  alt={displayName}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedBulkImage(bulkImageUrl)}
                  className="h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover/card:scale-[1.04]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" aria-label={`${bulkUnitType} ${packNumber} قطعة`}>
                  <div className="flex aspect-square w-[60%] max-w-28 items-center justify-center rounded-[26%] bg-[#005931] shadow-[0_12px_28px_rgba(0,89,49,0.20)] transition-transform duration-300 motion-safe:group-hover/card:scale-[1.04]">
                    <span className="select-none text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">{packNumber}</span>
                  </div>
                </div>
              )
            ) : (
              <img
                src={product.image_urls?.[0] || '/placeholder.svg'}
                alt={displayName}
                loading="lazy"
                decoding="async"
                onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }}
                className="h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover/card:scale-[1.04]"
              />
            )}
          </div>
        </Link>

        <div className="absolute left-2 top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-[0_4px_14px_rgba(15,23,42,0.10)] backdrop-blur-sm">
          <FavoriteButton productId={product.id} variantId={variantId} size="sm" />
        </div>

        <div className="absolute right-2 top-2 z-20 flex flex-col items-start gap-1.5">
          {discount > 0 && (
            <span className="rounded-xl bg-[#ff6767] px-2.5 py-1.5 text-[11px] font-black text-white shadow-sm">-{money(discount)}%</span>
          )}
          {bulk && <span className="rounded-lg bg-[#005931] px-2 py-1 text-[10px] font-extrabold text-white">{bulkUnitType}</span>}
          {unavailable && <span className="rounded-lg bg-slate-800/85 px-2 py-1 text-[10px] font-bold text-white">غير متوفر</span>}
        </div>

        {!unavailable && (
          <div className="absolute -bottom-5 left-2 z-30 max-w-[calc(100%-16px)]">
            {weighted ? (
              item ? (
                <div className="flex h-12 min-w-[132px] items-center overflow-hidden rounded-full border border-emerald-100 bg-white text-[#005931] shadow-[0_8px_20px_rgba(15,23,42,0.16)]">
                  <button type="button" onClick={decreaseWeight} disabled={!isInitialized} aria-label={selectedWeight <= weightStep ? `حذف ${displayName} من السلة` : `تقليل الوزن بمقدار ${formatWeightAmount(weightStep)}`} className="flex h-12 w-11 shrink-0 items-center justify-center disabled:opacity-30">
                    {selectedWeight <= weightStep ? <Trash2 size={17} /> : <Minus size={18} />}
                  </button>
                  <button type="button" onClick={() => setWeightOpen(true)} className="min-w-0 flex-1 px-1 text-center" aria-label={`تعديل الوزن الحالي ${formatWeightAmount(selectedWeight)}`}>
                    <strong className="block whitespace-nowrap text-xs">{formatWeightAmount(selectedWeight)}</strong>
                  </button>
                  <button type="button" onClick={increaseWeight} disabled={!isInitialized || !weightCanIncrease} aria-label={`زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}`} className="flex h-12 w-11 shrink-0 items-center justify-center bg-[#005931] text-white disabled:opacity-30">
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setWeightOpen(true)} disabled={!isInitialized} aria-label={`اختيار وزن ${displayName}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#caff00] text-[#005931] shadow-[0_9px_22px_rgba(37,82,0,0.24)] transition-transform active:scale-90 disabled:opacity-50">
                  <Plus size={28} strokeWidth={2.3} />
                </button>
              )
            ) : item ? (
              <div className="flex h-12 min-w-[122px] items-center overflow-hidden rounded-full border border-slate-100 bg-white text-[#005931] shadow-[0_8px_20px_rgba(15,23,42,0.16)]">
                <button type="button" onClick={decreaseRegularOrBulk} disabled={!isInitialized} aria-label={item.quantity <= 1 ? `حذف ${displayName} من السلة` : `تقليل كمية ${displayName}`} className="flex h-12 w-11 shrink-0 items-center justify-center disabled:opacity-30">
                  {item.quantity <= 1 ? <Trash2 size={17} /> : <Minus size={18} />}
                </button>
                <span aria-live="polite" className="min-w-9 flex-1 text-center text-sm font-black text-slate-900">{money(item.quantity)}</span>
                <button type="button" onClick={addRegularOrBulk} disabled={!isInitialized || reachedStockLimit} aria-label={reachedStockLimit ? `وصلت للكمية المتاحة من ${displayName}` : `زيادة كمية ${displayName}`} className="flex h-12 w-11 shrink-0 items-center justify-center bg-[#005931] text-white disabled:opacity-30">
                  <Plus size={20} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={addRegularOrBulk} disabled={!isInitialized} aria-label={`إضافة ${displayName} للسلة`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#caff00] text-[#005931] shadow-[0_9px_22px_rgba(37,82,0,0.24)] transition-transform active:scale-90 disabled:opacity-50">
                <Plus size={28} strokeWidth={2.3} />
              </button>
            )}
          </div>
        )}
      </div>

      <Link to={detailHref} className="min-w-0 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]">
        <h3 className="min-h-10 line-clamp-2 text-[14px] font-bold leading-5 text-slate-950 sm:text-[15px]">{displayName}</h3>
      </Link>

      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
        {weighted ? <Scale size={13} className="text-[#005931]" /> : bulk ? <Package size={13} className="text-[#005931]" /> : null}
        <span>{unitLabel}</span>
        {bulkAlternative && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-[#005931]">جملة متاحة</span>}
        {limitedStock && <span className="mr-auto rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">كمية محدودة</span>}
      </div>

      <div className="mt-auto pt-2.5">
        <div className="flex flex-wrap items-end gap-x-1.5 gap-y-1">
          <strong className={`rounded-md px-1 py-0.5 text-[21px] font-black leading-none tracking-tight text-slate-950 ${discount > 0 ? 'bg-[#d8ff36]' : ''}`}>{money(price)}</strong>
          <span className="pb-0.5 text-[11px] font-bold text-[#005931]">ج.م</span>
          {discount > 0 && <del className="pb-0.5 text-xs font-medium text-slate-400">{money(regularPrice)}</del>}
        </div>

        {weighted && item && (
          <p className="mt-1.5 text-[11px] font-semibold text-slate-500">قيمة {formatWeightAmount(selectedWeight)}: <span className="font-black text-[#005931]">{money(selectedWeightPrice)} ج.م</span></p>
        )}

        {unavailable && <div className="mt-2 flex h-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500">غير متاح حاليًا</div>}
      </div>

      {weightOpen && weighted && (
        <WeightSelector product={product} isOpen={weightOpen} onClose={() => setWeightOpen(false)} initialWeight={item ? selectedWeight : weightStep} onSelect={item ? applyWeight : undefined} />
      )}
    </article>
  );
};

export default React.memo(ProductCard);
