import { Link } from 'react-router-dom';
import { ChevronLeft, Clock3, MapPin, Store, UtensilsCrossed } from 'lucide-react';
import type { MarketplaceStore } from '@/lib/marketplace';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

export default function MarketplaceStoreCard({ store, compact = false }: { store: MarketplaceStore; compact?: boolean }) {
  const deliveryTime = store.estimated_time || (store.estimated_delivery_minutes ? `${store.estimated_delivery_minutes} دقيقة` : 'حسب المنطقة');
  if (store.business_profile === 'restaurant') return <Link to={`/stores/${store.branch_id}`} dir="rtl" aria-label={`منيو ${store.merchant_name}`}
    className={`group block overflow-hidden rounded-[24px] border border-[#d8ebdf] bg-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${compact ? 'w-[280px] shrink-0 snap-start' : ''}`}>
    <div className="relative flex h-28 items-center justify-between overflow-hidden bg-[#005931] p-5 text-white">
      <div><span className="rounded-full bg-[#FFC120] px-3 py-1 text-xs font-black text-[#005931]">مطعم</span><p className="mt-3 text-sm font-bold">اختار وجبتك من المنيو</p></div>
      <UtensilsCrossed size={72} className="rotate-12 text-[#FFC120]/30" aria-hidden="true" />
    </div>
    <div className="p-4">
      <div className="flex items-center gap-3">
        {store.logo_url ? <img src={store.logo_url} alt="" className="h-12 w-12 rounded-2xl border bg-white object-contain" /> : <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d3] text-primary"><UtensilsCrossed size={23}/></span>}
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-black">{store.merchant_name}</h2><p className="mt-1 truncate text-xs text-slate-500">{store.business_category || store.branch_name}</p></div><ChevronLeft size={18} className="text-primary"/>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600"><span className="flex items-center gap-1"><Clock3 size={14}/>{deliveryTime}</span><span>·</span><span>{money(store.available_products)} صنف في المنيو</span></div>
      <div className="mt-3 flex items-center justify-between border-t border-[#eaf6ee] pt-3 text-xs"><span className="text-slate-500">التوصيل حسب عنوانك والمسار</span><strong className="rounded-full bg-[#FFC120] px-3 py-2 text-primary">شوف المنيو</strong></div>
    </div>
  </Link>;

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
        <span className="text-slate-600">التوصيل حسب المسافة</span>
        <strong className="rounded-full bg-[#fff5d3] px-2.5 py-1 text-[#005931]">{money(store.available_products)} منتج</strong>
      </div>
    </Link>
  );
}
