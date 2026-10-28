import React from 'react';
import type { Product } from '@/lib/supabase';
import type { ProductPreview } from '@/lib/productBrowsing';
import { productCardImage } from '@/lib/productCardImage';
import { productUnitPrice } from '@/lib/productPurchase';

type Props = {
  side: 'left' | 'right';
  preview: ProductPreview | null;
  product: Product | null;
  locked: boolean;
  visible: boolean;
  transitioning: boolean;
  onOpen: () => void;
};

/**
 * Only two adjacent cards are mounted. Their already-cached catalog image,
 * title and price remain painted while the center card is dragged. No cart,
 * recommendations, route fetches, or heavy product component is mounted here.
 */
function ProductSwipePeek({ side, preview, product, locked, visible, transitioning, onOpen }: Props) {
  if (!preview) return null;
  const bulk = new URLSearchParams(preview.path.split('?')[1] || '').get('unit') === 'bulk';
  // Never swap the URL of a visible side card merely because its background
  // detail request completed. The exact catalog URL is already being decoded.
  const image = preview.image || (bulk
    ? product?.bulk_image_url || product?.image_urls?.[0]
    : product?.image_urls?.[0]) || '';
  const title = bulk ? product?.bulk_name || product?.name || preview.name : product?.name || preview.name;
  const price = product
    ? (bulk ? Number(product.bulk_price || 0) : productUnitPrice(product)).toLocaleString('ar-EG', { maximumFractionDigits: 2 })
    : preview.price;
  const position = side === 'left' ? '-150% - 10px' : '50% + 10px';

  return (
    <button
      type="button"
      data-product-swipe-card
      onClick={onOpen}
      disabled={locked || !visible}
      aria-label={`عرض المنتج ${title}`}
      className={`absolute bottom-[10px] left-1/2 z-[1] flex h-[calc(100dvh-44px)] w-[78vw] max-w-[560px] flex-col overflow-hidden rounded-[28px] bg-[#f7f9f8] text-right shadow-[0_16px_55px_rgba(0,0,0,.18)] disabled:cursor-default ${visible ? 'opacity-100' : 'opacity-0'} ${transitioning ? 'transition-[transform,opacity] duration-[230ms] ease-[cubic-bezier(0.22,1,0.36,1)]' : 'transition-opacity duration-200'} motion-reduce:transition-none`}
      style={{ transform: `translate3d(calc(${position} + var(--product-swipe-x, 0px)),0,0)` }}
    >
      <div className="flex h-12 shrink-0 items-center justify-center bg-white">
        <span className="h-1 w-10 rounded-full bg-slate-200" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        <div className="flex h-[min(34dvh,270px)] shrink-0 items-center justify-center rounded-[24px] bg-white p-5">
          {image
            ? <img
                src={productCardImage(image)}
                alt=""
                loading="eager"
                decoding="async"
                draggable={false}
                className="h-full w-full object-contain"
                onError={event => {
                  // Some stores have no generated 320px sibling.
                  if (event.currentTarget.src !== image) {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = image;
                  }
                }}
              />
            : <div className="h-32 w-32 rounded-3xl bg-slate-100" />}
        </div>
        <div className="rounded-[24px] bg-white px-4 py-5" dir="rtl">
          {product && (
            <span className={`mb-2 inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${Number(product.quantity || 0) > 0 ? 'bg-emerald-50 text-[#005931]' : 'bg-slate-100 text-slate-500'}`}>
              {Number(product.quantity || 0) > 0 ? 'متوفر للطلب' : 'غير متوفر'}
            </span>
          )}
          <strong className="block line-clamp-2 text-xl font-black leading-[1.5] text-slate-950">{title || 'المنتج'}</strong>
          <span className="mt-3 block text-2xl font-black text-[#005931]">{price ? `${price} ج.م` : 'تفاصيل المنتج'}</span>
        </div>
      </div>
    </button>
  );
}

export default React.memo(ProductSwipePeek);
