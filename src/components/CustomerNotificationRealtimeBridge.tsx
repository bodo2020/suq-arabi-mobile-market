import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

const CustomerNotificationRealtimeBridge: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, session } = useUser();

  React.useEffect(() => {
    if (!user?.id || !session) return;

    const channel = supabase
      .channel(`customer-notification-signals:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_realtime_signals_v2',
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['purchase-history', user.id] });
          void queryClient.invalidateQueries({ queryKey: ['orders', user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, session, user?.id]);

  return null;
};

export default CustomerNotificationRealtimeBridge;
