import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, Clock3, Package, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

type NotificationRow = {
  id: string;
  order_id: string | null;
  kind: 'order_status' | 'payment_status';
  status: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

type Filter = 'all' | 'unread';

const notificationsTable = () => (supabase as any).from('customer_notifications');

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

const Notifications = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, authLoading } = useUser();
  const { toast } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [devicePermission, setDevicePermission] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const notifications = useQuery({
    queryKey: ['customer-notifications', user?.id],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: async (): Promise<NotificationRow[]> => {
      const { data, error } = await notificationsTable()
        .select('id,order_id,kind,status,title,body,read_at,created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as NotificationRow[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
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
          void queryClient.invalidateQueries({ queryKey: ['customer-notifications', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = useMemo(
    () => (notifications.data || []).filter(item => !item.read_at).length,
    [notifications.data],
  );

  const visible = useMemo(
    () => filter === 'unread' ? (notifications.data || []).filter(item => !item.read_at) : (notifications.data || []),
    [notifications.data, filter],
  );

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await notificationsTable().update({ read_at: now }).eq('id', id);
    if (error) throw error;
    queryClient.setQueryData<NotificationRow[]>(['customer-notifications', user?.id], current =>
      (current || []).map(item => item.id === id ? { ...item, read_at: now } : item),
    );
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user?.id] });
  };

  const markAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;
    const now = new Date().toISOString();
    const { error } = await notificationsTable()
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (error) {
      toast({ title: 'تعذر تحديث الإشعارات', description: 'حاول مرة تانية.', variant: 'destructive' });
      return;
    }
    queryClient.setQueryData<NotificationRow[]>(['customer-notifications', user.id], current =>
      (current || []).map(item => ({ ...item, read_at: item.read_at || now })),
    );
    void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
  };

  const openNotification = async (item: NotificationRow) => {
    try {
      if (!item.read_at) await markRead(item.id);
    } catch {
      // Navigation remains available even if marking as read temporarily fails.
    }
    navigate(item.order_id ? `/orders?order_id=${encodeURIComponent(item.order_id)}` : '/orders');
  };

  const enableDeviceNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setDevicePermission('unsupported');
      toast({ title: 'غير مدعوم على الجهاز', description: 'المتصفح الحالي لا يدعم إشعارات الجهاز.' });
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setDevicePermission(permission);
      if (permission === 'granted') {
        toast({ title: 'تم تفعيل إشعارات الجهاز', description: 'هتشوف تحديثات الطلب أثناء استخدام الموقع حتى لو التبويب مش ظاهر.' });
      } else {
        toast({ title: 'الإذن غير مفعّل', description: 'تقدر تفعّله لاحقًا من إعدادات المتصفح.' });
      }
    } catch {
      toast({ title: 'تعذر تفعيل الإشعارات', description: 'حاول من إعدادات المتصفح.', variant: 'destructive' });
    }
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
            <h1 className="text-2xl font-bold">إشعارات طلباتك في حسابك</h1>
            <p className="mb-6 mt-3 text-sm leading-7 text-gray-500">سجّل دخولك عشان تستقبل تحديثات الطلب والدفع وتفتح الطلب مباشرة.</p>
            <Button className="min-h-12 w-full rounded-xl" onClick={() => navigate('/phone-login')}>تسجيل الدخول</Button>
          </section>
        ) : (
          <div className="space-y-5">
            <section className="rounded-3xl border border-green-100 bg-green-50/70 p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary"><BellRing size={24} /><h1 className="text-2xl font-bold">تحديثات طلباتك</h1></div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">أي تغيير في حالة الطلب أو الدفع بيتسجل هنا فورًا، وتقدر تفتح الطلب من الإشعار.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {devicePermission !== 'granted' && devicePermission !== 'unsupported' && (
                    <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={enableDeviceNotifications}>
                      <BellRing size={16} className="ml-2" />تفعيل إشعارات الجهاز
                    </Button>
                  )}
                  {devicePermission === 'granted' && (
                    <span className="inline-flex min-h-11 items-center rounded-xl bg-white px-3 text-xs font-semibold text-green-700"><ShieldCheck size={16} className="ml-2" />إشعارات الجهاز مفعلة</span>
                  )}
                  {unreadCount > 0 && (
                    <Button variant="outline" className="min-h-11 rounded-xl bg-white" onClick={() => void markAllRead()}>
                      <CheckCheck size={16} className="ml-2" />تحديد الكل كمقروء
                    </Button>
                  )}
                </div>
              </div>

              {!notifications.isLoading && !notifications.isError && (
                <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">غير مقروء</p><p className="mt-1 text-2xl font-bold text-primary">{unreadCount}</p></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs text-gray-500">كل الإشعارات</p><p className="mt-1 text-2xl font-bold">{notifications.data?.length || 0}</p></div>
                </div>
              )}
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
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">تحديثات الطلب والدفع هتظهر هنا تلقائيًا.</p>
                <Button variant="outline" className="mt-5 rounded-xl" onClick={() => navigate('/orders')}>فتح طلباتي</Button>
              </section>
            ) : (
              <div className="space-y-3">
                {visible.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openNotification(item)}
                    className={`w-full rounded-2xl border p-4 text-right shadow-sm transition hover:border-green-200 sm:p-5 ${item.read_at ? 'border-gray-100 bg-white' : 'border-green-100 bg-green-50/50'}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.read_at ? 'bg-gray-50 text-gray-500' : 'bg-white text-primary shadow-sm'}`}>
                        {item.kind === 'payment_status' ? <CheckCheck size={21} /> : <Package size={21} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-sm sm:text-base">{item.title}</strong>
                          <span className="inline-flex items-center text-[11px] text-gray-500"><Clock3 size={13} className="ml-1" />{formatDate(item.created_at)}</span>
                        </span>
                        <span className="mt-1.5 block text-sm leading-6 text-gray-600">{item.body}</span>
                        {item.order_id && <span className="mt-2 block text-xs font-semibold text-primary">فتح تفاصيل الطلب</span>}
                      </span>
                      {!item.read_at && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-label="غير مقروء" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
