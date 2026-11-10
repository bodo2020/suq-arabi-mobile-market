import { ChevronLeft, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActiveDeliveries } from '@/lib/activeDeliveries';

/**
 * Home strip while an order is on its way (left the store, not delivered):
 * the confirmation code right there, so the customer doesn't hunt for it.
 */
export default function ActiveDeliveryStrip() {
  const navigate = useNavigate();
  const { data } = useActiveDeliveries();
  if (!data?.length) return null;

  return (
    <div className="space-y-2">
      {data.map(delivery => (
        <button
          key={delivery.order_id}
          type="button"
          onClick={() => navigate(`/orders?order_id=${delivery.order_id}`)}
          className="flex w-full items-center gap-3 rounded-[22px] bg-[#005931] p-3 text-right text-white shadow-[0_10px_24px_rgba(0,89,49,0.25)] active:scale-[0.99]"
          aria-label={delivery.pin ? `طلبك في الطريق، رقم التأكيد ${delivery.pin}` : 'طلبك في الطريق'}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Truck size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-[15px] font-black leading-6">طلبك في الطريق ليك</strong>
            <small className="block truncate text-[11.5px] font-semibold text-white/80">
              {delivery.driver_name ? `مع ${delivery.driver_name} · ` : ''}قول رقم التأكيد للمندوب
            </small>
          </span>
          {delivery.pin ? (
            <span className="shrink-0 rounded-2xl bg-white px-3 py-1.5 text-center text-[#005931]">
              <small className="block text-[9.5px] font-bold text-[#5b7a68]">رقم التأكيد</small>
              <b dir="ltr" className="block text-xl font-black leading-6 tracking-[0.18em]">{delivery.pin}</b>
            </span>
          ) : (
            <ChevronLeft size={20} className="shrink-0 text-white/80" />
          )}
        </button>
      ))}
    </div>
  );
}
