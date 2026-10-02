import { Link } from 'react-router-dom';
import { ChevronLeft, Clock3, MapPin, Store } from 'lucide-react';
import type { MarketplaceStore } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

export default function MarketplaceStoreCard({ store, compact = false }: { store: MarketplaceStore; compact?: boolean }) {
  const deliveryTime = store.estimated_time || (store.estimated_delivery_minutes ? `${store.estimated_delivery_minutes} دقيقة` : 'حسب المنطقة');

  return (
    <Link
      to={`/stores/${store.branch_id}`}
      dir="rtl"
      className={`group flex min-w-0 flex-col rounded-[24px] border border-[#d8ebdf] bg-white shadow-[0_5px_18px_rgba(0,89,49,0.05)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-[#9acbb2] hover:shadow-[0_12px_28px_rgba(0,89,49,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] ${compact ? 'w-[260px] shrink-0 snap-start p-4' : 'p-5'}`}
      aria-label={`تصفح متجر ${store.merchant_name}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#005931] text-[#FFC120]"><Store size={23} /></span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{store.merchant_name}</h2>
          <p className="truncate text-xs text-slate-500 sm:text-sm">{store.branch_name}</p>
        </div>
        <ChevronLeft className="mt-2 h-5 w-5 shrink-0 text-[#005931] transition-transform group-hover:-translate-x-1" />
      </div>

      {!compact && <p className="mt-4 line-clamp-2 min-h-10 text-sm text-slate-600">{store.address || store.zone_name}</p>}

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[#005931]">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6ee] px-2.5 py-1.5"><MapPin size={14} />{money(store.distance_km)} كم</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf6ee] px-2.5 py-1.5"><Clock3 size={14} />{deliveryTime}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#d8ebdf] pt-3 text-xs sm:text-sm">
        <span className="text-slate-600">التوصيل <strong className="text-[#005931]">{store.delivery_fee > 0 ? `${money(store.delivery_fee)} ج.م` : 'مجاني'}</strong></span>
        <strong className="rounded-full bg-[#fff5d3] px-2.5 py-1 text-[#005931]">{money(store.available_products)} منتج</strong>
      </div>
    </Link>
  );
}
