import React, { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
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

      {history.isError && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          الحالة الحالية صحيحة، لكن تعذر تحميل توقيت بعض المراحل مؤقتًا.
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
