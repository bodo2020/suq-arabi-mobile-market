import React from 'react';
import type { Product } from '@/lib/supabase';
import type { ProductPreview } from '@/lib/productBrowsing';
import { productCardImage } from '@/lib/productCardImage';
import { isWeightedProduct, productUnitPrice, productWeightStepGrams } from '@/lib/productPurchase';

type Props = {
  offset: number;
  preview: ProductPreview | null;
  product: Product | null;
  locked: boolean;
  visible: boolean;
  handoff: boolean;
  handoffExiting: boolean;
  transitioning: boolean;
  onOpen: (offset: number) => void;
};

const money = (amount: number) =>
  Number(amount || 0).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

/**
 * Adjacent sheets are intentionally *presentation-only*. Full details,
 * shadows, nested controls and product suggestions are painted only after
 * a swipe settles. Keeping matching hero geometry avoids a loading flash.
 */
function ProductSwipePeek({
  offset, preview, product, locked, visible, handoff, handoffExiting, transitioning, onOpen,
}: Props) {
  if (!preview) return null;
  const bulk = new URLSearchParams(preview.path.split('?')[1] || '').get('unit') === 'bulk';
  const image = preview.image || (bulk
    ? product?.bulk_image_url || product?.image_urls?.[0]
    : product?.image_urls?.[0]) || '';
  const title = (bulk ? product?.bulk_name || product?.name : product?.name) || preview.name || 'المنتج';
  const weighted = Boolean(product && isWeightedProduct(product));
  const price = product
    ? money(bulk
      ? Number(product.bulk_price || 0)
      : weighted
        ? productUnitPrice(product) * productWeightStepGrams(product) / 1000
        : productUnitPrice(product))
    : preview.price;

  // Center at -50%; side sheets are one width + 10px away.
  const position = `${offset * 100 - 50}% + ${offset * 10}px`;
  const shown = visible && !(handoff && handoffExiting);

  return (
    <button
      type="button"
      data-product-swipe-card
      onClick={() => onOpen(offset)}
      disabled={locked || !visible}
      aria-hidden={!visible}
      aria-label={`عرض تفاصيل ${title}`}
      dir="rtl"
      className={`absolute bottom-0 left-1/2 ${handoff ? 'z-20 pointer-events-none' : 'z-[1]'} flex h-[calc(100dvh-20px)] w-[78vw] max-w-[560px] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f9f8] text-right shadow-[0_10px_30px_rgba(0,0,0,.13)] motion-reduce:transition-none ${transitioning ? 'will-change-transform transition-[transform,opacity] duration-[220ms] ease-out' : 'transition-opacity duration-[160ms]'} ${shown ? 'opacity-100' : 'opacity-0'}`}
      style={{ transform: `translate3d(calc(${position} + var(--product-swipe-x, 0px)), 0, 0)` }}
    >
      <span className="flex w-full shrink-0 flex-col rounded-t-[30px] bg-white px-4 pb-2 pt-3">
        <span className="mx-auto mb-2 flex h-4 w-20 items-center justify-center">
          <span className="h-1 w-11 rounded-full bg-slate-300" />
        </span>
        <span className="flex h-10 items-center justify-center text-sm font-extrabold text-slate-700">
          تفاصيل المنتج
        </span>
      </span>

      <span className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-3 pb-4 pt-3">
        <span className="flex h-[min(34dvh,270px)] shrink-0 items-center justify-center overflow-hidden rounded-[24px] bg-white">
          {image
            ? <img
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
            : <span className="h-32 w-32 rounded-3xl bg-slate-100" />}
        </span>

        <span className="flex w-full flex-col rounded-[24px] bg-white px-4 pb-5 pt-4">
          <strong className="line-clamp-2 text-[20px] font-black leading-[1.45] text-slate-950">
            {title}
          </strong>
          <span className="mt-2 text-xs font-medium text-slate-500">
            {bulk ? 'جملة' : weighted ? 'بالوزن' : 'المنتج'}
          </span>
          <span className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-4">
            <strong className="text-[30px] font-black leading-none text-[#005931]">{price || '—'}</strong>
            <span className="text-sm font-black text-[#005931]">ج.م</span>
          </span>
        </span>
      </span>

      <span className="flex w-full shrink-0 border-t border-slate-100 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
        <span className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#eef7f1] text-xs font-bold text-[#005931]">
          اسحب لعرض المنتج
        </span>
      </span>
    </button>
  );
}

export default React.memo(ProductSwipePeek);
