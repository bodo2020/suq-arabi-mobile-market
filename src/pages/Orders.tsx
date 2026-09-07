import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MapPin,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import OrderTimeline from '@/components/orders/OrderTimeline';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

type TabType = 'current' | 'previous';

type OrderItem = {
  name?: string;
  quantity?: number;
  price?: number;
  image_url?: string;
  unit_of_measure?: string;
  is_bulk?: boolean;
  bulk_quantity?: number;
};

type OrderRow = {
  id: string;
  status: string;
  total: number | string;
  shipping_address: string | null;
  shipping_cost: number | string | null;
  payment_method: string | null;
  payment_status: string | null;
  items: unknown;
  notes: string | null;
  tracking_number: string | null;
  delivery_person: string | null;
  created_at: string;
  updated_at: string | null;
};

const STATUS_META: Record<string, { label: string; description: string; className: string }> = {
  pending: {
    label: 'تم استلام الطلب',
    description: 'وصلنا طلبك وبنراجعه دلوقتي.',
    className: 'bg-amber-50 text-amber-800 border-amber-100',
  },
  confirmed: {
    label: 'تم تأكيد الطلب',
    description: 'طلبك اتأكد وداخل على مرحلة التجهيز.',
    className: 'bg-blue-50 text-blue-800 border-blue-100',
  },
  preparing: {
    label: 'جاري التجهيز',
    description: 'بنجهز منتجات طلبك بعناية.',
    className: 'bg-violet-50 text-violet-800 border-violet-100',
  },
  ready: {
    label: 'الطلب جاهز',
    description: 'طلبك جاهز ومستني يخرج للتوصيل.',
    className: 'bg-sky-50 text-sky-800 border-sky-100',
  },
  shipped: {
    label: 'في الطريق إليك',
    description: 'طلبك خرج للتوصيل وهو في الطريق.',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-100',
  },
  delivered: {
    label: 'تم التسليم',
    description: 'تم توصيل طلبك بنجاح.',
    className: 'bg-green-50 text-green-800 border-green-100',
  },
  cancelled: {
    label: 'تم إلغاء الطلب',
    description: 'الطلب اتلغى ولن يتم توصيله.',
    className: 'bg-red-50 text-red-800 border-red-100',
  },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'بانتظار الدفع', className: 'bg-amber-50 text-amber-800' },
  paid: { label: 'مدفوع', className: 'bg-green-50 text-green-800' },
  failed: { label: 'فشل الدفع', className: 'bg-red-50 text-red-800' },
  refunded: { label: 'تم رد المبلغ', className: 'bg-blue-50 text-blue-800' },
};

const formatDate = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(dateString));
  } catch {
    return 'تاريخ غير معروف';
  }
};

const formatMoney = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} ج.م`;
};

const normalizeItems = (items: unknown): OrderItem[] => {
  if (Array.isArray(items)) return items as OrderItem[];
  if (items && typeof items === 'object') return Object.values(items as Record<string, OrderItem>);
  return [];
};

const paymentMethodLabel = (method: string | null) => {
  switch (method) {
    case 'cash':
    case 'cod':
      return 'الدفع عند الاستلام';
    case 'wallet':
      return 'محفظة إلكترونية';
    case 'card':
      return 'بطاقة بنكية';
    default:
      return method || 'غير محدد';
  }
};

const orderNumber = (order: OrderRow) => order.tracking_number || order.id.slice(0, 8).toUpperCase();

const Orders = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, session } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const focusedOrderRef = useRef<string | null>(null);
  const targetOrderId = searchParams.get('order_id');

  const {
    data: orders = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async (): Promise<OrderRow[]> => {
      if (!user) return [];

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('online_orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as OrderRow[];
    },
    enabled: !!user && !!session,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user?.id || !session) return;
    const channel = supabase
      .channel(`customer-orders:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'online_orders' },
        () => void queryClient.invalidateQueries({ queryKey: ['orders', user.id] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, session, queryClient]);

  const currentOrders = orders.filter(order => !['delivered', 'cancelled'].includes(order.status));
  const previousOrders = orders.filter(order => ['delivered', 'cancelled'].includes(order.status));
  const activeOrders = activeTab === 'current' ? currentOrders : previousOrders;

  useEffect(() => {
    if (!targetOrderId || focusedOrderRef.current === targetOrderId || orders.length === 0) return;
    const target = orders.find(order => order.id === targetOrderId);
    if (!target) return;

    setActiveTab(['delivered', 'cancelled'].includes(target.status) ? 'previous' : 'current');
    setExpandedOrderId(target.id);
    focusedOrderRef.current = targetOrderId;

    const timer = window.setTimeout(() => {
      document.getElementById(`order-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [targetOrderId, orders]);

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="طلباتي" />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {!session ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary">
              <Package size={30} />
            </span>
            <h1 className="text-2xl font-bold">طلباتك محفوظة في حسابك</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">سجّل دخولك عشان تتابع حالة طلباتك من أول التأكيد لحد التوصيل.</p>
            <Button className="min-h-12 w-full rounded-xl text-base" onClick={() => navigate('/phone-login')}>
              تسجيل الدخول
            </Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary">
                    <Package size={24} />
                    <h1 className="text-2xl font-bold">طلباتك</h1>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">تابع الطلب الجاري لحظة بلحظة، وافتح أي طلب عشان تشوف المنتجات والدفع والعنوان وتوقيت كل مرحلة.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="min-h-11 rounded-xl bg-white"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                  >
                    <RefreshCw size={16} className={`ml-2 ${isFetching ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                  <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => navigate('/return-requests')}>
                    طلبات الاسترجاع
                  </Button>
                </div>
              </div>

              {!isLoading && !isError && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">طلبات جارية</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{currentOrders.length}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">طلبات سابقة</p>
                    <p className="mt-1 text-2xl font-bold">{previousOrders.length}</p>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('current')}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition ${activeTab === 'current' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}
              >
                الجارية ({currentOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('previous')}
                className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition ${activeTab === 'previous' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}
              >
                السابقة ({previousOrders.length})
              </button>
            </div>

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center">
                <BrandLoader label="جاري تحميل طلباتك" />
              </div>
            ) : isError ? (
              <section role="alert" className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <XCircle className="mx-auto text-red-500" size={36} />
                <h2 className="mt-4 text-xl font-bold">تعذّر تحميل الطلبات</h2>
                <p className="my-3 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
                <Button className="mt-2 rounded-xl" onClick={() => void refetch()}>إعادة المحاولة</Button>
              </section>
            ) : activeOrders.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                  <ShoppingBag size={30} />
                </span>
                <h2 className="mt-4 text-xl font-bold">{activeTab === 'current' ? 'مفيش طلبات جارية دلوقتي' : 'مفيش طلبات سابقة'}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  {activeTab === 'current' ? 'ابدأ تسوقك، وأول ما تعمل طلب هتقدر تتابعه من هنا خطوة بخطوة.' : 'الطلبات المكتملة أو الملغاة هتظهر هنا.'}
                </p>
                <Button className="mt-6 min-h-12 rounded-xl px-8" onClick={() => navigate('/')}>تسوق الآن</Button>
              </section>
            ) : (
              <div className="space-y-4">
                {activeOrders.map(order => {
                  const items = normalizeItems(order.items);
                  const expanded = expandedOrderId === order.id;
                  const status = STATUS_META[order.status] || {
                    label: order.status || 'حالة غير معروفة',
                    description: 'يتم تحديث حالة الطلب.',
                    className: 'bg-gray-50 text-gray-700 border-gray-100',
                  };
                  const paymentStatus = order.payment_status ? PAYMENT_STATUS_META[order.payment_status] : null;

                  return (
                    <article id={`order-${order.id}`} key={order.id} className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">رقم الطلب</p>
                            <h2 dir="ltr" className="mt-1 break-all text-right text-lg font-bold">#{orderNumber(order)}</h2>
                            <p className="mt-1 text-xs text-gray-500">{formatDate(order.created_at)}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}>
                            {order.status === 'shipped' && <Truck size={14} className="ml-1.5" />}
                            {order.status === 'delivered' && <CheckCircle2 size={14} className="ml-1.5" />}
                            {order.status === 'cancelled' && <XCircle size={14} className="ml-1.5" />}
                            {status.label}
                          </span>
                        </div>

                        <div className={`mt-4 rounded-2xl border p-4 ${status.className}`}>
                          <p className="font-bold">{status.label}</p>
                          <p className="mt-1 text-xs leading-6 opacity-80">{status.description}</p>
                          {order.updated_at && <p className="mt-2 text-[11px] opacity-70">آخر تحديث: {formatDate(order.updated_at)}</p>}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                          <div>
                            <p className="text-xs text-gray-500">إجمالي الطلب</p>
                            <p className="mt-1 text-lg font-bold text-primary">{formatMoney(order.total)}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-xs text-gray-500">عدد المنتجات</p>
                            <p className="mt-1 font-bold">{items.length}</p>
                          </div>
                        </div>

                        {items.length > 0 && (
                          <div className="mt-4 flex items-center gap-2 overflow-hidden">
                            {items.slice(0, 4).map((item, index) => (
                              <div key={`${order.id}-preview-${index}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name || 'منتج'} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                                ) : (
                                  <Box size={18} className="text-gray-400" />
                                )}
                              </div>
                            ))}
                            {items.length > 4 && <span className="text-xs font-semibold text-gray-500">+{items.length - 4}</span>}
                          </div>
                        )}

                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold transition hover:bg-gray-50"
                        >
                          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          {expanded ? 'إخفاء التفاصيل' : 'عرض تفاصيل الطلب'}
                        </button>
                      </div>

                      {expanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-5 sm:p-6">
                          <div className="grid gap-5 lg:grid-cols-2">
                            <section className="rounded-2xl bg-white p-5">
                              <h3 className="flex items-center gap-2 font-bold"><Package size={19} className="text-primary" />تتبع الطلب</h3>
                              {order.status === 'cancelled' ? (
                                <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">تم إلغاء الطلب. لو محتاج مساعدة تواصل مع خدمة العملاء.</div>
                              ) : (
                                <OrderTimeline order={order} />
                              )}
                            </section>

                            <section className="rounded-2xl bg-white p-5">
                              <h3 className="flex items-center gap-2 font-bold"><ReceiptText size={19} className="text-primary" />بيانات الطلب</h3>
                              <div className="mt-4 space-y-4 text-sm">
                                {order.shipping_address && (
                                  <div className="flex items-start gap-3">
                                    <MapPin size={18} className="mt-0.5 shrink-0 text-gray-400" />
                                    <div><p className="text-xs text-gray-500">عنوان التوصيل</p><p className="mt-1 leading-6">{order.shipping_address}</p></div>
                                  </div>
                                )}
                                <div className="flex items-start gap-3">
                                  <CreditCard size={18} className="mt-0.5 shrink-0 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-xs text-gray-500">طريقة الدفع</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <span>{paymentMethodLabel(order.payment_method)}</span>
                                      {paymentStatus && <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${paymentStatus.className}`}>{paymentStatus.label}</span>}
                                    </div>
                                  </div>
                                </div>
                                {order.delivery_person && (
                                  <div className="flex items-start gap-3">
                                    <Truck size={18} className="mt-0.5 shrink-0 text-gray-400" />
                                    <div><p className="text-xs text-gray-500">مندوب التوصيل</p><p className="mt-1">{order.delivery_person}</p></div>
                                  </div>
                                )}
                                {order.notes && <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">ملاحظات الطلب</p><p className="mt-1 leading-6">{order.notes}</p></div>}
                              </div>
                            </section>
                          </div>

                          <section className="mt-5 rounded-2xl bg-white p-5">
                            <h3 className="font-bold">المنتجات ({items.length})</h3>
                            <div className="mt-4 space-y-3">
                              {items.length ? items.map((item, index) => {
                                const quantity = Number(item.quantity || 0);
                                const price = Number(item.price || 0);
                                return (
                                  <div key={`${order.id}-item-${index}`} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3">
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                                      {item.image_url ? <img src={item.image_url} alt={item.name || 'منتج'} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <Box size={22} className="text-gray-400" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold">{item.name || 'منتج'}</p>
                                      <p className="mt-1 text-xs text-gray-500">{quantity} {item.unit_of_measure === 'weight' ? 'كجم' : 'قطعة'} × {formatMoney(price)}</p>
                                    </div>
                                    <p className="shrink-0 text-sm font-bold">{formatMoney(quantity * price)}</p>
                                  </div>
                                );
                              }) : <p className="text-sm text-gray-500">تفاصيل المنتجات غير متاحة لهذا الطلب.</p>}
                            </div>

                            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">
                              {Number(order.shipping_cost || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span>{formatMoney(order.shipping_cost)}</span></div>}
                              <div className="flex justify-between text-base font-bold"><span>الإجمالي</span><span className="text-primary">{formatMoney(order.total)}</span></div>
                            </div>
                          </section>

                          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                            {order.status === 'delivered' && (
                              <Button variant="outline" className="min-h-12 flex-1 rounded-xl" onClick={() => navigate(`/create-return/${order.id}`)}>
                                <RefreshCw size={16} className="ml-2" />طلب استرجاع
                              </Button>
                            )}
                            {['delivered', 'cancelled'].includes(order.status) && (
                              <Button className="min-h-12 flex-1 rounded-xl" onClick={() => navigate('/')}>
                                <ShoppingBag size={16} className="ml-2" />تسوق مرة أخرى
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Orders;
