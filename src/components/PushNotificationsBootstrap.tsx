import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { initializeCustomerPushNotifications } from '@/services/pushNotifications';

export default function PushNotificationsBootstrap() {
  const { user, authLoading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let disposed = false;
    let cleanup: (() => void | Promise<void>) | undefined;

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
        console.warn('Push notification setup failed:', error);
      },
    }).then(fn => {
      cleanup = fn;
      if (disposed) void cleanup?.();
    }).catch(error => {
      console.warn('Unable to initialize push notifications:', error);
    });

    return () => {
      disposed = true;
      void cleanup?.();
    };
  }, [authLoading, navigate, toast, user?.id]);

  return null;
}
