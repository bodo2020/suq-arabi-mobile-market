import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, PackageCheck, ReceiptText, RotateCcw, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ReturnRequestForm from '@/components/ui/ReturnRequestForm';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

type OrderRow = {
  id: string;
  customer_id: string | null;
  status: string;
  total: number | string;
  tracking_number?: string | null;
  created_at: string;
  items: unknown;
};

const normalizeItems = (items: unknown): any[] => {
  if (Array.isArray(items)) return items;
  if (items && typeof items === 'object') return Object.values(items as Record<string, unknown>);
  return [];
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'تاريخ غير معروف';
  }
};

const formatMoney = (value: number | string) => {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} ج.م`;
};

const CreateReturnRequest = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { user, session, authLoading } = useUser();

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['return-order', orderId, user?.id],
    enabled: !!orderId && !!user && !!session && !authLoading,
    queryFn: async (): Promise<OrderRow> => {
      if (!orderId || !user) throw new Error('order_not_found');

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer?.id) throw new Error('customer_not_found');

      const { data, error } = await supabase
        .from('online_orders')
        .select('id, customer_id, status, total, tracking_number, created_at, items')
        .eq('id', orderId)
        .eq('customer_id', customer.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('order_not_found');
      return data as unknown as OrderRow;
    },
    staleTime: 15_000,
  });

  const orderItems = normalizeItems(order?.items);
  const orderNumber = order ? (order.tracking_number || order.id.slice(0, 8).toUpperCase()) : '';
  const canReturn = order?.status === 'delivered';

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="طلب استرجاع" />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {authLoading || isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <BrandLoader label="جاري تحميل بيانات الطلب" />
          </div>
        ) : !session || !user ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary">
              <RotateCcw size={30} />
            </span>
            <h1 className="text-2xl font-bold">سجّل دخولك أولًا</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">لازم تكون داخل حسابك عشان نتحقق من الطلب وننشئ الاسترجاع بأمان.</p>
            <Button className="min-h-12 w-full rounded-xl" onClick={() => navigate('/phone-login')}>تسجيل الدخول</Button>
          </section>
        ) : isError || !order ? (
          <section role="alert" className="mx-auto max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto text-red-500" size={38} />
            <h1 className="mt-4 text-xl font-bold">تعذّر فتح الطلب</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">الطلب غير موجود في حسابك أو تعذر تحميل بياناته.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button className="rounded-xl" onClick={() => void refetch()}>إعادة المحاولة</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => navigate('/orders')}>العودة لطلباتي</Button>
            </div>
          </section>
        ) : !canReturn ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-amber-100 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <PackageCheck size={30} />
            </span>
            <h1 className="mt-4 text-xl font-bold">الاسترجاع متاح بعد التسليم</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              الطلب ده لسه حالته مش «تم التسليم». أول ما يتم تسليمه هتقدر تختار المنتجات وتبعت طلب استرجاع.
            </p>
            <Button className="mt-6 min-h-12 rounded-xl px-8" onClick={() => navigate('/orders')}>متابعة حالة الطلب</Button>
          </section>
        ) : orderItems.length === 0 ? (
          <section className="mx-auto max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto text-gray-400" size={36} />
            <h1 className="mt-4 text-xl font-bold">مفيش منتجات متاحة</h1>
            <p className="mt-2 text-sm text-gray-500">تعذر قراءة منتجات الطلب، لذلك مش هنقدر ننشئ استرجاع منه حاليًا.</p>
            <Button variant="outline" className="mt-6 rounded-xl" onClick={() => navigate('/orders')}>العودة لطلباتي</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-7">
              <div className="flex items-center gap-2 text-primary">
                <RotateCcw size={24} />
                <h1 className="text-2xl font-bold">استرجاع من الطلب</h1>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">اختار المنتجات والكميات، اكتب السبب، وممكن تضيف صور توضح المشكلة.</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500"><ReceiptText size={17} /><span className="text-xs">رقم الطلب</span></div>
                  <p dir="ltr" className="mt-2 break-all text-right text-sm font-bold">#{orderNumber}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500"><CalendarDays size={17} /><span className="text-xs">تاريخ الطلب</span></div>
                  <p className="mt-2 text-sm font-bold">{formatDate(order.created_at)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500"><PackageCheck size={17} /><span className="text-xs">ملخص الطلب</span></div>
                  <p className="mt-2 text-sm font-bold">{orderItems.length} منتج · {formatMoney(order.total)}</p>
                </div>
              </div>
            </section>

            <ReturnRequestForm
              orderId={order.id}
              orderItems={orderItems}
              onSuccess={() => navigate('/return-requests', { replace: true })}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CreateReturnRequest;
