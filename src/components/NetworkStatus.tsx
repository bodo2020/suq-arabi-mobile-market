import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { hasOfflineCatalogCache } from '@/lib/offlineCatalogCache';

export default function NetworkStatus() {
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [restored, setRestored] = useState(false);
  const [hasCache] = useState(() => hasOfflineCatalogCache());
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

  if (online && !restored) return null;

  if (restored) {
    return (
      <div className="network-status network-status--restored" role="status" dir="rtl">
        <CheckCircle2 size={18} />
        <span><strong>رجع الاتصال.</strong> بنحدّث البيانات تلقائيًا.</span>
      </div>
    );
  }

  return (
    <div className="network-status network-status--offline" role="status" dir="rtl">
      <div className="network-status__icon"><WifiOff size={19} /></div>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm">أنت بدون إنترنت</strong>
        <span className="block text-xs leading-5 opacity-90">
          {hasCache
            ? 'تقدر تتصفح آخر بيانات محفوظة وتعدّل سلتك. البيانات الحية وإتمام الطلب يرجعوا مع الاتصال.'
            : 'وصّل بالإنترنت لتحميل بيانات المتجر لأول مرة.'}
        </span>
      </div>
      <button
        type="button"
        className="network-status__retry"
        onClick={() => {
          if (navigator.onLine) {
            setOnline(true);
            void queryClient.invalidateQueries({ type: 'active' });
          }
        }}
        aria-label="إعادة التحقق من الاتصال"
      >
        {hasCache ? <RefreshCw size={17} /> : <CloudOff size={17} />}
      </button>
    </div>
  );
}
