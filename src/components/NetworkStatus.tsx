import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function NetworkStatus() {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [restored, setRestored] = useState(false);
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const setDocumentState = (isOnline: boolean) => {
      document.documentElement.classList.toggle('is-offline', !isOnline);
      document.documentElement.dataset.network = isOnline ? 'online' : 'offline';
    };

    const goOffline = () => {
      setDocumentState(false);
      setRestored(false);
      setOnline(false);
    };

    const goOnline = () => {
      setDocumentState(true);
      setOnline(true);
      setRestored(true);
      void queryClient.resumePausedMutations();
      void queryClient.invalidateQueries({ type: 'active' });
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
      restoredTimer.current = setTimeout(() => setRestored(false), 3500);
    };

    setDocumentState(navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      if (restoredTimer.current) clearTimeout(restoredTimer.current);
    };
  }, [queryClient]);

  if (!online) return (
    <div className="network-status" role="status" dir="rtl">
      <WifiOff size={18} />
      <span><strong>أنت بدون إنترنت.</strong> تقدر تراجع المنتجات المحفوظة وتعدّل سلتك. الأسعار والتوفر هيتراجعوا قبل تأكيد الطلب بعد رجوع الاتصال.</span>
    </div>
  );
  if (!restored) return null;

  return (
    <div className="network-status network-status--restored" role="status" dir="rtl">
      <CheckCircle2 size={18} />
      <span><strong>رجع الاتصال.</strong> بنحدّث البيانات تلقائيًا.</span>
    </div>
  );
}

