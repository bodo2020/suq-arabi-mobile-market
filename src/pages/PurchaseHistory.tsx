import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
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
import {
  getCustomerOrderGroupsOperations,
  type OrderGroupOperations,
} from '@/lib/orderGroupOperations';
import { useUser } from '@/contexts/UserContext';

import { useMyCustomerId } from '@/hooks/useMyCustomerId';
import { useToast } from '@/hooks/use-toast';
import { cancelMyOrder, useActiveDeliveries } from '@/lib/activeDeliveries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
type TabType = 'current' | 'online' | 'store';

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
  group_operations?: OrderGroupOperations | null;
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

const GROUP_ROUTE_PHASE_META: Record<string, { label: string; description: string; className: string }> = {
  waiting_dispatch: { label: 'بنجهز رحلة التوصيل', description: 'هنحدد المندوب وتوقيت التحرك أول ما نقاط الاستلام تبقى جاهزة.', className: 'border-gray-100 bg-gray-50 text-gray-700' },
  driver_assigned: { label: 'تم تعيين المندوب', description: 'المندوب استلم الرحلة وهيبدأ التحرك لنقاط الاستلام.', className: 'border-blue-100 bg-blue-50 text-blue-800' },
  heading_to_pickups: { label: 'المندوب متجه للاستلام', description: 'المندوب في طريقه لأول نقطة استلام.', className: 'border-blue-100 bg-blue-50 text-blue-800' },
  collecting_pickups: { label: 'المندوب بيجمع طلبك', description: 'المندوب بيمر على المتاجر بالترتيب قبل ما يتحرك ليك.', className: 'border-violet-100 bg-violet-50 text-violet-800' },
  all_pickups_collected: { label: 'تم استلام كل الطلبات', description: 'كل نقاط الاستلام خلصت والمندوب جاهز يتحرك لعنوانك.', className: 'border-indigo-100 bg-indigo-50 text-indigo-800' },
  on_the_way: { label: 'المندوب في الطريق إليك', description: 'تم جمع طلبك من كل المتاجر والمندوب متجه لعنوانك.', className: 'border-indigo-100 bg-indigo-50 text-indigo-800' },
  arrived_customer: { label: 'المندوب وصل', description: 'المندوب وصل لموقع التسليم. جهّز كود الاستلام.', className: 'border-emerald-100 bg-emerald-50 text-emerald-800' },
  delivered: { label: 'تم التسليم', description: 'تم توصيل الطلب المجمع بنجاح.', className: 'border-green-100 bg-green-50 text-green-800' },
  delivery_issue: { label: 'في مشكلة في رحلة التوصيل', description: 'فريق التشغيل بيتابع الرحلة وهنحدث الحالة أول ما المشكلة تتحل.', className: 'border-red-100 bg-red-50 text-red-800' },
  return_to_branch: { label: 'الرحلة راجعة للفرع', description: 'فريق التشغيل بيتابع الطلب وهنوضح الخطوة الجاية فورًا.', className: 'border-amber-100 bg-amber-50 text-amber-800' },
};

const routePhaseMeta = (phase?: string | null) =>
  GROUP_ROUTE_PHASE_META[phase || 'waiting_dispatch'] || {
    label: 'جاري تحديث رحلة التوصيل',
    description: 'بيتم تحديث حالة الرحلة تلقائيًا.',
    className: 'border-gray-100 bg-gray-50 text-gray-700',
  };

const formatClock = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit' }).format(date);
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
      const rows = (Array.isArray(data) ? data : []) as PurchaseRow[];
      const groupIds = rows
        .filter(row => row.is_multi_store)
        .map(row => row.order_group_id || row.id)
        .filter((value): value is string => Boolean(value));
      const groupOperations = await getCustomerOrderGroupsOperations(groupIds);
      return rows.map(row => {
        if (!row.is_multi_store) return row;
        const groupId = row.order_group_id || row.id;
        const operations = groupOperations[groupId] || null;
        return {
          ...row,
          order_group_id: groupId,
          group_operations: operations,
          delivery_person: operations?.route?.driver_name || row.delivery_person,
          updated_at: operations?.updated_at || row.updated_at,
        };
      });
    },
    enabled: !!user && !!session,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  // Only this customer's orders (see Orders.tsx).
  const myCustomerId = useMyCustomerId(user?.id);
  useEffect(() => {
    if (!user?.id || !session || !myCustomerId) return;
    const channel = supabase
      .channel(`customer-purchases:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_orders', filter: `customer_id=eq.${myCustomerId}` }, () => void queryClient.invalidateQueries({ queryKey: ['purchase-history', user.id] }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, session, queryClient, myCustomerId]);

  const current = purchases.filter(row => row.source_channel === 'online' && !['delivered', 'cancelled'].includes(row.status));
  const onlineHistory = purchases.filter(row => row.source_channel === 'online' && ['delivered', 'cancelled'].includes(row.status));
  const storeHistory = purchases.filter(row => row.source_channel === 'store');
  const active = activeTab === 'current' ? current : activeTab === 'online' ? onlineHistory : storeHistory;

  const { data: activeDeliveries = [] } = useActiveDeliveries();
  const pinByOrder = React.useMemo(
    () => new Map(activeDeliveries.filter(delivery => delivery.pin).map(delivery => [delivery.order_id, delivery.pin as string])),
    [activeDeliveries],
  );

  const { toast } = useToast();
  const [cancelTarget, setCancelTarget] = useState<PurchaseRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelMyOrder(cancelTarget.order_group_id || cancelTarget.id);
      toast({ title: 'اتلغى الطلب', description: 'بلّغنا المحل، ومش هيتجهز.' });
      setCancelTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchase-history', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['active-deliveries', user?.id] }),
      ]);
    } catch (error) {
      toast({ title: 'مينفعش نلغي الطلب', description: error instanceof Error ? error.message : 'جرّب تاني.', variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!targetOrderId || focusedRef.current === targetOrderId || purchases.length === 0) return;
    const target = purchases.find(row => row.id === targetOrderId || row.order_group_id === targetOrderId);
    if (!target) return;
    setActiveTab(target.source_channel === 'store' ? 'store' : ['delivered', 'cancelled'].includes(target.status) ? 'online' : 'current');
    setExpandedId(target.id);
    focusedRef.current = targetOrderId;
    const timer = window.setTimeout(() => document.getElementById(`purchase-${target.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return () => window.clearTimeout(timer);
  }, [targetOrderId, purchases]);

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'current', label: 'الجارية', count: current.length },
    { key: 'online', label: 'التوصيل', count: onlineHistory.length },
    { key: 'store', label: 'من الفرع', count: storeHistory.length },
  ];
  const emptyText: Record<TabType, { title: string; body: string }> = {
    current: { title: 'مفيش طلبات جارية دلوقتي', body: 'أول ما تطلب، هتتابع طلبك من هنا خطوة بخطوة.' },
    online: { title: 'مفيش طلبات توصيل سابقة', body: 'الطلبات اللي وصلت أو اتلغت هتظهر هنا.' },
    store: { title: 'مفيش مشتريات من الفرع', body: 'لما تشتري من الفرع ببطاقتك، الفاتورة هتظهر هنا.' },
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="مشترياتي" showBackButton onBack={() => navigate('/account')} />
      <div className="mx-auto max-w-3xl px-3 pb-10 pt-4 sm:px-6">
        {!session ? (
          <section className="mx-auto max-w-md rounded-[28px] border border-[#dcefe4] bg-white p-7 text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f5ed] text-[#005931]"><Package size={30} /></span>
            <h1 className="text-2xl font-black text-[#10241a]">مشترياتك محفوظة في حسابك</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-slate-500">سجّل دخولك عشان تشوف طلبات التوصيل وفواتير الفرع المرتبطة ببطاقتك.</p>
            <Button className="min-h-12 w-full rounded-2xl text-base" onClick={() => navigate('/phone-verify?returnTo=%2Faccount')}>تسجيل الدخول</Button>
          </section>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl bg-[#eef4f0] p-1 dark:bg-white/5">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-[13px] font-bold transition ${activeTab === tab.key ? 'bg-white text-[#005931] shadow-sm dark:bg-[#1c2a22] dark:text-[#8fe0b4]' : 'text-slate-500'}`}
                  >
                    {tab.label}
                    <span className={`min-w-5 rounded-full px-1.5 text-[10.5px] ${activeTab === tab.key ? 'bg-[#e8f5ed] dark:bg-white/10' : 'bg-white/70 dark:bg-white/5'}`}>{tab.count.toLocaleString('ar-EG')}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="تحديث"
                disabled={isFetching}
                onClick={() => void refetch()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#dcefe4] bg-white text-[#005931] disabled:opacity-60 dark:border-white/10 dark:bg-[#17211b]"
              >
                <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>

            {isLoading ? (
              <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل مشترياتك" /></div>
            ) : isError ? (
              <section role="alert" className="rounded-[28px] border border-red-100 bg-white p-8 text-center"><XCircle className="mx-auto text-red-500" size={36} /><h2 className="mt-4 text-xl font-bold">تعذّر تحميل المشتريات</h2><p className="my-3 text-sm text-slate-500">راجع اتصالك وحاول مرة تانية.</p><Button className="rounded-2xl" onClick={() => void refetch()}>إعادة المحاولة</Button></section>
            ) : active.length === 0 ? (
              <section className="rounded-[28px] border border-[#dcefe4] bg-white p-8 text-center dark:border-white/10 dark:bg-[#17211b]">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f3f7f4] text-slate-400 dark:bg-white/5"><ShoppingBag size={30} /></span>
                <h2 className="mt-4 text-lg font-black">{emptyText[activeTab].title}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{emptyText[activeTab].body}</p>
                <Button className="mt-6 min-h-12 rounded-2xl px-8" onClick={() => navigate('/')}>تسوق دلوقتي</Button>
              </section>
            ) : (
              <div className="space-y-3">
                {active.map(purchase => {
                  const items = normalizeItems(purchase.items);
                  const expanded = expandedId === purchase.id;
                  const storePurchase = purchase.source_channel === 'store';
                  const status = STATUS_META[purchase.status] || (storePurchase ? STATUS_META.store_completed : { label: purchase.status, description: 'يتم تحديث حالة الطلب.', className: 'bg-gray-50 text-gray-700 border-gray-100' });
                  const paymentStatus = purchase.payment_status ? PAYMENT_STATUS_META[purchase.payment_status] : null;
                  const points = Number(purchase.loyalty_points_earned || 0);
                  const groupRoute = purchase.group_operations?.route;
                  const groupRouteProgress = purchase.group_operations?.route_progress;
                  const groupRouteStops = purchase.group_operations?.route_stops || [];
                  const pickupTotal = Number(groupRouteProgress?.pickups_total || 0);
                  const pickupCompleted = Number(groupRouteProgress?.pickups_completed || 0);
                  const pickupPercent = pickupTotal > 0 ? Math.min(100, Math.round((pickupCompleted / pickupTotal) * 100)) : 0;
                  const groupPhase = routePhaseMeta(groupRouteProgress?.delivery_phase);
                  const isCurrent = !storePurchase && !['delivered', 'cancelled'].includes(purchase.status);
                  const pin = purchase.status === 'shipped' ? pinByOrder.get(purchase.order_group_id || purchase.id) : undefined;
                  const paidOnline = purchase.payment_status === 'paid' && !['cash', 'cod'].includes(purchase.payment_method || 'cash');
                  const leftStore = purchase.is_multi_store && ['collecting_pickups', 'all_pickups_collected', 'on_the_way', 'arrived_customer', 'delivered'].includes(groupRouteProgress?.delivery_phase || '');
                  const cancellable = isCurrent && CANCELLABLE_STATUSES.has(purchase.status) && !paidOnline && !leftStore;
                  const itemCount = items.reduce((sum, item) => sum + (item.unit_of_measure === 'weight' ? 1 : Math.max(1, Number(item.quantity || 1))), 0);

                  return (
                    <article id={`purchase-${purchase.id}`} key={`${purchase.source_channel}-${purchase.id}`} className="scroll-mt-28 overflow-hidden rounded-[26px] border border-[#dcefe4] bg-white shadow-[0_6px_20px_rgba(0,89,49,0.05)] dark:border-white/10 dark:bg-[#17211b]">
                      <div className="p-4 sm:p-5">
                        {/* Header: what it is, number, date, status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${storePurchase ? 'bg-emerald-50 text-emerald-700' : 'bg-[#e8f5ed] text-[#005931]'} dark:bg-white/5`}>
                              {storePurchase ? <Store size={19} /> : <Truck size={19} />}
                            </span>
                            <div className="min-w-0">
                              <h2 dir="ltr" className="truncate text-right text-[14.5px] font-black">#{purchaseNumber(purchase)}</h2>
                              <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                                {formatDate(purchase.created_at)}
                                {storePurchase && purchase.branch_name ? ` · ${purchase.branch_name}` : ''}
                                {purchase.is_multi_store ? ` · من ${Number(purchase.stores_count || 0).toLocaleString('ar-EG')} متاجر` : ''}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${status.className}`}>
                            {purchase.status === 'shipped' && <Truck size={12} />}
                            {purchase.status === 'delivered' && <CheckCircle2 size={12} />}
                            {purchase.status === 'cancelled' && <XCircle size={12} />}
                            {storePurchase ? 'من الفرع' : status.label}
                          </span>
                        </div>

                        {isCurrent && <OrderProgress status={purchase.status} />}

                        {/* Confirmation code, front and center once the order is out */}
                        {pin && (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#005931] px-4 py-3 text-white">
                            <div className="min-w-0">
                              <p className="text-sm font-black">رقم تأكيد الاستلام</p>
                              <p className="mt-0.5 text-[11px] text-white/80">قوله للمندوب وقت ما يسلمك الطلب</p>
                            </div>
                            <b dir="ltr" className="select-all rounded-xl bg-white px-3 py-1 text-2xl font-black tracking-[0.25em] text-[#005931]">{pin}</b>
                          </div>
                        )}

                        {isCurrent && purchase.is_multi_store && (
                          <div className={`mt-4 rounded-2xl border p-3.5 ${groupPhase.className}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2.5">
                                <Truck size={18} className="mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-bold">{groupPhase.label}</p>
                                  <p className="mt-0.5 text-xs leading-5 opacity-80">{groupPhase.description}</p>
                                  {groupRoute?.driver_name && <p className="mt-1 text-[11px] font-semibold opacity-80">المندوب: {groupRoute.driver_name}</p>}
                                </div>
                              </div>
                              {pickupTotal > 0 && <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold">{pickupCompleted}/{pickupTotal}</span>}
                            </div>
                            {pickupTotal > 0 && (
                              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/70">
                                <div className="h-full rounded-full bg-current transition-all" style={{ width: `${pickupPercent}%` }} />
                              </div>
                            )}
                            {Number(groupRouteProgress?.pickup_issues_open || 0) > 0 && (
                              <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] font-semibold text-amber-900">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                فيه تأخير بسيط في متجر، وبنتابعه من غير ما نلغي باقي الطلب.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Summary: photos, count, total, points */}
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#f6faf7] p-3 dark:bg-white/5">
                          <div className="flex min-w-0 items-center">
                            {items.slice(0, 4).map((item, index) => (
                              <span key={`${purchase.id}-preview-${index}`} className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white bg-white first:ml-0 dark:border-[#17211b]">
                                {item.image_url
                                  ? <img src={item.image_url} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" />
                                  : <Box size={16} className="text-slate-400" />}
                              </span>
                            ))}
                            <span className="mr-2.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
                              {itemCount.toLocaleString('ar-EG')} {itemCount === 1 ? 'منتج' : 'منتجات'}
                            </span>
                          </div>
                          <div className="shrink-0 text-left">
                            {points > 0 && <p className="flex items-center justify-end gap-1 text-[10.5px] font-bold text-emerald-700"><Gift size={11} />+{points.toLocaleString('ar-EG')} نقطة</p>}
                            <p className="text-base font-black text-[#005931] dark:text-[#8fe0b4]">{formatMoney(purchase.total)}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() => setExpandedId(expanded ? null : purchase.id)}
                            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#dcefe4] text-[13px] font-bold text-[#005931] dark:border-white/10 dark:text-[#8fe0b4]"
                          >
                            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                            {expanded ? 'إخفاء التفاصيل' : 'التفاصيل'}
                          </button>
                          {cancellable && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(purchase)}
                              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 text-[13px] font-bold text-red-700"
                            >
                              <XCircle size={16} />
                              إلغاء الطلب
                            </button>
                          )}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => navigate('/')}
                              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#005931] text-[13px] font-bold text-white"
                            >
                              <ShoppingBag size={16} />
                              تسوق تاني
                            </button>
                          )}
                        </div>
                        {isCurrent && CANCELLABLE_STATUSES.has(purchase.status) && paidOnline && (
                          <p className="mt-2 text-center text-[11px] text-slate-500">الطلب مدفوع أونلاين؛ لإلغائه كلّم المحل عشان نرجعلك فلوسك.</p>
                        )}
                      </div>

                      {expanded && (
                        <div className="space-y-3 border-t border-[#e6f1ea] bg-[#f8fbf9] p-4 sm:p-5 dark:border-white/10 dark:bg-black/10">
                          {!storePurchase && (
                            <section className="rounded-2xl bg-white p-4 dark:bg-[#17211b]">
                              <h3 className="flex items-center gap-2 text-sm font-black"><Package size={17} className="text-[#005931]" />تتبع الطلب</h3>
                              {purchase.status === 'cancelled' ? (
                                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">الطلب اتلغى.</div>
                              ) : purchase.is_multi_store ? (
                                <div className="mt-3 space-y-2">
                                  {(purchase.group_operations?.stores || []).map(store => {
                                    const storeStatus = STATUS_META[store.status] || { label: store.status, description: '', className: 'bg-gray-50 text-gray-700 border-gray-100' };
                                    return (
                                      <div key={store.order_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 dark:border-white/10">
                                        <div className="min-w-0">
                                          <p className="truncate text-[13px] font-bold">{store.branch_name || store.merchant_name}</p>
                                          {store.predicted_ready_at && !['ready', 'shipped', 'delivered', 'cancelled'].includes(store.status) && (
                                            <p className="mt-0.5 text-[10.5px] text-slate-500">التجهيز المتوقع {formatClock(store.predicted_ready_at)}</p>
                                          )}
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${storeStatus.className}`}>{storeStatus.label}</span>
                                      </div>
                                    );
                                  })}
                                  {groupRouteStops.length > 0 && (
                                    <div className="space-y-2.5 rounded-xl bg-[#f3f7ff] p-3 dark:bg-white/5">
                                      {groupRouteStops.map(stop => {
                                        const completed = Boolean(stop.completed_at);
                                        const arrived = Boolean(stop.arrived_at) && !completed;
                                        return (
                                          <div key={`${purchase.id}-route-stop-${stop.stop_order}`} className="flex items-center gap-2.5">
                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-black ${completed ? 'border-[#005931] bg-[#005931] text-white' : arrived ? 'border-indigo-500 bg-white text-indigo-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                                              {completed ? <CheckCircle2 size={14} /> : stop.stop_order}
                                            </span>
                                            <p className="min-w-0 flex-1 truncate text-[12.5px] font-bold">{stop.stop_type === 'customer' ? 'التسليم' : 'استلام'} · {stop.display_name}</p>
                                            <span className="shrink-0 text-[10.5px] text-slate-500">
                                              {completed ? 'تم' : arrived ? 'المندوب وصل' : stop.eta ? formatClock(stop.eta) : stop.ready ? 'جاهزة' : 'في الانتظار'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <OrderTimeline order={purchase as never} />
                              )}
                            </section>
                          )}

                          <section className="rounded-2xl bg-white p-4 dark:bg-[#17211b]">
                            <h3 className="text-sm font-black">المنتجات ({items.length.toLocaleString('ar-EG')})</h3>
                            <div className="mt-2 divide-y divide-slate-100 dark:divide-white/10">
                              {items.length ? items.map((item, index) => {
                                const quantity = Number(item.quantity || 0);
                                const price = Number(item.price || 0);
                                const lineTotal = Number(item.total ?? quantity * price);
                                return (
                                  <div key={`${purchase.id}-item-${index}`} className="flex items-center gap-3 py-2.5">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f6faf7] dark:bg-white/5">
                                      {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" /> : <Box size={18} className="text-slate-400" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="line-clamp-2 text-[13px] font-semibold leading-5">{item.name || 'منتج'}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">
                                        {quantity.toLocaleString('ar-EG')} {item.unit_of_measure === 'weight' ? 'كجم' : item.is_bulk ? 'جملة' : 'قطعة'} × {formatMoney(price)}
                                        {purchase.is_multi_store && item.merchant_name ? ` · ${item.merchant_name}` : ''}
                                      </p>
                                    </div>
                                    <p className="shrink-0 text-[13px] font-bold">{formatMoney(lineTotal)}</p>
                                  </div>
                                );
                              }) : <p className="py-2 text-sm text-slate-500">تفاصيل المنتجات مش متاحة.</p>}
                            </div>
                            <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-3 text-[13px] dark:border-white/10">
                              {!storePurchase && Number(purchase.shipping_cost || 0) > 0 && <div className="flex justify-between"><span className="text-slate-500">التوصيل</span><span>{formatMoney(purchase.shipping_cost)}</span></div>}
                              <div className="flex justify-between text-[15px] font-black"><span>الإجمالي</span><span className="text-[#005931] dark:text-[#8fe0b4]">{formatMoney(purchase.total)}</span></div>
                            </div>
                          </section>

                          <section className="space-y-3 rounded-2xl bg-white p-4 text-[13px] dark:bg-[#17211b]">
                            {!storePurchase && purchase.shipping_address && (
                              <div className="flex items-start gap-2.5">
                                <MapPin size={17} className="mt-0.5 shrink-0 text-slate-400" />
                                <div><p className="text-[11px] text-slate-500">عنوان التوصيل</p><p className="mt-0.5 leading-6">{purchase.shipping_address}</p></div>
                              </div>
                            )}
                            {storePurchase && purchase.branch_name && (
                              <div className="flex items-start gap-2.5">
                                <Store size={17} className="mt-0.5 shrink-0 text-slate-400" />
                                <div><p className="text-[11px] text-slate-500">الفرع</p><p className="mt-0.5">{purchase.branch_name}</p></div>
                              </div>
                            )}
                            <div className="flex items-start gap-2.5">
                              <CreditCard size={17} className="mt-0.5 shrink-0 text-slate-400" />
                              <div>
                                <p className="text-[11px] text-slate-500">الدفع</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                  <span>{paymentMethodLabel(purchase.payment_method)}</span>
                                  {paymentStatus && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${paymentStatus.className}`}>{paymentStatus.label}</span>}
                                </div>
                              </div>
                            </div>
                            {!storePurchase && purchase.delivery_person && (
                              <div className="flex items-start gap-2.5">
                                <Truck size={17} className="mt-0.5 shrink-0 text-slate-400" />
                                <div><p className="text-[11px] text-slate-500">المندوب</p><p className="mt-0.5">{purchase.delivery_person}</p></div>
                              </div>
                            )}
                          </section>

                          {purchase.is_multi_store && purchase.status === 'delivered' && (purchase.group_orders || []).length > 0 && (
                            <section className="rounded-2xl bg-white p-4 dark:bg-[#17211b]">
                              <h3 className="text-sm font-black">استرجاع من متجر</h3>
                              <p className="mt-1 text-[11.5px] leading-5 text-slate-500">اختار المتجر اللي فيه المنتج اللي عاوز ترجعه.</p>
                              <div className="mt-3 space-y-2">
                                {(purchase.group_orders || []).map(groupOrder => (
                                  <div key={groupOrder.order_id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6faf7] p-3 dark:bg-white/5">
                                    <div className="min-w-0">
                                      <p className="truncate text-[13px] font-bold">{groupOrder.merchant_name || groupOrder.branch_name}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">{formatMoney(groupOrder.subtotal)}</p>
                                    </div>
                                    <Button size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={() => navigate(`/create-return/${groupOrder.order_id}`)}>
                                      <RefreshCw size={14} className="ml-1" />استرجاع
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {!storePurchase && purchase.status === 'delivered' && !purchase.is_multi_store && (
                            <Button variant="outline" className="min-h-11 w-full rounded-xl" onClick={() => navigate(`/create-return/${purchase.id}`)}>
                              <RefreshCw size={16} className="ml-2" />طلب استرجاع
                            </Button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/return-requests')}
              className="flex w-full items-center justify-center gap-1.5 py-2 text-[12.5px] font-bold text-slate-500"
            >
              <ReceiptText size={15} />
              طلبات الاسترجاع
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={open => { if (!open && !cancelling) setCancelTarget(null); }}>
        <AlertDialogContent dir="rtl" className="rounded-[26px]">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle className="text-right">تلغي الطلب؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right leading-7">
              الطلب {cancelTarget ? `#${purchaseNumber(cancelTarget)}` : ''} لسه في المحل. لو لغيته هنبلّغ المحل يوقف تجهيزه، ومينفعش يرجع تاني.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-start">
            <AlertDialogAction
              onClick={event => { event.preventDefault(); void confirmCancel(); }}
              disabled={cancelling}
              className="flex-1 rounded-xl bg-red-600 hover:bg-red-700"
            >
              {cancelling ? 'جاري الإلغاء…' : 'أيوه، الغي الطلب'}
            </AlertDialogAction>
            <AlertDialogCancel disabled={cancelling} className="mt-0 flex-1 rounded-xl">لأ، خليه</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

/** Orders that have not left the store yet can be cancelled by the customer. */
const CANCELLABLE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'ready']);

const PROGRESS_STEPS = [
  { label: 'اتأكد', statuses: ['pending', 'confirmed'] },
  { label: 'بيتجهز', statuses: ['preparing', 'ready'] },
  { label: 'خرج', statuses: ['shipped'] },
  { label: 'وصل', statuses: ['delivered'] },
];

/** Four-step progress bar: confirmed, preparing, out for delivery, delivered. */
function OrderProgress({ status }: { status: string }) {
  const current = Math.max(0, PROGRESS_STEPS.findIndex(step => step.statuses.includes(status)));
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="مراحل الطلب">
      {PROGRESS_STEPS.map((step, index) => {
        const done = index < current;
        const isActive = index === current;
        return (
          <li key={step.label} className="min-w-0">
            <span className={`block h-1.5 rounded-full ${done || isActive ? 'bg-[#005931]' : 'bg-[#e3ece6] dark:bg-white/10'} ${isActive ? 'animate-pulse' : ''}`} />
            <span className={`mt-1.5 block truncate text-center text-[11px] font-bold ${isActive ? 'text-[#005931] dark:text-[#8fe0b4]' : done ? 'text-slate-600' : 'text-slate-400'}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
