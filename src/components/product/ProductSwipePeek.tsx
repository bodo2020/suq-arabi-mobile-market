import React from 'react';
import type { Product } from '@/lib/supabase';
import type { ProductPreview } from '@/lib/productBrowsing';
import { productCardImage } from '@/lib/productCardImage';
import { SHEET_GALLERY, SHEET_IMAGE, SHEET_ROUND_BUTTON } from './productSheetLayout';
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
  moving: boolean;
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
  offset, preview, product, locked, visible, handoff, handoffExiting, transitioning, moving, onOpen,
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

  // Match center card's 92vw width and the exact 8px horizontal gutter.
  const position = `${offset * 100 - 50}% ${offset < 0 ? '-' : '+'} ${Math.abs(offset) * 8}px`;
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
      className={`absolute bottom-0 left-1/2 ${handoff ? 'z-20 pointer-events-none' : 'z-[1]'} flex h-[calc(100dvh-64px)] w-[92vw] max-w-[680px] flex-col overflow-hidden rounded-t-[30px] bg-[#f7f9f8] text-right shadow-[0_10px_30px_rgba(0,0,0,.13)] motion-reduce:transition-none will-change-transform ${transitioning ? 'transition-[transform,opacity] duration-[220ms] ease-out' : 'transition-opacity duration-[160ms]'} ${shown ? 'opacity-100' : 'opacity-0'}`}
      style={{ transform: `translate3d(calc(${position} + var(--product-swipe-x, 0px)), var(--product-dismiss-y, 0px), 0)` }}
    >
      {/* Same geometry as the real sheet: photo at the top, floating round buttons. */}
      <span className="absolute inset-x-0 top-0 z-10 flex h-5 justify-center" aria-hidden="true">
        <span className="mt-auto h-1 w-10 rounded-full bg-slate-300/90" />
      </span>
      <span className={`${SHEET_ROUND_BUTTON} absolute right-4 top-5 z-10`} aria-hidden="true" />
      <span className="absolute left-4 top-5 z-10 flex flex-col gap-3" aria-hidden="true">
        <span className={SHEET_ROUND_BUTTON} />
        <span className={SHEET_ROUND_BUTTON} />
      </span>

      <span className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden px-3 pb-4">
        <span className={SHEET_GALLERY}>
          {image
            ? <img
                src={productCardImage(image)}
                alt=""
                loading="eager"
                decoding="async"
                draggable={false}
                className={SHEET_IMAGE}
                onError={event => {
                  if (event.currentTarget.src !== image) {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = image;
                  }
                }}
              />
            : <span className="skeleton-shimmer h-32 w-32 rounded-3xl" />}
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
