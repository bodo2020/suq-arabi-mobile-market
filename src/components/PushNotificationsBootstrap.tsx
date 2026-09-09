import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { fetchCustomerNotificationCenterV2 } from '@/services/notificationCenterV2';
import { initializeCustomerPushNotifications } from '@/services/pushNotifications';

export default function PushNotificationsBootstrap() {
  const { user, authLoading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (authLoading || !user?.id) return;

    const channel = supabase
      .channel(`customer-in-app-global:${user.id}`)
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
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });

              if (!item) return;
              toast({
                title: item.title || 'إشعار جديد من المعداوي ماركت',
                description: item.body || undefined,
              });
            } catch {
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-center-v2', user.id] });
              void queryClient.invalidateQueries({ queryKey: ['customer-notification-unread', user.id] });
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authLoading, queryClient, toast, user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let disposed = false;
    let cleanup: (() => void | Promise<void>) | undefined;

    // Push remains optional. This only attaches listeners/registers when the native app is already allowed.
    void initializeCustomerPushNotifications({
      onReceived: event => {
        if (disposed) return;
        toast({
          title: event.title || 'المعداوي ماركت',
          description: event.body || undefined,
        });
      },
      onAction: event => {
        if (disposed || !event.actionUrl) return;
        navigate(event.actionUrl);
      },
      onError: error => {
        const message = String((error as any)?.message || error || '');
        if (message.includes('PUSH_PERMISSION_DENIED')) return;
        console.warn('Optional push setup failed:', error);
      },
    }).then(fn => {
      cleanup = fn;
      if (disposed) void cleanup?.();
    }).catch(error => {
      console.warn('Optional push is not available:', error);
    });

    return () => {
      disposed = true;
      void cleanup?.();
    };
  }, [authLoading, navigate, toast, user?.id]);

  return null;
}
