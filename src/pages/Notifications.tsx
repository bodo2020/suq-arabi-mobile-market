import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Clock3, Gift, Package, Settings2, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchCustomerNotificationCenterV2,
  getCustomerNotificationPreferencesV2,
  markAllCustomerNotificationsReadV2,
  markCustomerNotificationReadV2,
  setCustomerNotificationPreferencesV2,
  type CustomerNotificationItemV2,
} from '@/services/notificationCenterV2';
import {
  getMyPushDeviceStatus,
  getNativePushPermission,
  requestCustomerPushPermissionAndRegister,
} from '@/services/pushNotifications';

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
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const preferences = useQuery({
    queryKey: ['customer-notification-preferences-v2', user?.id],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: getCustomerNotificationPreferencesV2,
    staleTime: 30_000,
  });

  const pushDevice = useQuery({
    queryKey: ['customer-push-device-v2', user?.id],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: getMyPushDeviceStatus,
    staleTime: 15_000,
  });

  const pushPermission = useQuery({
    queryKey: ['customer-native-push-permission', user?.id],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: getNativePushPermission,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`customer-notifications-page:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const preferenceMutation = useMutation({
    mutationFn: setCustomerNotificationPreferencesV2,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['customer-notification-preferences-v2', user?.id] });
    },
    onError: () => toast({ title: 'تعذر حفظ إعدادات الإشعارات', description: 'حاول مرة تانية.', variant: 'destructive' }),
  });

  const items = notifications.data?.items || [];
  const unreadCount = notifications.data?.summary.unread || 0;

  const todayCount = notifications.data?.summary.today || 0;
  const visible = useMemo(() => items, [items]);

  const markRead = async (id: string) => {
    await markCustomerNotificationReadV2(id);
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user?.id] });
  };

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    try {
      await markAllCustomerNotificationsReadV2();
      void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
      void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
    } catch {
      toast({ title: 'تعذر تحديث الإشعارات', description: 'حاول مرة تانية.', variant: 'destructive' });
    }
  };

  const openNotification = async (item: CustomerNotificationItemV2) => {
    try {
      if (!item.read_at) await markRead(item.id);
    } catch {
      // Navigation remains available even if marking as read temporarily fails.
    }

    if (item.action_url?.startsWith('/')) {
      navigate(item.action_url);
      return;
    }
    const orderId = typeof item.metadata?.order_id === 'string' ? item.metadata.order_id : null;
    navigate(orderId ? `/orders?order_id=${encodeURIComponent(orderId)}` : '/notifications');
  };

  const enableNativePush = async () => {
    try {
      const result = await requestCustomerPushPermissionAndRegister();
      if (result === 'unsupported') {
        toast({ title: 'متاح في تطبيق الموبايل', description: 'Push Notifications تعمل من نسخة Android/iPhone المثبتة، مش من نسخة الويب الحالية.' });
        return;
      }
      if (result === 'denied') {
        toast({ title: 'الإشعارات غير مسموحة', description: 'فعّل إذن الإشعارات لتطبيق المعداوي ماركت من إعدادات الموبايل.' });
        void pushPermission.refetch();
        return;
      }
      await preferenceMutation.mutateAsync({ push_enabled: true });
      toast({ title: 'تم تفعيل Push Notifications', description: 'هنبعتلك تحديثات الطلب المهمة على الموبايل.' });
      window.setTimeout(() => {
        void pushDevice.refetch();
        void pushPermission.refetch();
      }, 1200);
    } catch {
      toast({ title: 'تعذر تفعيل الإشعارات', description: 'راجع إعدادات التطبيق وحاول مرة تانية.', variant: 'destructive' });
    }
  };

  const pushRegistered = Boolean(pushDevice.data?.registered);
  const permissionState = pushPermission.data;
  const pushEnabled = preferences.data?.push_enabled !== false;
  const marketingEnabled = Boolean(preferences.data?.marketing_enabled);
  const quietHoursEnabled = preferences.data?.quiet_hours_enabled !== false;

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
                  <div className="flex items-center gap-2 text-primary"><BellRing size={24} /><h1 className="text-2xl font-bold">مركز إشعاراتك</h1></div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">متابعة الطلبات والعروض والمكافآت بتظهر هنا، والـPush يوصل للموبايل حتى لو التطبيق مقفول بعد تفعيله.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pushRegistered && permissionState === 'granted' ? (
                    <span className="inline-flex min-h-11 items-center rounded-xl bg-white px-3 text-xs font-semibold text-green-700"><ShieldCheck size={16} className="ml-2" />Push مفعّل على {Number(pushDevice.data?.device_count || 1).toLocaleString('ar-EG')} جهاز</span>
                  ) : (
                    <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => void enableNativePush()}>
                      <BellRing size={16} className="ml-2" />تفعيل Push Notifications
                    </Button>
                  )}
                  {unreadCount > 0 && (
                    <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => void markAllRead()}>
                      <CheckCheck size={16} className="ml-2" />تحديد الكل كمقروء
                    </Button>
                  )}
                </div>
              </div>

              {!notifications.isLoading && !notifications.isError && (
                <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">غير مقروء</p><p className="mt-1 text-2xl font-bold text-primary">{unreadCount}</p></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">اليوم</p><p className="mt-1 text-2xl font-bold">{todayCount}</p></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">الإجمالي</p><p className="mt-1 text-2xl font-bold">{notifications.data?.summary.total || 0}</p></div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Settings2 size={19} className="text-primary" /><h2 className="font-bold">إعدادات الإشعارات</h2></div>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div><p className="text-sm font-semibold">Push Notifications</p><p className="mt-1 text-xs leading-5 text-gray-500">تحديثات الطلب والتنبيهات المهمة على جهازك.</p></div>
                  <Switch checked={pushEnabled} onCheckedChange={checked => preferenceMutation.mutate({ push_enabled: checked })} disabled={preferenceMutation.isPending} />
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div><p className="text-sm font-semibold">العروض وتذكير السلة</p><p className="mt-1 text-xs leading-5 text-gray-500">اختياري بالكامل، ويمكنك إيقافه في أي وقت.</p></div>
                  <Switch checked={marketingEnabled} onCheckedChange={checked => preferenceMutation.mutate({ marketing_enabled: checked })} disabled={preferenceMutation.isPending || !pushEnabled} />
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div><p className="text-sm font-semibold">عدم الإزعاج ليلًا</p><p className="mt-1 text-xs leading-5 text-gray-500">العروض التسويقية تتأجل تلقائيًا من 12 منتصف الليل إلى 8 صباحًا.</p></div>
                  <Switch checked={quietHoursEnabled} onCheckedChange={checked => preferenceMutation.mutate({ quiet_hours_enabled: checked })} disabled={preferenceMutation.isPending} />
                </div>
              </div>
              {permissionState === 'unsupported' && <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500">النسخة الحالية Web؛ استقبال Push خارج المتصفح يتفعّل من تطبيق الموبايل بعد إضافة إعدادات Firebase للنسخة الأصلية.</p>}
              {permissionState === 'denied' && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">إذن الإشعارات مقفول من الجهاز. افتح إعدادات التطبيق واسمح بالإشعارات ثم ارجع هنا.</p>}
            </section>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1.5">
              <button type="button" onClick={() => setFilter('all')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>الكل</button>
              <button type="button" onClick={() => setFilter('unread')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'unread' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'}`}>غير مقروء ({unreadCount})</button>
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
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">تحديثات الطلب والعروض والمكافآت هتظهر هنا تلقائيًا.</p>
                <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate('/orders')}>فتح طلباتي</Button>
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
                      className={`w-full rounded-2xl border p-4 text-right shadow-sm transition hover:border-green-200 sm:p-5 ${item.read_at ? 'border-gray-100 bg-white' : 'border-green-100 bg-green-50/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.read_at ? 'bg-gray-50 text-gray-500' : 'bg-white text-primary shadow-sm'}`}>
                          <Icon size={21} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm sm:text-base">{item.title}</strong>
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{categoryLabel(item.category)}</span>
                            </span>
                            <span className="inline-flex items-center text-[11px] text-gray-500"><Clock3 size={13} className="ml-1" />{formatDate(item.created_at)}</span>
                          </span>
                          <span className="mt-1.5 block text-sm leading-6 text-gray-600">{item.body}</span>
                          {(item.action_url || typeof item.metadata?.order_id === 'string') && <span className="mt-2 block text-xs font-semibold text-primary">{item.action_label || (item.category === 'orders' ? 'فتح تفاصيل الطلب' : 'فتح التفاصيل')}</span>}
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
