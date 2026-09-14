import React, { useEffect } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BrandLoader from '@/components/ui/BrandLoader';
import { supabase } from '@/lib/supabase';

const FLOW = [
  { key: 'pending', label: 'تم استلام الطلب', description: 'وصلنا طلبك وبنراجعه.' },
  { key: 'confirmed', label: 'تم تأكيد الطلب', description: 'تم تأكيد طلبك وبدأنا تنفيذه.' },
  { key: 'preparing', label: 'جاري التجهيز', description: 'فريقنا بيجهز منتجاتك دلوقتي.' },
  { key: 'ready', label: 'الطلب جاهز', description: 'طلبك اتجهز وجاهز للخروج.' },
  { key: 'shipped', label: 'في الطريق إليك', description: 'الطلب خرج للتوصيل.' },
  { key: 'delivered', label: 'تم التسليم', description: 'طلبك وصل بنجاح.' },
] as const;

type OrderTimelineProps = {
  order: {
    id: string;
    status: string;
    created_at: string;
    updated_at?: string | null;
  };
};

type HistoryRow = {
  id: string;
  new_status: string;
  created_at: string;
  notes: string | null;
};

type DeliveryPinPayload = {
  order_id: string;
  pin: string;
  expires_at: string;
};

type RpcResult = Promise<{ data: unknown; error: { message?: string } | null }>;

const callRpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args?: Record<string, unknown>,
) => RpcResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const DeliveryPinCard = ({ orderId }: { orderId: string }) => {
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
        throw new Error(message || 'delivery_pin_load_failed');
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
    retry: 1,
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  if (pinQuery.isLoading) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-center text-sm font-semibold text-emerald-800">
        جاري تحميل كود تأكيد الاستلام…
      </div>
    );
  }

  if (pinQuery.isError) {
    return (
      <button
        type="button"
        onClick={() => void pinQuery.refetch()}
        className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-semibold text-amber-900"
      >
        تعذر تحميل كود الاستلام — اضغط للمحاولة مرة أخرى
      </button>
    );
  }

  const deliveryPin = pinQuery.data;
  if (!deliveryPin?.pin) return null;

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center shadow-sm" aria-label="كود تأكيد استلام الطلب">
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

const formatTime = (value?: string | null) => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return null;
  }
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ order }) => {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: ['order-status-history', order.id],
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('id,new_status,created_at,notes')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as HistoryRow[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`order-history:${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${order.id}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: ['order-status-history', order.id] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [order.id, queryClient]);

  if (history.isLoading) {
    return <div className="mt-5 flex min-h-32 items-center justify-center"><BrandLoader size="sm" label="جاري تحميل التتبع" /></div>;
  }

  const statusIndex = FLOW.findIndex(step => step.key === order.status);
  const rows = history.data || [];
  const firstReachedAt = (status: string) => {
    if (status === 'pending') return order.created_at;
    return rows.find(row => row.new_status === status)?.created_at || null;
  };

  return (
    <div className="mt-5 space-y-0">
      {FLOW.map((step, index) => {
        const reached = statusIndex >= index;
        const current = statusIndex === index && order.status !== 'delivered';
        const time = reached ? formatTime(firstReachedAt(step.key)) : null;
        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${reached ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-300'} ${current ? 'ring-4 ring-green-100' : ''}`}>
                {reached ? <CheckCircle2 size={16} /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              {index < FLOW.length - 1 && <span className={`h-12 w-0.5 ${statusIndex > index ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={`text-sm font-bold ${reached ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                {time && <time className="text-[11px] text-gray-400">{time}</time>}
              </div>
              {(current || order.status === 'delivered') && reached && <p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p>}
            </div>
          </div>
        );
      })}

      {!['delivered', 'cancelled'].includes(order.status) && <DeliveryPinCard orderId={order.id} />}

      {history.isError && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          الحالة الحالية صحيحة، لكن تعذر تحميل توقيت بعض المراحل مؤقتًا.
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
