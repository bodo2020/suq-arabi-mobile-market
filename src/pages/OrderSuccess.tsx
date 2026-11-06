import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BellRing, Check, Home, PackageSearch, Copy, CheckCheck, ShieldCheck, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import OrderEtaPanel from '@/components/orders/OrderEtaPanel';
import OrderCelebration from '@/components/orders/OrderCelebration';
import BrandMark from '@/components/brand/BrandMark';
import { getMyOrderEta } from '@/lib/orderEta';
import { getMyOrderDeliveryPin } from '@/lib/deliveryPin';

const money = (value: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(Number(value || 0));

const celebratedKey = (id: string) => `order-celebrated:${id}`;
function shouldCelebrate(id?: string) {
  if (!id || typeof window === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !window.sessionStorage.getItem(celebratedKey(id)); } catch { return true; }
}

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const { orderId, orderGroupId, orderNumber, combined, storesCount, amountDue } = location.state || {};
  // Play the celebration once per order: not again on refresh or when coming back.
  const [celebrating, setCelebrating] = React.useState(() => shouldCelebrate(orderId || orderGroupId));
  React.useEffect(() => {
    const key = orderId || orderGroupId;
    if (!key) return;
    try { window.sessionStorage.setItem(celebratedKey(key), '1'); } catch { /* private mode */ }
  }, [orderId, orderGroupId]);
  const finishCelebration = React.useCallback(() => setCelebrating(false), []);

  const { data: orderEta } = useQuery({
    queryKey: ['order-eta', orderId],
    queryFn: () => getMyOrderEta(orderId),
    enabled: Boolean(orderId),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: deliveryPin } = useQuery({
    queryKey: ['delivery-pin', orderId],
    queryFn: () => getMyOrderDeliveryPin(orderId),
    enabled: Boolean(orderId),
    retry: false,
    refetchInterval: query => query.state.data ? false : 10_000,
    staleTime: 30_000,
  });

  const copyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber)
      .then(() => {
        setCopied(true);
        toast({ title: 'تم النسخ', description: 'تم نسخ رقم الطلب بنجاح' });
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast({ title: 'خطأ', description: 'تعذر نسخ رقم الطلب', variant: 'destructive' });
      });
  };

  const openTracking = () => {
    const targetId = combined && orderGroupId ? orderGroupId : orderId;
    navigate(targetId ? `/orders?order_id=${encodeURIComponent(targetId)}` : '/orders');
  };

  return (
    <MainLayout>
      {celebrating && <OrderCelebration onDone={finishCelebration} />}
      <div className="mx-auto max-w-lg px-4 pb-10 pt-4" dir="rtl">
        {!celebrating && (
          <div className="order-success-in space-y-3">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_140%_at_100%_0%,#0b7a47_0%,#005931_55%,#004425_100%)] p-5 text-white shadow-[0_12px_30px_rgba(0,89,49,0.2)]">
              <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-[#FFC120]/15" />
              <div className="relative flex items-center gap-4">
                <span className="relative flex h-[76px] w-[60px] shrink-0 items-center justify-center">
                  <BrandMark variant="mark" tone="onGreen" className="h-full w-full" />
                  <span className="absolute -bottom-1 -left-2 grid h-7 w-7 place-items-center rounded-full border-[3px] border-[#005931] bg-[#FFC120] text-[#005931]"><Check size={15} strokeWidth={3.4} /></span>
                </span>
                <div className="min-w-0">
                  <h1 className="text-[24px] font-black leading-tight">طلبك وصلنا!</h1>
                  <p className="mt-1 text-sm leading-6 text-white/85">
                    {combined
                      ? `هيوصلك في رحلة واحدة من ${Number(storesCount || 0).toLocaleString('ar-EG')} متاجر.`
                      : 'بنجهّزه دلوقتي، وكل تحديث هيوصلك في الإشعارات.'}
                  </p>
                </div>
              </div>
              {(orderNumber || Number(amountDue) > 0) && (
                <div className="relative mt-4 flex items-stretch gap-2">
                  {orderNumber && (
                    <button type="button" onClick={copyOrderNumber} className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-white/12 px-3 py-2.5 text-right ring-1 ring-white/15 active:scale-[.99]" aria-label="نسخ رقم الطلب">
                      <span className="min-w-0">
                        <span className="block text-[11px] text-white/70">رقم الطلب</span>
                        <span dir="ltr" className="block truncate text-right font-mono text-sm font-bold">{orderNumber}</span>
                      </span>
                      {copied ? <CheckCheck size={18} className="shrink-0 text-[#FFC120]" /> : <Copy size={18} className="shrink-0 text-white/80" />}
                    </button>
                  )}
                  {Number(amountDue) > 0 && (
                    <span className="flex shrink-0 flex-col justify-center rounded-2xl bg-[#FFC120] px-3 py-2.5 text-[#005931]">
                      <span className="text-[11px] font-bold">هتدفع</span>
                      <span className="whitespace-nowrap text-base font-black">{money(amountDue)} ج.م</span>
                    </span>
                  )}
                </div>
              )}
            </section>

            {combined && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-green-100 bg-green-50/60 p-3 text-sm font-bold text-primary">
                <Store size={18} />
                رحلة مجمعة من {Number(storesCount || 0).toLocaleString('ar-EG')} متاجر
              </div>
            )}

            {deliveryPin?.pin && (
              <section className="rounded-[22px] border border-[#f1d78a] bg-[#fffaeb] p-4 text-right">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#005931] text-[#FFC120]"><ShieldCheck size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-gray-900">رمز استلام الطلب</p>
                    <p className="mt-0.5 text-xs leading-6 text-gray-600">ادّيه للمندوب وانت بتستلم بس.</p>
                  </div>
                </div>
                <div dir="ltr" className="mt-3 flex justify-center gap-2">
                  {deliveryPin.pin.split('').map((digit, index) => (
                    <span key={index} className="flex h-12 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-[#005931] shadow-sm ring-1 ring-[#f1d78a]">
                      {digit}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <OrderEtaPanel eta={orderEta} detailed />

            <div className="flex items-center gap-3 rounded-[22px] border border-[#d6eee0] bg-[#f1faf4] p-4 text-right">
              <BellRing size={20} className="shrink-0 text-[#005931]" />
              <p className="text-xs leading-6 text-[#1f4d36]">فعّل الإشعارات من مركز الإشعارات عشان يوصلك تنبيه أول ما حالة طلبك تتغير.</p>
            </div>

            <div className="space-y-2 pt-1">
              <button type="button" onClick={openTracking} className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#005931] text-base font-black text-white shadow-[0_10px_24px_rgba(0,89,49,0.22)] active:scale-[.98]">
                <PackageSearch size={20} className="text-[#FFC120]" />تابع طلبك
              </button>
              <button type="button" onClick={() => navigate('/')} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[18px] bg-[#e8f5ee] text-sm font-extrabold text-[#005931] active:scale-[.98]">
                <Home size={18} />كمّل تسوّق
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default OrderSuccess;
