import React from 'react';
import { Clock3, TimerReset, TriangleAlert } from 'lucide-react';
import type { OrderEta } from '@/lib/orderEta';

type OrderEtaPanelProps = {
  eta?: OrderEta | null;
  detailed?: boolean;
};

const formatTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const readMinutes = (value: number | undefined) => {
  const minutes = Number(value || 0);
  return Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
};

const riskMeta = (risk: string) => {
  if (risk === 'late') {
    return {
      label: 'يوجد تأخير ونعمل على الوصول بأسرع وقت',
      wrapper: 'border-red-100 bg-red-50 text-red-900',
      accent: 'text-red-700',
      icon: <TriangleAlert size={20} />,
    };
  }
  if (risk === 'at_risk') {
    return {
      label: 'قد يتأخر الموعد دقائق بسيطة',
      wrapper: 'border-amber-100 bg-amber-50 text-amber-900',
      accent: 'text-amber-700',
      icon: <TriangleAlert size={20} />,
    };
  }
  return {
    label: 'الطلب ماشي في موعده',
    wrapper: 'border-green-100 bg-green-50 text-green-950',
    accent: 'text-primary',
    icon: <Clock3 size={20} />,
  };
};

const OrderEtaPanel = ({ eta, detailed = false }: OrderEtaPanelProps) => {
  if (!eta || ['completed', 'cancelled'].includes(eta.risk)) return null;

  const meta = riskMeta(eta.risk);
  const components = eta.components || {};
  const remainingMinutes = readMinutes(components.remaining_minutes);
  const fullOrderMinutes = readMinutes(components.full_order_minutes);
  const preparationMinutes =
    readMinutes(components.queue_wait_minutes) +
    readMinutes(components.picking_minutes) +
    readMinutes(components.substitution_minutes) +
    readMinutes(components.packing_minutes);
  const dispatchMinutes =
    readMinutes(components.dispatch_wait_minutes) +
    readMinutes(components.driver_to_branch_minutes) +
    readMinutes(components.prior_stops_minutes);
  const roadMinutes = readMinutes(components.road_minutes);

  return (
    <section className={`mt-4 rounded-2xl border p-4 ${meta.wrapper}`} aria-label="موعد وصول الطلب">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${meta.accent}`}>{meta.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold opacity-70">موعد الوصول المتوقع</p>
              <p className="mt-1 text-xl font-bold" dir="rtl">
                {formatTime(eta.live_window_start)} – {formatTime(eta.live_window_end)}
              </p>
            </div>
            {remainingMinutes > 0 && (
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold">
                متبقي حوالي {remainingMinutes} دقيقة
              </span>
            )}
          </div>
          <p className="mt-2 text-xs font-semibold">{meta.label}</p>
          <p className="mt-1 text-[11px] leading-5 opacity-70">
            الموعد شامل مراجعة الطلب والتجهيز وانتظار المندوب والطريق، وبيتحدث تلقائيًا.
          </p>
        </div>
      </div>

      {detailed && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-current/10 pt-4">
          <div className="rounded-xl bg-white/75 p-3 text-center">
            <p className="text-[10px] opacity-65">تجهيز الطلب</p>
            <p className="mt-1 text-sm font-bold">{preparationMinutes} د</p>
          </div>
          <div className="rounded-xl bg-white/75 p-3 text-center">
            <p className="text-[10px] opacity-65">توزيع وانتظار</p>
            <p className="mt-1 text-sm font-bold">{dispatchMinutes} د</p>
          </div>
          <div className="rounded-xl bg-white/75 p-3 text-center">
            <p className="text-[10px] opacity-65">وقت الطريق</p>
            <p className="mt-1 text-sm font-bold">{roadMinutes} د</p>
          </div>
          {fullOrderMinutes > 0 && (
            <div className="col-span-3 flex items-center justify-center gap-2 rounded-xl bg-white/75 p-2.5 text-xs font-semibold">
              <TimerReset size={15} />
              الزمن الكامل المحسوب للطلب: {fullOrderMinutes} دقيقة
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default OrderEtaPanel;
