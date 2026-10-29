import { useState } from 'react';
import { Check, Minus, Plus, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import { moneyEGP, smartProductPrice } from '@/lib/smartShopping';

type Props = {
  product: Product;
  selected?: boolean;
  quantity?: number;
  onSelect?: () => void;
  onChangeQuantity?: (delta: number) => void;
  maxQuantity?: number;
};

/** Product-only imagery. Transparent PNG/WebP keeps its alpha; white
 * catalog photos softly merge into the app's neutral background. */
export default function SmartProductChoiceCard({
  product, selected = false, quantity = 0, onSelect, onChangeQuantity,
  maxQuantity = 99,
}: Props) {
  const [imageFailed,setImageFailed] = useState(false);
  const stock = Math.max(0, Math.floor(Number(product.quantity || 0)));
  const max = Math.min(stock, maxQuantity);
  const unavailable = max === 0;
  const total = smartProductPrice(product) * Math.max(1, quantity);

  return (
    <article className={`relative min-w-0 overflow-hidden rounded-[22px] border p-2.5 transition-colors ${selected || quantity > 0
      ? 'border-[#005931] bg-[#edf6f0]'
      : 'border-[#dce8e1] bg-[#f6f8f7]'}`}>
      {(selected || quantity > 0) && (
        <span className="absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#005931] text-white">
          <Check size={15} strokeWidth={3} />
        </span>
      )}
      {product.image_urls?.[0] && !imageFailed ? (
        <div className="mb-2 flex h-[100px] items-center justify-center rounded-xl bg-[#f6f8f7] sm:h-[120px]">
          <img
            src={product.image_urls[0]}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
            className="smart-product-cutout h-full w-full object-contain p-2"
          />
        </div>
      ) : (
        <div className="mb-2 flex h-[100px] items-center justify-center rounded-xl bg-[#f6f8f7] text-[#95afa0] sm:h-[120px]">
          <ShoppingBag size={30} aria-label="صورة المنتج غير متاحة" />
        </div>
      )}
      <h4 className="line-clamp-2 min-h-10 text-[12px] font-bold leading-5 text-slate-900">{product.name}</h4>
      <div className="mt-1 flex items-end justify-between gap-1">
        <span className="text-sm font-black text-[#005931]">{moneyEGP(smartProductPrice(product))} ج</span>
        {Number(product.offer_price || 0) > 0 && Number(product.offer_price) < Number(product.price) && (
          <del className="text-[10px] text-slate-400">{moneyEGP(product.price)}</del>
        )}
      </div>
      {onChangeQuantity ? (
        <div className="mt-2 flex h-10 items-center justify-between rounded-xl border border-emerald-100 bg-white px-1">
          <button type="button" aria-label={`شيل واحدة من ${product.name}`}
            onClick={() => onChangeQuantity(-1)} disabled={quantity <= 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#005931] disabled:opacity-30">
            <Minus size={17} />
          </button>
          <span className="min-w-6 text-center text-sm font-extrabold" aria-label={`المختار ${quantity}`}>
            {quantity.toLocaleString('ar-EG')}
          </span>
          <button type="button" aria-label={`ضيف واحدة من ${product.name}`}
            onClick={() => onChangeQuantity(1)} disabled={unavailable || quantity >= max}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#005931] disabled:opacity-30">
            <Plus size={17} />
          </button>
        </div>
      ) : (
        <button type="button" disabled={unavailable || !onSelect} onClick={onSelect}
          aria-pressed={selected}
          className={`mt-2 min-h-10 w-full rounded-xl text-xs font-bold ${selected
            ? 'bg-[#005931] text-white'
            : 'border border-emerald-200 bg-white text-[#005931]'} disabled:opacity-50`}>
          {unavailable ? 'خلص من الفرع' : selected ? 'ده اختياري' : 'اختار ده'}
        </button>
      )}
      {quantity > 1 && (
        <p className="mt-1 text-center text-[10px] text-[#005931]">
          الإجمالي {moneyEGP(total)} ج
        </p>
      )}
    </article>
  );
}
