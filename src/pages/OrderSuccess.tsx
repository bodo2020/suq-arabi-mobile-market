import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BellRing, CheckCircle, Home, PackageSearch, Copy, CheckCheck, ShieldCheck, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import OrderEtaPanel from '@/components/orders/OrderEtaPanel';
import { getMyOrderEta } from '@/lib/orderEta';
import { getMyOrderDeliveryPin } from '@/lib/deliveryPin';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const { orderId, orderNumber, combined, storesCount } = location.state || {};
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
    navigate(orderId ? `/orders?order_id=${encodeURIComponent(orderId)}` : '/orders');
  };

  return (
    <MainLayout>
      <div className="mx-auto flex min-h-[75vh] max-w-lg items-center px-4 py-8" dir="rtl">
        <section className="w-full rounded-3xl border border-green-100 bg-white p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-50 text-primary">
            <CheckCircle size={48} />
          </span>

          <h1 className="mt-5 text-2xl font-bold">طلبك وصلنا بنجاح</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-600">
            {combined
              ? 'طلبك اتقسم داخليًا على المتاجر، لكن هيوصلك في رحلة واحدة وتقدر تتابعه من «طلباتي».'
              : 'تقدر تتابع حالة طلبك لحظة بلحظة من «طلباتي»، وكل تحديث جديد هيظهر في مركز الإشعارات.'}
          </p>

          {combined && (
            <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-green-100 bg-green-50/60 p-3 text-sm font-bold text-primary">
              <Store size={18} />
              رحلة مجمعة من {Number(storesCount || 0).toLocaleString('ar-EG')} متاجر
            </div>
          )}

          {orderNumber && (
            <div className="mx-auto mt-5 flex max-w-sm items-center justify-between gap-2 rounded-2xl bg-gray-50 p-3 text-right">
              <div className="min-w-0">
                <p className="text-xs text-gray-500">مرجع الطلب</p>
                <p dir="ltr" className="mt-1 break-all text-right font-mono text-sm font-bold">{orderNumber}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={copyOrderNumber} className="h-10 w-10 shrink-0 p-0" aria-label="نسخ رقم الطلب">
                {copied ? <CheckCheck className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
              </Button>
            </div>
          )}

          {deliveryPin?.pin && (
            <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-right">
              <div className="flex items-start gap-3">
                <ShieldCheck size={22} className="mt-0.5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900">رمز تسليم الطلب</p>
                  <p className="mt-1 text-xs leading-6 text-gray-600">احتفظ بالرمز وادّيه للمندوب عند استلام الطلب فقط.</p>
                </div>
              </div>
              <div dir="ltr" className="mt-4 flex justify-center gap-2">
                {deliveryPin.pin.split('').map((digit, index) => (
                  <span key={index} className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-black text-primary shadow-sm">
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          )}

          <OrderEtaPanel eta={orderEta} detailed />

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50/60 p-4 text-right">
            <BellRing size={21} className="shrink-0 text-primary" />
            <p className="text-xs leading-6 text-gray-700">لو فعّلت إشعارات الجهاز من مركز الإشعارات، هيوصلك تنبيه أثناء استخدام الموقع لما حالة الطلب تتغير.</p>
          </div>

          <div className="mt-6 space-y-3">
            <Button onClick={openTracking} className="min-h-12 w-full rounded-xl text-base">
              <PackageSearch size={19} className="ml-2" />متابعة الطلب الآن
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="min-h-12 w-full rounded-xl">
              <Home size={18} className="ml-2" />العودة للرئيسية
            </Button>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default OrderSuccess;
