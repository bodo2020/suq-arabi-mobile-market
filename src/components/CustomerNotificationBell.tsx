import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  order_id: string | null;
  read_at: string | null;
};

const notificationsTable = () => (supabase as any).from('customer_notifications');

const CustomerNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();

  const unread = useQuery({
    queryKey: ['customer-notification-unread', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count, error } = await notificationsTable()
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('read_at', null);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`customer-notification-bell:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'customer_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        payload => {
          const row = payload.new as NotificationRow;
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['customer-notifications', user.id] });

          toast({ title: row.title, description: row.body });

          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            const browserNotification = new Notification(row.title, {
              body: row.body,
              icon: '/elmadawy-logo.png',
              tag: row.order_id ? `order-${row.order_id}` : row.id,
            });
            browserNotification.onclick = () => {
              window.focus();
              navigate(row.order_id ? `/orders?order_id=${encodeURIComponent(row.order_id)}` : '/notifications');
              browserNotification.close();
            };
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['customer-notifications', user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast, navigate]);

  if (!user) return null;

  const count = unread.data || 0;

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      aria-label={count ? `الإشعارات، ${count} غير مقروء` : 'الإشعارات'}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#005931] transition hover:bg-green-50 active:scale-95"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -left-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
};

export default React.memo(CustomerNotificationBell);
