import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { hasDeviceCache } from '@/lib/deviceQueryCache';

interface AddressGuardProps { children: React.ReactNode; }

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const hasCache = useMemo(() => hasDeviceCache(), []);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      // With the saved copy on screen, React Query refreshes it by itself on
      // reconnect; only the blocking screen needs a full reload.
      if (!hasCache) window.location.reload();
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [hasCache]);

  // Offline with a saved copy: the app works from it, with a quiet note.
  if (!online && hasCache) {
    return (
      <>
        {children}
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-[92px] z-[60] flex justify-center px-4 md:bottom-4"
          dir="rtl"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-3.5 py-2 text-xs font-bold text-white shadow-lg">
            <WifiOff size={14} aria-hidden="true" />
            من غير نت · بتتفرج على آخر نسخة محفوظة
          </span>
        </div>
      </>
    );
  }

  if (!online) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 flex items-center justify-center" dir="rtl">
        <section className="w-full max-w-sm rounded-[28px] border border-gray-100 bg-white px-6 py-8 text-center shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#005931]">
            <WifiOff size={30} />
          </span>
          <h1 className="mt-5 text-xl font-black text-gray-950">مفيش اتصال بالإنترنت</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">اتأكد من الواي فاي أو بيانات الموبايل وحاول تاني.</p>
          {hasCache && <p className="mt-3 text-xs leading-5 text-gray-400">بيانات المتجر المحفوظة موجودة وهتتحدّث أول ما الاتصال يرجع.</p>}
          <button
            type="button"
            onClick={() => {
              if (navigator.onLine) window.location.reload();
            }}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005931] px-4 text-sm font-bold text-white active:scale-[0.99]"
          >
            <RefreshCw size={17} />
            إعادة المحاولة
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
};

export default AddressGuard;
