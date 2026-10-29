import React, { useState } from 'react';
import { Bell, CheckCheck, Clock3, Gift, Package, Sparkles } from 'lucide-react';
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
  type CustomerNotificationCenterV2,
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

const markCenterRead = (current: CustomerNotificationCenterV2 | undefined, clearItems = false) => {
  if (!current) return current;
  const readAt = new Date().toISOString();
  return {
    ...current,
    summary: { ...current.summary, unread: 0 },
    items: clearItems ? [] : current.items.map(item => ({ ...item, read_at: item.read_at || readAt })),
  };
};

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, authLoading } = useUser();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [markingAll, setMarkingAll] = useState(false);

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

  const invalidateNotificationCaches = () => {
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user?.id] });
  };

  const applyAllReadToCache = () => {
    if (!user?.id) return;
    queryClient.setQueryData<CustomerNotificationCenterV2>(
      ['customer-notification-center-v2', user.id, 'all'],
      current => markCenterRead(current),
    );
    queryClient.setQueryData<CustomerNotificationCenterV2>(
      ['customer-notification-center-v2', user.id, 'unread'],
      current => markCenterRead(current, true),
    );
    queryClient.setQueryData<CustomerNotificationCenterV2>(
      ['customer-notification-unread', user.id],
      current => markCenterRead(current, true),
    );
  };

  const markRead = async (id: string) => {
    await markCustomerNotificationReadV2(id);
    invalidateNotificationCaches();
  };

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllCustomerNotificationsReadV2();
      applyAllReadToCache();
      invalidateNotificationCaches();
      toast({ title: 'تم تحديد كل الإشعارات كمقروءة' });
    } catch {
      invalidateNotificationCaches();
      toast({ title: 'تعذر تحديث الإشعارات', description: 'حاول مرة تانية.', variant: 'destructive' });
    } finally {
      setMarkingAll(false);
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
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="الإشعارات" showBackButton />
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل الإشعارات" /></div>
        ) : !session || !user ? null : (
          <div className="space-y-4">
            <section className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary">
                  <Bell size={22} />
                </span>
                <div className="min-w-0">
                  <h1 className="text-lg font-black text-gray-950">الإشعارات</h1>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {unreadCount > 0 ? `${unreadCount.toLocaleString('ar-EG')} جديد` : 'كل الإشعارات مقروءة'}
                  </p>
                </div>
              </div>

              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void markAllRead()}
                  disabled={markingAll}
                  className="min-h-10 shrink-0 rounded-xl border-green-200 px-3 text-xs font-bold text-primary"
                >
                  {markingAll ? <BrandLoader size="sm" /> : <CheckCheck size={16} className="ml-1.5" />}
                  {markingAll ? 'جاري الحفظ' : 'قراءة الكل'}
                </Button>
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
            ) : items.length === 0 ? (
              <section className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"><Bell size={30} /></span>
                <h2 className="mt-4 text-xl font-bold">{filter === 'unread' ? 'مفيش إشعارات جديدة' : 'مفيش إشعارات لسه'}</h2>
              </section>
            ) : (
              <div className="space-y-3">
                {items.map(item => {
                  const Icon = categoryIcon(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openNotification(item)}
                      className={`w-full rounded-2xl border p-4 text-right shadow-sm transition active:scale-[0.995] sm:p-5 ${item.read_at ? 'border-gray-100 bg-white' : 'border-green-100 bg-green-50/40'}`}
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
