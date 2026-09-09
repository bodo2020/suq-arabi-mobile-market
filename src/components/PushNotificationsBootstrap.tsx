import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUser } from '@/contexts/UserContext';
import { initializeCustomerPushNotifications } from '@/services/pushNotifications';

export default function PushNotificationsBootstrap() {
  const { user, authLoading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user?.id) return;

    let disposed = false;
    let cleanup: (() => void | Promise<void>) | undefined;

    void initializeCustomerPushNotifications({
      onReceived: event => {
        if (disposed) return;
        toast(event.title || 'المعداوي ماركت', {
          description: event.body || undefined,
          action: event.actionUrl
            ? { label: 'فتح', onClick: () => navigate(event.actionUrl as string) }
            : undefined,
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
  }, [authLoading, navigate, user?.id]);

  return null;
}
