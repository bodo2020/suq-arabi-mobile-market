import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLoader from '@/components/ui/BrandLoader';
import { supabase } from '@/lib/supabase';
import type { SubstitutionPolicy } from '@/lib/substitutionPolicy';

type SubstitutionRow = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approval_mode: 'manager' | 'customer' | 'auto';
  original_product_name: string;
  replacement_product_name: string;
  replacement_image_url: string | null;
  quantity: number;
  original_unit_price: number;
  replacement_unit_price: number;
  price_delta_total: number;
  financial_state: string;
  proposed_at: string;
  customer_decision_due_at: string | null;
  resolved_at: string | null;
  resolution_source: string | null;
  resolution_note: string | null;
  can_decide: boolean;
};

type Payload = {
  order_id: string;
  substitution_policy: SubstitutionPolicy | 'manager';
  items: SubstitutionRow[];
};

const rpc = supabase.rpc.bind(supabase) as unknown as (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message?: string } | null }>;

const money = (value: number) => new Intl.NumberFormat('ar-EG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const policyText = (policy: Payload['substitution_policy']) => {
  if (policy === 'allow_substitutions') return 'سمحت ببديل مناسب؛ الزيادة في السعر تحتاج موافقتك.';
  if (policy === 'remove_item') return 'اخترت حذف الصنف إذا لم يتوفر.';
  if (policy === 'contact_me') return 'اخترت الموافقة على أي بديل من التطبيق.';
  return 'سياسة بدائل طلب قديم.';
};

const statusText = (row: SubstitutionRow) => {
  if (row.status === 'approved') return 'تم اعتماد البديل';
  if (row.status === 'rejected') return 'تم رفض البديل';
  if (row.status === 'cancelled') return 'تم إلغاء الاقتراح';
  if (row.approval_mode === 'customer') return 'مستني قرارك';
  if (row.approval_mode === 'auto') return 'جاري الاعتماد تلقائيًا';
  return 'قيد المراجعة';
};

export default function OrderSubstitutionPanel({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [actingId, setActingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const query = useQuery({
    queryKey: ['customer-order-substitutions', orderId],
    queryFn: async (): Promise<Payload | null> => {
      const { data, error } = await rpc('get_my_order_substitutions_v1', { p_order_id: orderId });
      if (error) {
        const message = error.message || '';
        if (message.includes('ORDER_ACCESS_DENIED')) return null;
        throw new Error(message || 'SUBSTITUTIONS_LOAD_FAILED');
      }
      return data as Payload;
    },
    staleTime: 5_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const decide = async (row: SubstitutionRow, decision: 'approve' | 'reject') => {
    if (actingId) return;
    setActingId(row.id);
    setActionError('');
    try {
      const { error } = await rpc('decide_my_order_substitution_v1', {
        p_substitution_id: row.id,
        p_decision: decision,
      });
      if (error) throw new Error(error.message || 'SUBSTITUTION_DECISION_FAILED');
      await queryClient.invalidateQueries({ queryKey: ['customer-order-substitutions', orderId] });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setActionError(
        message.includes('SUBSTITUTE_INSUFFICIENT_STOCK')
          ? 'البديل خلص قبل الموافقة. فريق التجهيز هيختار بديلًا آخر.'
          : message.includes('PICKING_NOT_ACTIVE')
            ? 'مرحلة تجهيز الطلب اتغيرت، وتم تحديث القرار من النظام.'
            : 'تعذر تسجيل القرار حاليًا. حاول مرة تانية.',
      );
      await query.refetch();
    } finally {
      setActingId(null);
    }
  };

  if (query.isLoading) {
    return <div className="mt-5 flex justify-center rounded-2xl bg-white p-5"><BrandLoader size="sm" /></div>;
  }
  if (query.isError || !query.data || !query.data.items.length) return null;

  return (
    <section className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold">
            <RefreshCcw size={18} className="text-primary" />
            بدائل المنتجات
          </h3>
          <p className="mt-1 text-xs leading-5 text-gray-500">{policyText(query.data.substitution_policy)}</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          {query.data.items.length} اقتراح
        </span>
      </div>

      {actionError && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          {actionError}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {query.data.items.map(row => {
          const delta = Number(row.price_delta_total || 0);
          const pending = row.status === 'pending' && row.can_decide;
          return (
            <article key={row.id} className={`rounded-2xl border p-4 ${pending ? 'border-amber-200 bg-amber-50/40' : 'border-gray-100'}`}>
              <div className="flex items-start gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                  {row.replacement_image_url
                    ? <img src={row.replacement_image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : <RefreshCcw size={20} className="text-gray-300" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">بدل: {row.original_product_name}</p>
                  <strong className="mt-1 block text-sm">{row.replacement_product_name}</strong>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-gray-100 px-2 py-1">الكمية {row.quantity}</span>
                    <span className={`rounded-full px-2 py-1 font-bold ${delta > 0 ? 'bg-amber-100 text-amber-900' : delta < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                      {Math.abs(delta) < 0.005 ? 'بدون فرق سعر' : delta > 0 ? `+ ${money(delta)} ج.م` : `توفير ${money(Math.abs(delta))} ج.م`}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 font-bold text-blue-800">{statusText(row)}</span>
                  </div>
                </div>
              </div>

              {pending && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button disabled={!!actingId} onClick={() => void decide(row, 'approve')} className="rounded-xl">
                    {actingId === row.id ? <BrandLoader size="sm" /> : <Check size={16} />}
                    موافق على البديل
                  </Button>
                  <Button disabled={!!actingId} onClick={() => void decide(row, 'reject')} variant="outline" className="rounded-xl">
                    <X size={16} />
                    ارفض
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
