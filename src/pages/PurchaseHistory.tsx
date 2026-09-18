import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gift,
  MapPin,
  Package,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
  Store,
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

type PurchaseItem = {
  name?: string;
  quantity?: number;
  price?: number;
  total?: number;
  image_url?: string | null;
  unit_of_measure?: string;
  is_bulk?: boolean;
  bulk_quantity?: number;
  source_kind?: 'owned' | 'marketplace';
  merchant_name?: string | null;
  branch_name?: string | null;
};

type PurchaseGroupOrder = {
  order_id: string;
  source_kind: 'owned' | 'marketplace';
  merchant_id: string;
  merchant_name: string;
  branch_id: string;
  branch_name: string;
  status: string;
  total: number;
  subtotal: number;
  pickup_sequence: number | null;
};

type PurchaseRow = {
  id: string;
  source_channel: 'store' | 'online';
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
  branch_id: string | null;
  branch_name: string | null;
  loyalty_points_earned: number | string | null;
  created_at: string;
  updated_at: string | null;
  is_multi_store?: boolean;
  order_group_id?: string | null;
  stores_count?: number;
  partner_stores_count?: number;
  group_orders?: PurchaseGroupOrder[];
};

const STATUS_META: Record<string, { label: string; description: string; className: string }> = {
  pending: { label: 'تم استلام الطلب', description: 'وصلنا طلبك وبنراجعه دلوقتي.', className: 'bg-amber-50 text-amber-800 border-amber-100' },
  confirmed: { label: 'تم تأكيد الطلب', description: 'طلبك اتأكد وداخل على مرحلة التجهيز.', className: 'bg-blue-50 text-blue-800 border-blue-100' },
  preparing: { label: 'جاري التجهيز', description: 'بنجهز منتجات طلبك بعناية.', className: 'bg-violet-50 text-violet-800 border-violet-100' },
  ready: { label: 'الطلب جاهز', description: 'طلبك جاهز ومستني يخرج للتوصيل.', className: 'bg-sky-50 text-sky-800 border-sky-100' },
  shipped: { label: 'في الطريق إليك', description: 'طلبك خرج للتوصيل وهو في الطريق.', className: 'bg-indigo-50 text-indigo-800 border-indigo-100' },
  delivered: { label: 'تم التسليم', description: 'تم توصيل طلبك بنجاح.', className: 'bg-green-50 text-green-800 border-green-100' },
  cancelled: { label: 'تم إلغاء الطلب', description: 'الطلب اتلغى ولن يتم توصيله.', className: 'bg-red-50 text-red-800 border-red-100' },
  store_completed: { label: 'شراء من الفرع', description: 'تم تسجيل الفاتورة على حسابك داخل الفرع.', className: 'bg-emerald-50 text-emerald-800 border-emerald-100' },
};

const PAYMENT_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: 'بانتظار الدفع', className: 'bg-amber-50 text-amber-800' },
  paid: { label: 'مدفوع', className: 'bg-green-50 text-green-800' },
  failed: { label: 'فشل الدفع', className: 'bg-red-50 text-red-800' },
  refunded: { label: 'تم رد المبلغ', className: 'bg-blue-50 text-blue-800' },
};

const formatDate = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
  } catch {
    return 'تاريخ غير معروف';
  }
};

const formatMoney = (value: number | string | null | undefined) => {
  const amount = Number(value || 0);
  return `${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'} ج.م`;
};

const normalizeItems = (items: unknown): PurchaseItem[] => {
  if (Array.isArray(items)) return items as PurchaseItem[];
  if (items && typeof items === 'object') return Object.values(items as Record<string, PurchaseItem>);
  return [];
};

const paymentMethodLabel = (method: string | null) => {
  switch (method) {
    case 'cash':
    case 'cod': return 'نقدي';
    case 'wallet': return 'محفظة إلكترونية';
    case 'card': return 'بطاقة بنكية';
    case 'mixed': return 'دفع مختلط';
    default: return method || 'غير محدد';
  }
};

const purchaseNumber = (purchase: PurchaseRow) => purchase.tracking_number || purchase.id.slice(0, 8).toUpperCase();

export default function PurchaseHistory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, session } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const focusedRef = useRef<string | null>(null);
  const targetOrderId = searchParams.get('order_id');

  const { data: purchases = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['purchase-history', user?.id],
    queryFn: async (): Promise<PurchaseRow[]> => {
      if (!user) return [];
      const { data, error } = await (supabase.rpc as any)('get_my_purchase_history', { p_limit: 200 });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as PurchaseRow[];
    },
    enabled: !!user && !!session,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user?.id || !session) return;
    const channel = supabase
      .channel(`customer-purchases:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_orders' }, () => void queryClient.invalidateQueries({ queryKey: ['purchase-history', user.id] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, session, queryClient]);

  const current = purchases.filter(row => row.source_channel === 'online' && !['delivered', 'cancelled'].includes(row.status));
  const previous = purchases.filter(row => row.source_channel === 'store' || ['delivered', 'cancelled'].includes(row.status));
  const active = activeTab === 'current' ? current : previous;
  const storeCount = purchases.filter(row => row.source_channel === 'store').length;
  const onlineCount = purchases.filter(row => row.source_channel === 'online').length;

  useEffect(() => {
    if (!targetOrderId || focusedRef.current === targetOrderId || purchases.length === 0) return;
    const target = purchases.find(row => row.id === targetOrderId);
    if (!target) return;
    setActiveTab(target.source_channel === 'store' || ['delivered', 'cancelled'].includes(target.status) ? 'previous' : 'current');
    setExpandedId(target.id);
    focusedRef.current = targetOrderId;
    const timer = window.setTimeout(() => document.getElementById(`purchase-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(timer);
  }, [targetOrderId, purchases]);

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="مشترياتي" />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {!session ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary"><Package size={30} /></span>
            <h1 className="text-2xl font-bold">مشترياتك محفوظة في حسابك</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">سجّل دخولك عشان تشوف طلبات التوصيل وفواتير الفرع المرتبطة ببطاقتك.</p>
            <Button className="min-h-12 w-full rounded-xl text-base" onClick={() => navigate('/phone-verify?returnTo=%2Faccount')}>تسجيل الدخول</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary"><ReceiptText size={24} /><h1 className="text-2xl font-bold">مشترياتك كلها</h1></div>
                  <p className="mt-2 text-sm leading-6 text-gray-600">طلبات التوصيل وفواتير الفرع المرتبطة بباركود العضوية في سجل واحد.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="min-h-11 rounded-xl bg-white" disabled={isFetching} onClick={() => void refetch()}><RefreshCw size={16} className={`ml-2 ${isFetching ? 'animate-spin' : ''}`} />تحديث</Button>
                  <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => navigate('/return-requests')}>طلبات الاسترجاع</Button>
                </div>
              </div>
              {!isLoading && !isError && (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">جارية</p><p className="mt-1 text-2xl font-bold text-primary">{current.length}</p></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">من الفرع</p><p className="mt-1 text-2xl font-bold">{storeCount}</p></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">أونلاين</p><p className="mt-1 text-2xl font-bold">{onlineCount}</p></div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
              <button type="button" onClick={() => setActiveTab('current')} className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition ${activeTab === 'current' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>الجارية ({current.length})</button>
              <button type="button" onClick={() => setActiveTab('previous')} className={`min-h-12 rounded-xl px-3 text-sm font-semibold transition ${activeTab === 'previous' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>السابقة ({previous.length})</button>
            </div>

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل مشترياتك" /></div>
            ) : isError ? (
              <section role="alert" className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm"><XCircle className="mx-auto text-red-500" size={36} /><h2 className="mt-4 text-xl font-bold">تعذّر تحميل المشتريات</h2><p className="my-3 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p><Button onClick={() => void refetch()}>إعادة المحاولة</Button></section>
            ) : active.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><ShoppingBag size={30} /></span><h2 className="mt-4 text-xl font-bold">{activeTab === 'current' ? 'مفيش طلبات جارية دلوقتي' : 'مفيش مشتريات سابقة'}</h2><Button className="mt-6 min-h-12 rounded-xl px-8" onClick={() => navigate('/')}>تسوق الآن</Button></section>
            ) : (
              <div className="space-y-4">
                {active.map(purchase => {
                  const items = normalizeItems(purchase.items);
                  const expanded = expandedId === purchase.id;
                  const storePurchase = purchase.source_channel === 'store';
                  const status = STATUS_META[purchase.status] || (storePurchase ? STATUS_META.store_completed : { label: purchase.status, description: 'يتم تحديث حالة الطلب.', className: 'bg-gray-50 text-gray-700 border-gray-100' });
                  const paymentStatus = purchase.payment_status ? PAYMENT_STATUS_META[purchase.payment_status] : null;
                  const points = Number(purchase.loyalty_points_earned || 0);

                  return (
                    <article id={`purchase-${purchase.id}`} key={`${purchase.source_channel}-${purchase.id}`} className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${storePurchase ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'}`}>
                                {storePurchase ? <Store size={13} /> : <Truck size={13} />}
                                {storePurchase ? 'شراء من الفرع' : purchase.is_multi_store ? `طلب مجمّع · ${Number(purchase.stores_count || 0).toLocaleString('ar-EG')} متاجر` : 'طلب أونلاين'}
                              </span>
                              {purchase.branch_name && <span className="text-xs text-gray-500">{purchase.branch_name}</span>}
                            </div>
                            <p className="mt-3 text-xs text-gray-500">{storePurchase ? 'رقم الفاتورة' : 'رقم الطلب'}</p>
                            <h2 dir="ltr" className="mt-1 break-all text-right text-lg font-bold">#{purchaseNumber(purchase)}</h2>
                            <p className="mt-1 text-xs text-gray-500">{formatDate(purchase.created_at)}</p>
                          </div>
                          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}>{storePurchase && <Store size={14} className="ml-1.5" />}{purchase.status === 'shipped' && <Truck size={14} className="ml-1.5" />}{purchase.status === 'delivered' && <CheckCircle2 size={14} className="ml-1.5" />}{purchase.status === 'cancelled' && <XCircle size={14} className="ml-1.5" />}{status.label}</span>
                        </div>

                        {!storePurchase && <div className={`mt-4 rounded-2xl border p-4 ${status.className}`}><p className="font-bold">{status.label}</p><p className="mt-1 text-xs leading-6 opacity-80">{status.description}</p></div>}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                          <div><p className="text-xs text-gray-500">الإجمالي</p><p className="mt-1 text-lg font-bold text-primary">{formatMoney(purchase.total)}</p></div>
                          {points > 0 && <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800"><p className="flex items-center gap-1 text-[11px]"><Gift size={13} />نقاط العملية</p><p className="mt-0.5 font-bold">+{points.toLocaleString('ar-EG')}</p></div>}
                          <div className="text-left"><p className="text-xs text-gray-500">عدد المنتجات</p><p className="mt-1 font-bold">{items.length}</p></div>
                        </div>

                        {items.length > 0 && <div className="mt-4 flex items-center gap-2 overflow-hidden">{items.slice(0, 4).map((item, index) => <div key={`${purchase.id}-preview-${index}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">{item.image_url ? <img src={item.image_url} alt={item.name || 'منتج'} className="h-full w-full object-cover" loading="lazy" /> : <Box size={18} className="text-gray-400" />}</div>)}{items.length > 4 && <span className="text-xs font-semibold text-gray-500">+{items.length - 4}</span>}</div>}

                        <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : purchase.id)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-semibold transition hover:bg-gray-50">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}{expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</button>
                      </div>

                      {expanded && (
                        <div className="border-t border-gray-100 bg-gray-50/50 p-5 sm:p-6">
                          <div className="grid gap-5 lg:grid-cols-2">
                            <section className="rounded-2xl bg-white p-5">
                              <h3 className="flex items-center gap-2 font-bold">{storePurchase ? <Store size={19} className="text-primary" /> : <Package size={19} className="text-primary" />}{storePurchase ? 'بيانات الشراء' : 'تتبع الطلب'}</h3>
                              {storePurchase ? <div className="mt-4 space-y-3 text-sm"><div className="rounded-xl bg-emerald-50 p-4 text-emerald-800">تم تسجيل الفاتورة على حسابك وقت الشراء من الفرع.</div>{purchase.branch_name && <p><span className="text-gray-500">الفرع: </span>{purchase.branch_name}</p>}</div> : purchase.status === 'cancelled' ? <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">تم إلغاء الطلب.</div> : <OrderTimeline order={purchase as any} />}
                            </section>
                            <section className="rounded-2xl bg-white p-5">
                              <h3 className="flex items-center gap-2 font-bold"><ReceiptText size={19} className="text-primary" />بيانات الدفع</h3>
                              <div className="mt-4 space-y-4 text-sm">
                                {!storePurchase && purchase.shipping_address && <div className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-gray-400" /><div><p className="text-xs text-gray-500">عنوان التوصيل</p><p className="mt-1 leading-6">{purchase.shipping_address}</p></div></div>}
                                <div className="flex items-start gap-3"><CreditCard size={18} className="mt-0.5 shrink-0 text-gray-400" /><div className="flex-1"><p className="text-xs text-gray-500">طريقة الدفع</p><div className="mt-1 flex flex-wrap items-center gap-2"><span>{paymentMethodLabel(purchase.payment_method)}</span>{paymentStatus && <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${paymentStatus.className}`}>{paymentStatus.label}</span>}</div></div></div>
                                {points > 0 && <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-emerald-800"><span className="flex items-center gap-2"><Gift size={17} />نقاط مكتسبة</span><strong>+{points.toLocaleString('ar-EG')}</strong></div>}
                              </div>
                            </section>
                          </div>

                          <section className="mt-5 rounded-2xl bg-white p-5">
                            <h3 className="font-bold">المنتجات ({items.length})</h3>
                            <div className="mt-4 space-y-3">{items.length ? items.map((item, index) => {
                              const quantity = Number(item.quantity || 0);
                              const price = Number(item.price || 0);
                              const lineTotal = Number(item.total ?? quantity * price);
                              return <div key={`${purchase.id}-item-${index}`} className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">{item.image_url ? <img src={item.image_url} alt={item.name || 'منتج'} className="h-full w-full object-cover" loading="lazy" /> : <Box size={22} className="text-gray-400" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name || 'منتج'}</p>{purchase.is_multi_store && item.merchant_name && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">{item.merchant_name}</span>}</div><p className="mt-1 text-xs text-gray-500">{quantity} {item.unit_of_measure === 'weight' ? 'كجم' : item.is_bulk ? 'وحدة جملة' : 'قطعة'} × {formatMoney(price)}</p></div><p className="shrink-0 text-sm font-bold">{formatMoney(lineTotal)}</p></div>;
                            }) : <p className="text-sm text-gray-500">تفاصيل المنتجات غير متاحة.</p>}</div>
                            <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm">{!storePurchase && Number(purchase.shipping_cost || 0) > 0 && <div className="flex justify-between"><span className="text-gray-500">التوصيل</span><span>{formatMoney(purchase.shipping_cost)}</span></div>}<div className="flex justify-between text-base font-bold"><span>الإجمالي</span><span className="text-primary">{formatMoney(purchase.total)}</span></div></div>
                          </section>

                          {purchase.is_multi_store && purchase.status === 'delivered' && (purchase.group_orders || []).length > 0 && (
                            <section className="mt-5 rounded-2xl border border-gray-100 bg-white p-5">
                              <h3 className="font-bold">استرجاع من متجر محدد</h3>
                              <p className="mt-1 text-xs leading-6 text-gray-500">كل متجر له Sub-order مستقل، فاختار المتجر اللي فيه المنتج المراد استرجاعه.</p>
                              <div className="mt-3 space-y-2">
                                {(purchase.group_orders || []).map(groupOrder => (
                                  <div key={groupOrder.order_id} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-bold">{groupOrder.merchant_name || groupOrder.branch_name}</p>
                                      <p className="mt-1 text-xs text-gray-500">{formatMoney(groupOrder.subtotal)}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={() => navigate(`/create-return/${groupOrder.order_id}`)}>
                                      <RefreshCw size={14} className="ml-1" />استرجاع
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          <div className="mt-5 flex flex-col gap-2 sm:flex-row">{!storePurchase && purchase.status === 'delivered' && !purchase.is_multi_store && <Button variant="outline" className="min-h-12 flex-1 rounded-xl" onClick={() => navigate(`/create-return/${purchase.id}`)}><RefreshCw size={16} className="ml-2" />طلب استرجاع</Button>}<Button className="min-h-12 flex-1 rounded-xl" onClick={() => navigate('/')}><ShoppingBag size={16} className="ml-2" />تسوق مرة أخرى</Button></div>
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
}
