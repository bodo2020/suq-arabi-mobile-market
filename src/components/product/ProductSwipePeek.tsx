import React from 'react';
import { Heart, Share2, X } from 'lucide-react';
import type { Product } from '@/lib/supabase';
import type { ProductPreview } from '@/lib/productBrowsing';
import { productCardImage } from '@/lib/productCardImage';
import { isWeightedProduct, productUnitPrice } from '@/lib/productPurchase';

type Props = {
  side: 'left' | 'right';
  preview: ProductPreview | null;
  product: Product | null;
  locked: boolean;
  visible: boolean;
  transitioning: boolean;
  onOpen: () => void;
};

const money = (amount: number) => Number(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

/**
 * A painted, *full-sized* neighboring product sheet, not merely a thumbnail
 * floating alongside the current product. Both side sheets have exactly the
 * same geometry/header/hero/summary/sticky purchase footer as the center.
 * Their data comes from the catalog snapshot and prefetched query cache;
 * the actual interactive purchase controls mount after the slide settles.
 *
 * Only two neighbors exist in the DOM, so the gesture does not rerender
 * hundreds of catalog products or fetch details inside an animation frame.
 */
function ProductSwipePeek({ side, preview, product, locked, visible, transitioning, onOpen }: Props) {
  if (!preview) return null;
  const bulk = new URLSearchParams(preview.path.split('?')[1] || '').get('unit') === 'bulk';
  // The catalog URL was already decoded before the swipe. Do not replace the
  // visible source when canonical product details finish in the background.
  const image = preview.image || (bulk
    ? product?.bulk_image_url || product?.image_urls?.[0]
    : product?.image_urls?.[0]) || '';
  const title = (bulk ? product?.bulk_name || product?.name : product?.name) || preview.name || 'المنتج';
  const price = product
    ? money(bulk ? Number(product.bulk_price || 0) : productUnitPrice(product))
    : preview.price;
  const isWeighted = product ? isWeightedProduct(product) : false;
  const unit = bulk ? 'جملة' : isWeighted ? 'يباع بالوزن' : String(product?.unit_of_measure || 'قطعة');
  const inStock = product ? Number(product.quantity || 0) > 0 : true;
  const original = product ? Number(product.price || 0) : 0;
  const current = product ? productUnitPrice(product) : 0;
  const discount = !bulk && original > current && current > 0
    ? Math.round((1 - current / original) * 100)
    : 0;
  const position = side === 'left' ? '-150% - 10px' : '50% + 10px';

  return (
    <button
      type="button"
      data-product-swipe-card
      onClick={onOpen}
      disabled={locked || !visible}
      aria-label={`عرض تفاصيل ${title}`}
      className={`absolute bottom-0 left-1/2 z-[1] flex h-[calc(100dvh-20px)] w-[78vw] max-w-[560px] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f9f8] text-right shadow-[0_18px_70px_rgba(0,0,0,.18)] will-change-transform motion-reduce:transition-none disabled:cursor-default ${visible ? 'opacity-100' : 'opacity-0'} ${transitioning ? 'transition-[transform,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]' : 'transition-opacity duration-200'}`}
      style={{ transform: `translate3d(calc(${position} + var(--product-swipe-x, 0px)), 0, 0)` }}
      dir="rtl"
    >
      <header className="w-full shrink-0 rounded-t-[30px] bg-white px-4 pb-2 pt-3">
        <span className="mx-auto mb-2 flex h-4 w-20 items-center justify-center">
          <span className="h-1 w-11 rounded-full bg-slate-300" />
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-800">
            <X size={19} />
          </span>
          <span className="truncate text-center text-sm font-extrabold text-slate-700">تفاصيل المنتج</span>
          <span className="flex items-center gap-1 text-slate-700">
            <span className="flex h-10 w-10 items-center justify-center"><Share2 size={19} /></span>
            <span className="flex h-10 w-10 items-center justify-center"><Heart size={19} /></span>
          </span>
        </span>
      </header>
      <div className="min-h-0 w-full flex-1 space-y-3 overflow-hidden px-3 pb-5 pt-3">
        <div className="relative flex h-[min(34dvh,270px)] items-center justify-center overflow-hidden rounded-[24px] border border-slate-100 bg-white">
          {image ? (
            <img
              src={productCardImage(image)}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              className="h-full w-full object-contain px-7 py-5"
              onError={event => {
                if (event.currentTarget.src !== image) {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = image;
                }
              }}
            />
          ) : <div className="h-32 w-32 rounded-3xl bg-slate-100" />}
          {discount > 0 && (
            <span className="absolute bottom-4 right-4 rounded-xl bg-brand-yellow px-3 py-1.5 text-xs font-black text-[#005931]">
              خصم {discount}%
            </span>
          )}
        </div>
        <section className="rounded-[24px] border border-slate-100 bg-white px-4 pb-4 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${inStock ? 'bg-emerald-50 text-[#005931]' : 'bg-slate-100 text-slate-500'}`}>
              {inStock ? 'متوفر للطلب' : 'غير متوفر حاليًا'}
            </span>
            {bulk && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-[#005931]">جملة</span>}
          </div>
          <span className="block line-clamp-2 text-[21px] font-black leading-[1.45] text-slate-950">{title}</span>
          <span className="mt-1 block text-xs font-medium text-slate-500">{unit}</span>
          <span className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
            <strong className="text-[31px] font-black leading-none tracking-tight text-[#005931]">{price || '—'}</strong>
            <span className="pb-0.5 text-sm font-black text-[#005931]">ج.م</span>
            {discount > 0 && <del className="mr-auto text-xs text-slate-400">{money(original)} ج.م</del>}
          </span>
        </section>
      </div>
      <footer className="w-full shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <span className="flex h-12 items-center gap-2">
          {!bulk && !isWeighted && (
            <span className="flex h-12 w-[104px] shrink-0 items-center justify-around rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700">
              <span>−</span><span>1</span><span>+</span>
            </span>
          )}
          <span className="flex h-12 min-w-0 flex-1 items-center justify-between rounded-2xl bg-[#005931] px-3 text-sm font-black text-white">
            <span>{isWeighted ? 'اختار الوزن' : '＋ أضف للسلة'}</span>
            <span className="truncate text-xs">{price} ج.م</span>
          </span>
        </span>
      </footer>
    </button>
  );
}

export default React.memo(ProductSwipePeek);
