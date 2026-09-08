import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, Sparkles, Ticket, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import LoyaltyBarcode from '@/components/ui/LoyaltyBarcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import {
  createLoyaltyVoucher,
  getMyLoyaltyCard,
  getMyLoyaltyVouchers,
  loyaltyVoucherError,
  type LoyaltyVoucher,
} from '@/lib/loyalty';

const money = (value: number) => `${Number(value || 0).toFixed(2)} ج.م`;

const statusMeta: Record<LoyaltyVoucher['status'], { label: string; className: string }> = {
  active: { label: 'متاح', className: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
  redeemed: { label: 'تم استخدامه', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled: { label: 'ملغي', className: 'bg-red-50 text-red-700 border-red-100' },
};

export default function Vouchers() {
  const { user, authLoading } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pointsInput, setPointsInput] = useState('1000');

  useEffect(() => {
    if (!authLoading && !user) navigate('/phone-login?returnTo=%2Fvouchers', { replace: true });
  }, [authLoading, user, navigate]);

  const cardQuery = useQuery({
    queryKey: ['loyalty-card', user?.id],
    queryFn: getMyLoyaltyCard,
    enabled: !!user,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const vouchersQuery = useQuery({
    queryKey: ['loyalty-vouchers', user?.id],
    queryFn: () => getMyLoyaltyVouchers(),
    enabled: !!user,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

  const card = cardQuery.data;
  const redemptionPoints = Number(card?.redemption_points || 1000);
  const redemptionValue = Number(card?.redemption_value_egp || 1);
  const maxConvertiblePoints = Math.floor(Number(card?.points_balance || 0) / redemptionPoints) * redemptionPoints;
  const requestedPoints = Math.trunc(Number(pointsInput || 0));
  const requestedValue = redemptionPoints > 0 ? (requestedPoints / redemptionPoints) * redemptionValue : 0;
  const canCreate = requestedPoints >= redemptionPoints
    && requestedPoints <= maxConvertiblePoints
    && requestedPoints % redemptionPoints === 0;

  const createMutation = useMutation({
    mutationFn: () => createLoyaltyVoucher(requestedPoints),
    onSuccess: async voucher => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loyalty-card', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['customer-loyalty-card', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['loyalty-vouchers', user?.id] }),
      ]);
      setPointsInput(String(redemptionPoints));
      toast({ title: 'تم إنشاء الفاوچر', description: `${voucher.voucher_code} · ${money(voucher.initial_value_egp)}` });
    },
    onError: error => toast({ title: 'تعذر إنشاء الفاوچر', description: loyaltyVoucherError(error), variant: 'destructive' }),
  });

  const vouchers = vouchersQuery.data || [];
  const activeVouchers = useMemo(() => vouchers.filter(v => v.status === 'active' && Number(v.remaining_value_egp) > 0), [vouchers]);
  const oldVouchers = useMemo(() => vouchers.filter(v => v.status !== 'active' || Number(v.remaining_value_egp) <= 0), [vouchers]);

  if (authLoading || !user || cardQuery.isLoading || vouchersQuery.isLoading) {
    return <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle="قسائمي" /><div className="flex min-h-[60vh] items-center justify-center"><BrandLoader label="جاري تحميل قسائمك" /></div></MainLayout>;
  }

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="قسائمي" />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6" dir="rtl">
        <section className="overflow-hidden rounded-3xl bg-[#005931] p-5 text-white shadow-lg sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-100"><Sparkles size={18} /><span className="text-sm font-bold">نقاط المعداوي</span></div>
              <div className="mt-2 text-4xl font-black">{Number(card?.points_balance || 0).toLocaleString('ar-EG')} <span className="text-lg font-semibold">نقطة</span></div>
              <p className="mt-2 text-sm text-emerald-50/90">كل {redemptionPoints.toLocaleString('ar-EG')} نقطة = {money(redemptionValue)} فاوچر.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 backdrop-blur">
              <div className="text-xs text-emerald-100">المتاح للتحويل الآن</div>
              <div className="mt-1 text-2xl font-black">{money(redemptionPoints > 0 ? (maxConvertiblePoints / redemptionPoints) * redemptionValue : 0)}</div>
            </div>
          </div>
        </section>

        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="text-primary" size={21} />حوّل نقاطك لفاوچر</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-gray-500">اختار عدد نقاط بمضاعفات {redemptionPoints.toLocaleString('ar-EG')}. النقاط هتتخصم فور إنشاء الفاوچر، وبعدها تقدر تستخدمه في نقطة البيع أو داخل التطبيق.</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">عدد النقاط</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={redemptionPoints}
                  max={Math.max(redemptionPoints, maxConvertiblePoints)}
                  step={redemptionPoints}
                  value={pointsInput}
                  onChange={event => setPointsInput(event.target.value)}
                  className="min-h-12 rounded-xl text-lg font-bold"
                />
              </div>
              <Button
                className="min-h-12 rounded-xl px-6"
                disabled={!canCreate || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'جاري الإنشاء…' : `إنشاء فاوچر ${canCreate ? money(requestedValue) : ''}`}
              </Button>
            </div>
            {maxConvertiblePoints < redemptionPoints && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">محتاج توصل إلى {redemptionPoints.toLocaleString('ar-EG')} نقطة على الأقل عشان تنشئ أول فاوچر.</p>}
            {requestedPoints > maxConvertiblePoints && maxConvertiblePoints >= redemptionPoints && <p className="text-sm text-red-600">أقصى عدد نقاط متاح للتحويل حاليًا هو {maxConvertiblePoints.toLocaleString('ar-EG')} نقطة.</p>}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-xl font-black">الفاوچرات المتاحة</h2><Badge variant="secondary">{activeVouchers.length}</Badge></div>
          {activeVouchers.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-white p-8 text-center text-gray-500"><Ticket className="mx-auto mb-3 text-gray-300" size={34} /><p className="font-semibold">مفيش فاوچرات متاحة حاليًا</p><p className="mt-1 text-sm">حوّل نقاطك من الجزء اللي فوق، والفاوچر هيظهر هنا فورًا.</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeVouchers.map(voucher => (
                <Card key={voucher.id} className="overflow-hidden rounded-3xl border-emerald-100 shadow-sm">
                  <div className="bg-gradient-to-l from-emerald-50 to-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-xs font-bold text-primary">فاوچر المعداوي</p><p dir="ltr" className="mt-1 text-right font-mono text-sm font-bold">{voucher.voucher_code}</p></div>
                      <Badge className={statusMeta[voucher.status].className}>{statusMeta[voucher.status].label}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white p-3"><div className="text-[11px] text-gray-500">الرصيد المتبقي</div><div className="mt-1 text-xl font-black text-primary">{money(voucher.remaining_value_egp)}</div></div>
                      <div className="rounded-xl bg-white p-3"><div className="text-[11px] text-gray-500">القيمة الأصلية</div><div className="mt-1 text-xl font-black">{money(voucher.initial_value_egp)}</div></div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white p-3"><LoyaltyBarcode value={voucher.barcode_token} /></div>
                    <p className="mt-3 flex items-center gap-2 text-xs text-gray-500"><WalletCards size={14} />اعرض الباركود للكاشير أو اختار الفاوچر عند الدفع في التطبيق. لو استخدمت جزء منه، الباقي يفضل محفوظ.</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {oldVouchers.length > 0 && (
          <section className="space-y-3 pb-4">
            <h2 className="text-lg font-bold text-gray-700">قسائم سابقة</h2>
            <div className="space-y-2">
              {oldVouchers.map(voucher => (
                <div key={voucher.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-sm">
                  <div><div dir="ltr" className="text-right font-mono font-semibold">{voucher.voucher_code}</div><div className="mt-1 text-xs text-gray-500">القيمة الأصلية {money(voucher.initial_value_egp)}</div></div>
                  <div className="text-left"><Badge className={statusMeta[voucher.status].className}>{statusMeta[voucher.status].label}</Badge><div className="mt-1 text-xs text-gray-500">متبقي {money(voucher.remaining_value_egp)}</div></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  );
}
