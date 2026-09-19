import React from 'react';
import { Clock3, PackageCheck, ShieldCheck, TimerReset, TriangleAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { OrderEta } from '@/lib/orderEta';
import { supabase } from '@/lib/supabase';

type OrderEtaPanelProps = {
  eta?: OrderEta | null;
  detailed?: boolean;
};

type DeliveryPinPayload = {
  order_id: string;
  pin: string;
  expires_at: string;
};

type DeliveryProofPayload = {
  order_id: string;
  delivered_at: string;
  verification_method: 'pin' | 'group_lead_pin' | string;
  pin_verified: boolean;
  location_status: 'verified' | 'low_accuracy' | 'far_from_dropoff' | 'missing' | string;
  distance_to_dropoff_m: number | null;
  payment_method: string | null;
  payment_status: string | null;
  collected_amount: number;
  proof_source: string;
};

type RpcResult = Promise<{ data: unknown; error: { message?: string } | null }>;

const callRpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => RpcResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const DeliveryPinCard = ({ orderId }: { orderId: string }) => {
  const proofQuery = useQuery({
    queryKey: ['customer-delivery-proof', orderId],
    queryFn: async (): Promise<DeliveryProofPayload | null> => {
      const { data, error } = await callRpc('get_my_order_delivery_proof_v1', { p_order_id: orderId });
      if (error) {
        const message = error.message || '';
        if (
          message.includes('order_access_denied') ||
          message.includes('authentication_required')
        ) {
          return null;
        }
        return null;
      }
      if (!isRecord(data)) return null;
      return data as unknown as DeliveryProofPayload;
    },
    retry: false,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const pinQuery = useQuery({
    queryKey: ['customer-delivery-pin', orderId],
    queryFn: async (): Promise<DeliveryPinPayload | null> => {
      const { data, error } = await callRpc('get_my_order_delivery_pin_v1', { p_order_id: orderId });
      if (error) {
        const message = error.message || '';
        if (
          message.includes('delivery_pin_unavailable') ||
          message.includes('order_access_denied') ||
          message.includes('authentication_required')
        ) {
          return null;
        }
        return null;
      }
      if (!isRecord(data)) return null;
      const pin = typeof data.pin === 'string' ? data.pin.trim() : '';
      const expiresAt = typeof data.expires_at === 'string' ? data.expires_at : '';
      if (!pin || !expiresAt) return null;
      return {
        order_id: orderId,
        pin,
        expires_at: expiresAt,
      };
    },
    retry: false,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const deliveryProof = proofQuery.data;
  const deliveryPin = pinQuery.data;

  if (deliveryProof) {
    const deliveredAt = new Date(deliveryProof.delivered_at);
    const deliveredLabel = Number.isNaN(deliveredAt.getTime())
      ? null
      : new Intl.DateTimeFormat('ar-EG', {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }).format(deliveredAt);

    return (
      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-center shadow-sm" aria-label="تأكيد تسليم الطلب">
        <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-950">
          <ShieldCheck size={19} />
          تم تأكيد تسليم الطلب
        </div>
        <p className="mt-2 text-xs font-semibold leading-5 text-emerald-900">
          {deliveryProof.pin_verified
            ? 'تم التحقق من الاستلام باستخدام كود التأكيد.'
            : 'تم تسجيل إثبات التسليم.'}
        </p>
        {deliveredLabel && (
          <p className="mt-1 text-[11px] font-semibold text-emerald-800">وقت التسليم: {deliveredLabel}</p>
        )}
        {deliveryProof.collected_amount > 0 && (
          <p className="mt-1 text-[11px] font-bold text-emerald-900">
            تم تسجيل تحصيل {Number(deliveryProof.collected_amount).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م
          </p>
        )}
      </div>
    );
  }

  if (!deliveryPin?.pin) return null;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/90 p-4 text-center shadow-sm" aria-label="كود تأكيد استلام الطلب">
      <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-900">
        <ShieldCheck size={18} />
        كود تأكيد الاستلام
      </div>
      <div dir="ltr" className="mt-2 select-all text-3xl font-black tracking-[0.35em] text-emerald-950">
        {deliveryPin.pin}
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-emerald-800">
        ادي الكود للمندوب فقط بعد ما تستلم الطلب وتتأكد إن كل حاجة تمام.
      </p>
    </div>
  );
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

const confidenceLabel = (confidence: string) => {
  if (confidence === 'high') return 'ثقة عالية';
  if (confidence === 'medium') return 'ثقة جيدة';
  return 'تقدير مبدئي';
};

const stageLabel = (stage: string) => {
  if (stage === 'received') return 'تم استلام الطلب';
  if (stage === 'in_fulfillment') return 'الطلب تحت التجهيز';
  if (stage === 'ready') return 'الطلب جاهز للمندوب';
  if (stage === 'dispatched') return 'الطلب خرج للتوصيل';
  if (stage === 'arrived') return 'المندوب وصل';
  return null;
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
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [fallbackOrderId, setFallbackOrderId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (eta?.order_id) {
      setFallbackOrderId(null);
      return;
    }

    const article = hostRef.current?.closest('article[id^="order-"]');
    const articleId = article?.id || '';
    setFallbackOrderId(articleId.startsWith('order-') ? articleId.slice('order-'.length) : null);
  }, [eta?.order_id]);

  const orderId = eta?.order_id || fallbackOrderId;

  if (!eta || ['completed', 'cancelled'].includes(eta.risk)) {
    return <div ref={hostRef}>{orderId ? <DeliveryPinCard orderId={orderId} /> : null}</div>;
  }

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
  const readyRemainingMinutes = readMinutes(components.ready_remaining_minutes);
  const readyEta = typeof components.ready_eta === 'string' ? components.ready_eta : null;
  const pendingCustomerSubstitutions = readMinutes(components.pending_customer_substitutions);
  const isIntelligentEta = eta.model_version === 'eta-v2-intelligent';
  const stage = stageLabel(eta.stage);
  const progressRatio = Number(components.progress_ratio);
  const progressPercent = Number.isFinite(progressRatio)
    ? Math.max(0, Math.min(100, Math.round((1 - progressRatio) * 100)))
    : null;

  return (
    <div ref={hostRef}>
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
              <div className="flex flex-wrap justify-end gap-1.5">
                {isIntelligentEta && (
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">
                    {confidenceLabel(eta.confidence)}
                  </span>
                )}
                {remainingMinutes > 0 && (
                  <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold">
                    متبقي حوالي {remainingMinutes} دقيقة
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs font-semibold">{meta.label}</p>
            {stage && <p className="mt-1 text-[11px] font-bold opacity-80">{stage}</p>}
            {isIntelligentEta && readyEta && readyRemainingMinutes > 0 && eta.stage !== 'dispatched' && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold">
                <PackageCheck size={15} className="shrink-0" />
                <span>التجهيز متوقع يخلص حوالي {formatTime(readyEta)}</span>
                {progressPercent !== null && progressPercent > 0 && (
                  <span className="mr-auto opacity-70">{progressPercent}%</span>
                )}
              </div>
            )}
            {pendingCustomerSubstitutions > 0 && (
              <p className="mt-2 rounded-xl bg-amber-100/80 px-3 py-2 text-[11px] font-bold leading-5 text-amber-950">
                في بديل مستني موافقتك، وده محسوب ضمن وقت الوصول المتوقع.
              </p>
            )}
            <p className="mt-1 text-[11px] leading-5 opacity-70">
              الموعد بيتحدث تلقائيًا حسب تقدم التجهيز، ضغط الفرع، توفر المندوب والطريق.
            </p>
          </div>
        </div>

        <DeliveryPinCard orderId={eta.order_id} />

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
                الزمن الكامل المحسوب للطلب: {fullOrderMinutes} دقيقة{isIntelligentEta ? ' · تحديث ذكي لحظي' : ''}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrderEtaPanel;
