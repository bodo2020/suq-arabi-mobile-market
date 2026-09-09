import React, { useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Clock3, Gift, Package, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchCustomerNotificationCenterV2,
  markAllCustomerNotificationsReadV2,
  markCustomerNotificationReadV2,
  type CustomerNotificationItemV2,
} from '@/services/notificationCenterV2';

type Filter = 'all' | 'unread';

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const categoryLabel = (category: string) => {
  if (category === 'orders') return 'الطلبات';
  if (category === 'returns') return 'المرتجعات';
  if (category === 'marketing') return 'العروض';
  if (category === 'loyalty') return 'النقاط والمكافآت';
  if (category === 'customers') return 'حسابك';
  return 'إشعار';
};

const categoryIcon = (item: CustomerNotificationItemV2) => {
  if (item.category === 'marketing') return Sparkles;
  if (item.category === 'loyalty') return Gift;
  return Package;
};

const severityClasses = (severity: CustomerNotificationItemV2['severity']) => {
  if (severity === 'critical') return 'border-red-100 bg-red-50/70 text-red-700';
  if (severity === 'high') return 'border-amber-100 bg-amber-50/70 text-amber-700';
  return 'border-green-100 bg-green-50/70 text-primary';
};

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, authLoading } = useUser();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');

  const notifications = useQuery({
    queryKey: ['customer-notification-center-v2', user?.id, filter],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: () => fetchCustomerNotificationCenterV2(filter),
    staleTime: 8_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const items = notifications.data?.items || [];
  const unreadCount = notifications.data?.summary.unread || 0;
  const todayCount = notifications.data?.summary.today || 0;
  const visible = useMemo(() => items, [items]);

  const invalidateNotificationCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user?.id] });
  };

  const markRead = async (id: string) => {
    await markCustomerNotificationReadV2(id);
    invalidateNotificationCaches();
  };

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      await markAllCustomerNotificationsReadV2();
      invalidateNotificationCaches();
    } catch {
      toast({ title: 'تعذر تحديث الإشعارات', description: 'حاول مرة تانية.', variant: 'destructive' });
    }
  };

  const openNotification = async (item: CustomerNotificationItemV2) => {
    try {
      if (!item.read_at) await markRead(item.id);
    } catch {
      // فتح الإجراء أهم من تعطيل العميل بسبب تعذر تحديث حالة القراءة مؤقتًا.
    }

    if (item.action_url?.startsWith('/')) {
      navigate(item.action_url);
      return;
    }

    const orderId = typeof item.metadata?.order_id === 'string' ? item.metadata.order_id : null;
    navigate(orderId ? `/orders?order_id=${encodeURIComponent(orderId)}` : '/notifications');
  };

  return (
    <MainLayout>
      <TopNavBar hideLogo hideSearch hideCart pageTitle="الإشعارات" showBackButton />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل الإشعارات" /></div>
        ) : !session || !user ? (
          <section className="mx-auto max-w-md rounded-3xl border border-gray-100 bg-white p-7 text-center shadow-sm">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-primary"><Bell size={30} /></span>
            <h1 className="text-2xl font-bold">إشعاراتك في مكان واحد</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">سجّل دخولك عشان تستقبل تحديثات الطلب والعروض والتنبيهات المرتبطة بحسابك.</p>
            <Button className="min-h-12 w-full rounded-xl" onClick={() => navigate('/phone-login')}>تسجيل الدخول</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary">
                    <BellRing size={24} />
                    <h1 className="text-2xl font-bold">مركز إشعاراتك</h1>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                    الإشعارات داخل التطبيق مفعّلة تلقائيًا. تحديثات الطلب والعروض والمكافآت تظهر هنا وتحفظ حالة القراءة على حسابك.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-11 items-center rounded-xl bg-white px-3 text-xs font-semibold text-green-700 shadow-sm">
                    <CheckCheck size={16} className="ml-2" /> داخل التطبيق مفعّل
                  </span>
                  {unreadCount > 0 && (
                    <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => void markAllRead()}>
                      <CheckCheck size={16} className="ml-2" /> تحديد الكل كمقروء
                    </Button>
                  )}
                </div>
              </div>

              {!notifications.isLoading && !notifications.isError && (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">غير مقروء</p>
                    <p className="mt-1 text-2xl font-bold text-primary">{unreadCount.toLocaleString('ar-EG')}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">اليوم</p>
                    <p className="mt-1 text-2xl font-bold">{todayCount.toLocaleString('ar-EG')}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-gray-500">الإجمالي</p>
                    <p className="mt-1 text-2xl font-bold">{Number(notifications.data?.summary.total || 0).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
              <button type="button" onClick={() => setFilter('all')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>الكل</button>
              <button type="button" onClick={() => setFilter('unread')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'unread' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>غير مقروء ({unreadCount.toLocaleString('ar-EG')})</button>
            </div>

            {notifications.isLoading ? (
              <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل الإشعارات" /></div>
            ) : notifications.isError ? (
              <section role="alert" className="rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-bold">تعذر تحميل الإشعارات</h2>
                <p className="mt-2 text-sm text-gray-500">راجع اتصالك وحاول مرة تانية.</p>
                <Button className="mt-5 rounded-xl" onClick={() => void notifications.refetch()}>إعادة المحاولة</Button>
              </section>
            ) : visible.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><Bell size={30} /></span>
                <h2 className="mt-4 text-xl font-bold">{filter === 'unread' ? 'مفيش إشعارات جديدة' : 'مفيش إشعارات لسه'}</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">أي رسالة من المعداوي ماركت أو تحديث مرتبط بحسابك هيظهر هنا تلقائيًا.</p>
              </section>
            ) : (
              <div className="space-y-3">
                {visible.map(item => {
                  const Icon = categoryIcon(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openNotification(item)}
                      className={`w-full rounded-2xl border p-4 text-right shadow-sm transition hover:border-green-200 sm:p-5 ${item.read_at ? 'border-gray-100 bg-white' : 'border-green-100 bg-green-50/40'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${severityClasses(item.severity)}`}>
                          <Icon size={21} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-sm sm:text-base">{item.title}</strong>
                            <span className="inline-flex items-center text-[11px] text-gray-500"><Clock3 size={13} className="ml-1" />{formatDate(item.created_at)}</span>
                          </span>
                          <span className="mt-1.5 block text-sm leading-6 text-gray-600">{item.body}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{categoryLabel(item.category)}</span>
                            {(item.action_url || item.metadata?.order_id) && <span className="font-semibold text-primary">{item.action_label || 'فتح التفاصيل'}</span>}
                          </span>
                        </span>
                        {!item.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="غير مقروء" />}
                      </div>
                    </button>
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

export default Notifications;
