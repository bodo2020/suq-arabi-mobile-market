import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Trash2, Scale, Package } from 'lucide-react';
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

const ProductCard: React.FC<ProductCardProps> = ({ product, showBulkQuantity = false }) => {
  const { items, addToCart, updateQuantity, removeFromCart, isInitialized } = useCart();
  const [weightOpen, setWeightOpen] = useState(false);
  const [failedBulkImage, setFailedBulkImage] = useState<string | null>(null);
  const [draftWeight, setDraftWeight] = useState<number | null>(null);

  const weighted = isWeightedProduct(product);
  const weightStep = weighted ? productWeightStepGrams(product) : 0;
  const wantsBulk = product.displayType === 'bulk' || showBulkQuantity;
  const bulk = wantsBulk && hasBulkPurchase(product);
  const item = items.find(i => i.product.id === product.id && !!i.is_bulk === bulk && (weighted ? i.unit_of_measure === 'weight' : true));
  const pack = bulk ? Number(product.bulk_quantity || 1) : 1;
  const stock = Math.max(0, Number(product.quantity || 0));
  const maxCartQuantity = weighted ? Math.floor(stock * 1000) : bulk ? Math.floor(stock / Math.max(pack, 1)) : Math.floor(stock);
  const price = bulk ? Number(product.bulk_price || 0) : productUnitPrice(product);
  const discount = !bulk && Number(product.price || 0) > price ? Math.round((1 - price / Number(product.price)) * 100) : 0;
  const unavailable = stock <= 0 || (wantsBulk && (!bulk || maxCartQuantity <= 0));
  const reachedStockLimit = Boolean(item && item.quantity >= maxCartQuantity);
  const bulkImageUrl = bulk ? String(product.bulk_image_url || '').trim() : '';
  const showBulkImage = Boolean(bulkImageUrl && failedBulkImage !== bulkImageUrl);
  const packNumber = String(Math.max(1, Math.trunc(pack)));
  const displayName = bulk ? (String(product.bulk_name || '').trim() || product.name) : product.name;
  const variantId = bulk ? product.bulk_variant_id || null : null;
  const detailHref = bulk
    ? `/product/${product.id}?unit=bulk${variantId ? `&variant=${encodeURIComponent(variantId)}` : ''}`
    : `/product/${product.id}`;

  const selectedWeight = weighted
    ? Math.min(maxCartQuantity || weightStep, Math.max(1, Math.round(Number(item?.quantity || draftWeight || weightStep))))
    : 0;
  const weightCanIncrease = weighted && selectedWeight < maxCartQuantity;
  const weightCanDecrease = weighted && selectedWeight > weightStep;
  const selectedWeightPrice = weighted ? price * selectedWeight / 1000 : price;
  const selectedWeightOriginalPrice = weighted ? Number(product.price || 0) * selectedWeight / 1000 : Number(product.price || 0);

  const addRegularOrBulk = () => {
    if (!isInitialized || unavailable || reachedStockLimit || weighted) return;
    if (item) updateQuantity(product.id, Math.min(item.quantity + 1, maxCartQuantity), bulk);
    else addToCart({
      ...product,
      name: displayName,
      image_urls: bulk && bulkImageUrl ? [bulkImageUrl] : product.image_urls,
      price: product.price,
      quantity: 1,
      is_bulk: bulk,
    });
  };

  const applyWeight = (grams: number) => {
    if (!weighted || maxCartQuantity <= 0) return;
    const next = Math.min(maxCartQuantity, Math.max(1, Math.round(grams)));
    if (item) updateQuantity(product.id, next, false);
    else setDraftWeight(next);
  };

  const addSelectedWeight = () => {
    if (!weighted || !isInitialized || unavailable || selectedWeight <= 0) return;
    addToCart({
      ...product,
      quantity: selectedWeight,
      price: product.price,
      unit_of_measure: 'weight',
      is_bulk: false,
    });
  };

  const increaseWeight = () => {
    if (!weighted || !isInitialized || !weightCanIncrease) return;
    if (!item) {
      addSelectedWeight();
      return;
    }
    updateQuantity(product.id, Math.min(maxCartQuantity, selectedWeight + weightStep), false);
  };

  const decreaseWeight = () => {
    if (!weighted || !isInitialized) return;
    if (item) {
      if (selectedWeight <= weightStep) {
        removeFromCart(product.id, false);
        return;
      }
      updateQuantity(product.id, Math.max(1, selectedWeight - weightStep), false);
      return;
    }
    if (weightCanDecrease) applyWeight(selectedWeight - weightStep);
  };

  return (
    <article className="relative flex h-full min-w-0 flex-col rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-shadow hover:shadow-md" dir="rtl">
      <div className="absolute left-2 top-2 z-10 rounded-full bg-white/95">
        <FavoriteButton productId={product.id} variantId={variantId} size="sm" />
      </div>

      <Link to={detailHref} className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        <div className={`relative mb-3 aspect-square overflow-hidden rounded-xl p-3 ${bulk && !showBulkImage ? 'bg-emerald-50/70' : 'bg-gray-50'}`}>
          {bulk ? (
            showBulkImage ? (
              <img
                src={bulkImageUrl}
                alt={displayName}
                loading="lazy"
                decoding="async"
                onError={() => setFailedBulkImage(bulkImageUrl)}
                className="h-full w-full object-contain transition-transform motion-safe:group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center" aria-label={`عبوة ${packNumber}`}>
                <div className="flex aspect-square w-[62%] max-w-28 items-center justify-center rounded-[24%] border border-white/20 bg-[#005931] shadow-[0_10px_28px_rgba(0,89,49,0.20)] transition-transform motion-safe:group-hover:scale-105">
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
              onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
              className="h-full w-full object-contain transition-transform motion-safe:group-hover:scale-105"
            />
          )}
          {discount > 0 && <span className="absolute right-1 top-1 rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">خصم {money(discount)}٪</span>}
        </div>
        <h3 className="mb-2 min-h-10 line-clamp-2 text-sm font-semibold leading-5 text-gray-900">{displayName}</h3>
      </Link>

      <p className="mb-2 flex items-center gap-1 text-xs text-gray-500">
        {weighted ? <><Scale size={14} /> بالوزن</> : bulk ? <><Package size={14} /> عبوة {pack} قطعة</> : 'سعر القطعة'}
      </p>

      <div className="mb-3 mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="text-lg text-[#005931]">
          {money(weighted ? selectedWeightPrice : price)} <span className="text-xs font-medium">ج.م</span>
        </strong>
        {weighted && <span className="text-xs font-semibold text-[#005931]">/ {formatWeightAmount(selectedWeight)}</span>}
        {discount > 0 && (
          <del className="text-xs text-gray-400">
            {money(weighted ? selectedWeightOriginalPrice : Number(product.price || 0))} ج.م
          </del>
        )}
      </div>

      {unavailable ? (
        <button disabled className="min-h-11 rounded-xl bg-gray-100 text-sm text-gray-500">غير متاح حاليًا</button>
      ) : weighted ? (
        <div className="flex min-h-11 items-center justify-between overflow-hidden rounded-xl border border-green-100 bg-green-50 text-[#005931]">
          <button
            type="button"
            onClick={decreaseWeight}
            disabled={!isInitialized || (!item && !weightCanDecrease)}
            aria-label={item && selectedWeight <= weightStep ? `حذف ${displayName} من السلة` : `تقليل الوزن بمقدار ${formatWeightAmount(weightStep)}`}
            className="flex h-11 w-10 shrink-0 items-center justify-center disabled:opacity-25"
          >
            {item && selectedWeight <= weightStep ? <Trash2 size={17} /> : <Minus size={17} />}
          </button>
          <button
            type="button"
            onClick={() => setWeightOpen(true)}
            className="min-w-0 flex-1 px-1 text-center"
            aria-label={`تعديل الوزن الحالي ${formatWeightAmount(selectedWeight)}`}
          >
            <strong className="block text-sm">{formatWeightAmount(selectedWeight)}</strong>
          </button>
          <button
            type="button"
            onClick={increaseWeight}
            disabled={!isInitialized || !weightCanIncrease}
            aria-label={item ? `زيادة الوزن بمقدار ${formatWeightAmount(weightStep)}` : `إضافة ${formatWeightAmount(selectedWeight)} للسلة`}
            className="flex h-11 w-10 shrink-0 items-center justify-center disabled:opacity-25"
          >
            <Plus size={18} />
          </button>
        </div>
      ) : item ? (
        <div className="flex items-center justify-between rounded-xl bg-green-50 text-[#005931]">
          <button
            disabled={!isInitialized}
            onClick={() => updateQuantity(product.id, item.quantity - 1, bulk)}
            aria-label={item.quantity === 1 ? `حذف ${displayName} من السلة` : `تقليل كمية ${displayName}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl"
          >
            {item.quantity === 1 ? <Trash2 size={18} /> : <Minus size={18} />}
          </button>
          <span aria-live="polite" className="text-sm font-bold">{money(item.quantity)}</span>
          <button
            disabled={!isInitialized || reachedStockLimit}
            onClick={addRegularOrBulk}
            aria-label={reachedStockLimit ? `وصلت للكمية المتاحة من ${displayName}` : `زيادة كمية ${displayName}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-30"
          >
            <Plus size={18} />
          </button>
        </div>
      ) : (
        <button disabled={!isInitialized} onClick={addRegularOrBulk} className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#005931] px-2 text-sm font-semibold text-white disabled:opacity-40">
          <Plus size={18} />إضافة للسلة
        </button>
      )}

      {weightOpen && weighted && (
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
