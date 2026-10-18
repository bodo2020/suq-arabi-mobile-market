import { MapPin, Route } from 'lucide-react';
import type { CombinedDeliveryQuote } from '@/lib/cartQuote';

const number = (value: number) => Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 2 });

export default function DeliveryRouteSummary({ delivery }: { delivery: CombinedDeliveryQuote }) {
  const rate = delivery.policy?.price_per_km;
  return <section className="mt-5 rounded-2xl border border-[#d8ebdf] bg-[#f4faf6] p-4" aria-label="تفاصيل حساب التوصيل" dir="rtl">
    <h3 className="flex items-center gap-2 font-black text-primary"><Route size={18} />رحلة واحدة لحد بابك</h3>
    <ol className="mt-4 space-y-3">
      {delivery.stops.map((stop, index) => <li key={stop.branch_id || 'customer'} className="flex items-start gap-2 text-xs">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#005931] font-bold text-[#FFC120]">{index + 1}</span>
        <span className="min-w-0 pt-1"><strong className="block">{stop.type === 'customer' ? 'عنوان التوصيل' : stop.branch_name || 'استلام من المحل'}</strong>
          {index > 0 && stop.distance_from_previous_km != null && <small className="mt-1 block text-slate-500">{number(stop.distance_from_previous_km)} كم من النقطة السابقة</small>}
        </span>
      </li>)}
    </ol>
    <div className="mt-4 space-y-2 border-t border-[#d8ebdf] pt-3 text-xs">
      <div className="flex justify-between gap-2"><span className="flex items-center gap-1"><MapPin size={13} />المسافة الإجمالية</span><strong>{number(delivery.route_distance_km)} كم</strong></div>
      {rate != null && <div className="flex justify-between gap-2"><span>سعر الكيلومتر</span><strong>{number(rate)} ج.م</strong></div>}
      {Number(delivery.policy?.included_km) > 0 && <p>أول {number(delivery.policy!.included_km)} كم ضمن الرسوم الأساسية</p>}
      {Number(delivery.base_fee) > 0 && <div className="flex justify-between"><span>رسوم أساسية</span><strong>{number(delivery.base_fee!)} ج.م</strong></div>}
      {delivery.extra_pickup_fee > 0 && <div className="flex justify-between"><span>استلام من محلات إضافية</span><strong>{number(delivery.extra_pickup_fee)} ج.م</strong></div>}
      <p className="pt-1 leading-5 text-slate-500">المسافة تشمل المرور على المحلات المختارة ثم الوصول ليك. السعر النهائي بعد أي عروض ظاهر في الملخص.</p>
      {delivery.route_degraded && <p className="text-amber-800">المسافة تقديرية حاليًا؛ راجع سعر التوصيل قبل التأكيد.</p>}
    </div>
  </section>;
}
