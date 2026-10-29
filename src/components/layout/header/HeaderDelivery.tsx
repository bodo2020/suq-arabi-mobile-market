import { ChevronDown, MapPin, Zap } from 'lucide-react';

type HeaderDeliveryProps = {
  addressLabel?: string;
  addressLoading?: boolean;
  deliveryEstimateMinutes?: number | null;
  onAddressClick: () => void;
  compact?: boolean;
};

/** No fabricated delivery ETA: display a number only when a real estimate is supplied. */
export default function HeaderDelivery({
  addressLabel, addressLoading = false, deliveryEstimateMinutes, onAddressClick, compact = false,
}: HeaderDeliveryProps) {
  const minutes = typeof deliveryEstimateMinutes === 'number' &&
    Number.isFinite(deliveryEstimateMinutes) && deliveryEstimateMinutes > 0
    ? Math.round(deliveryEstimateMinutes)
    : null;
  return (
    <div className={`flex min-w-0 max-w-full flex-col items-end gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      <span className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-[#c4e5d2] bg-white/90 px-2.5 py-1 font-extrabold text-[#005931]">
        <Zap size={15} className="shrink-0 text-[#d6a000]" fill="currentColor" />
        <span className="truncate">{minutes !== null ? `توصيل خلال ${minutes} دقيقة` : 'توصيل سريع لحد بابك'}</span>
      </span>
      <button
        type="button"
        onClick={onAddressClick}
        className="flex min-h-7 max-w-full items-center gap-1 rounded-lg px-1 text-[#29624b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]"
        title={addressLabel || 'حدد عنوان التوصيل'}
        aria-label={addressLabel ? `تغيير عنوان التوصيل: ${addressLabel}` : 'تحديد عنوان التوصيل'}
      >
        <MapPin size={14} className="shrink-0 text-[#005931]" />
        <span className="min-w-0 truncate text-right" dir="auto">
          {addressLoading ? 'جاري تحميل عنوانك…' : addressLabel || 'حدد عنوان التوصيل'}
        </span>
        <ChevronDown size={13} className="shrink-0" />
      </button>
    </div>
  );
}
