import React, { useState } from 'react';
import { Bell, BellRing, CheckCheck, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import AccountHero from '@/components/account/AccountHero';
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
import { dayGroup, notificationMeta, notificationTarget, relativeTime } from '@/lib/notificationMeta';
import './notifications.css';

type Filter = 'all' | 'unread';

type Category = 'all' | 'orders' | 'marketing' | 'loyalty' | 'returns';
const CATEGORY_FILTERS: Array<{ key: Category; label: string }> = [
  { key: 'all', label: 'كل الأنواع' },
  { key: 'orders', label: 'الطلبات' },
  { key: 'marketing', label: 'العروض' },
  { key: 'loyalty', label: 'النقاط' },
  { key: 'returns', label: 'المرتجعات' },
];

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
  const [category, setCategory] = useState<Category>('all');

  const notifications = useQuery({
    queryKey: ['customer-notification-center-v2', user?.id, filter],
    enabled: !!user?.id && !!session && !authLoading,
    queryFn: () => fetchCustomerNotificationCenterV2(filter),
    staleTime: 8_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const allItems = notifications.data?.items || [];
  const unreadCount = notifications.data?.summary.unread || 0;
  const todayCount = notifications.data?.summary.today || 0;
  // Newest first, so the day groups read النهارده → أقدم.
  const items = (category === 'all' ? allItems : allItems.filter(item => item.category === category))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const countFor = (key: Category) => key === 'all' ? allItems.length : allItems.filter(item => item.category === key).length;
  const visibleFilters = CATEGORY_FILTERS.filter(entry => entry.key === 'all' || countFor(entry.key) > 0);
  const groups = items.reduce<Array<{ label: string; items: CustomerNotificationItemV2[] }>>((acc, item) => {
    const label = dayGroup(item.created_at);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(item);
    else acc.push({ label, items: [item] });
    return acc;
  }, []);

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

    const target = notificationTarget(item);
    if (target) navigate(target);
  };

  return (
    <MainLayout>
      <TopNavBar variant="title" hideLogo hideSearch hideCart pageTitle="الإشعارات" showBackButton />
      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {authLoading ? (
          <div className="flex min-h-64 items-center justify-center"><BrandLoader label="جاري تحميل الإشعارات" /></div>
        ) : !session || !user ? null : (
          <div className="space-y-4">
            <AccountHero
              icon={Bell}
              title="الإشعارات"
              subtitle={unreadCount > 0 ? `عندك ${unreadCount.toLocaleString('ar-EG')} إشعار جديد` : 'كله مقروء، مفيش حاجة فايتاك'}
              stats={notifications.data ? [
                { label: 'جديد', value: unreadCount.toLocaleString('ar-EG') },
                { label: 'النهارده', value: todayCount.toLocaleString('ar-EG') },
              ] : undefined}
              actions={unreadCount > 0 ? (
                <button type="button" className="acc-hero__btn acc-hero__btn--gold" onClick={() => void markAllRead()} disabled={markingAll}>
                  {markingAll ? <BrandLoader size="sm" /> : <CheckCheck size={15} />}
                  {markingAll ? 'جاري الحفظ' : 'علّم الكل كمقروء'}
                </button>
              ) : undefined}
            />

            <div className="acc-tabs grid-cols-2">
              <button type="button" onClick={() => setFilter('all')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'all' ? 'is-active' : ''}`}>الكل</button>
              <button type="button" onClick={() => setFilter('unread')} className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${filter === 'unread' ? 'is-active' : ''}`}>غير مقروء ({unreadCount.toLocaleString('ar-EG')})</button>
            </div>

            {allItems.length > 0 && visibleFilters.length > 1 && (
              <div className="nt-filters hide-scrollbar" role="tablist" aria-label="نوع الإشعار">
                {visibleFilters.map(entry => (
                  <button key={entry.key} type="button" role="tab" aria-selected={category === entry.key} onClick={() => setCategory(entry.key)} className={`nt-filter ${category === entry.key ? 'is-active' : ''}`}>
                    {entry.label}<small>{countFor(entry.key).toLocaleString('ar-EG')}</small>
                  </button>
                ))}
              </div>
            )}

            {notifications.isLoading ? (
              <div className="nt-list" role="status" aria-label="جاري تحميل الإشعارات">
                {[0, 1, 2, 3].map(index => <div key={index} className="nt-skeleton" />)}
              </div>
            ) : notifications.isError ? (
              <section role="alert" className="nt-empty">
                <h2>تعذر تحميل الإشعارات</h2>
                <p>راجع اتصالك وحاول مرة تانية.</p>
                <Button className="mt-5 rounded-xl" onClick={() => void notifications.refetch()}>إعادة المحاولة</Button>
              </section>
            ) : items.length === 0 ? (
              <section className="nt-empty">
                <span className="nt-empty__icon"><BellRing size={32} /></span>
                <h2>{filter === 'unread' ? 'مفيش إشعارات جديدة' : 'مفيش إشعارات هنا لسه'}</h2>
                <p>أول ما طلبك يتحرك أو يبقى في عرض جديد، هتلاقيه هنا على طول.</p>
              </section>
            ) : (
              <div>
                {groups.map(group => (
                  <section key={group.label} aria-label={group.label}>
                    <h2 className="nt-group">{group.label}</h2>
                    <div className="nt-list">
                      {group.items.map(item => {
                        const meta = notificationMeta(item.category, item.severity);
                        const Icon = meta.icon;
                        const target = notificationTarget(item);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void openNotification(item)}
                            className={`nt-card ${item.read_at ? 'is-read' : 'is-unread'}`}
                          >
                            <span className={`nt-icon nt-icon--${meta.tone}`}><Icon size={21} /></span>
                            <span className="nt-body">
                              <span className="nt-top">
                                <strong className="nt-title">{item.title}</strong>
                                <span className="nt-time">{relativeTime(item.created_at)}</span>
                              </span>
                              {item.body && <span className="nt-text">{item.body}</span>}
                              <span className="nt-foot">
                                <span className="nt-tag">{meta.label}</span>
                                {target && <span className="nt-action">{item.action_label || 'افتح'}<ChevronLeft size={14} /></span>}
                              </span>
                            </span>
                            {!item.read_at && <span className="nt-dot" aria-label="غير مقروء" />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
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
