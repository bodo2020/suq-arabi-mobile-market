import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import {
  fetchCustomerNotificationCenterV2,
  type CustomerNotificationItemV2,
} from '@/services/notificationCenterV2';

const CustomerNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { toast } = useToast();

  const unread = useQuery({
    queryKey: ['customer-notification-unread', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchCustomerNotificationCenterV2('unread'),
    staleTime: 8_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`customer-notification-v2:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_realtime_signals_v2',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        payload => {
          const signal = payload.new as { notification_id?: string; audience?: string };
          if (signal.audience && signal.audience !== 'customer') return;

          void (async () => {
            try {
              const center = await fetchCustomerNotificationCenterV2('all');
              const item = center.items.find(entry => entry.id === signal.notification_id);

              void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });

              if (item) {
                toast({
                  title: item.title || 'إشعار جديد',
                  description: item.body || undefined,
                });
              }
            } catch {
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [navigate, queryClient, toast, user?.id]);

  if (!user) return null;

  const count = unread.data?.summary.unread || 0;
  const latest: CustomerNotificationItemV2 | undefined = unread.data?.items?.[0];

  return (
    <button
      type="button"
      onClick={() => navigate('/notifications')}
      title={latest?.title || 'الإشعارات'}
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
