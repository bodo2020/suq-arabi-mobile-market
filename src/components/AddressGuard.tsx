import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { hasOfflineCatalogCache } from '@/lib/offlineCatalogCache';

interface AddressGuardProps { children: React.ReactNode; }

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [retryFailed, setRetryFailed] = useState(false);
  const hasCache = hasOfflineCatalogCache();

  useEffect(() => {
    const goOffline = () => { setOnline(false); setRetryFailed(false); };
    const goOnline = () => {
      setOnline(true);
      setRetryFailed(false);
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!online) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f1f8f3] px-5 py-10" dir="rtl">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#FFC120]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[#005931]/10 blur-3xl" />
        <section className="relative w-full max-w-sm rounded-[30px] border border-[#d8ebdf] bg-white px-6 py-8 text-center shadow-[0_18px_55px_rgba(0,89,49,0.09)]">
          <p className="text-base font-black text-[#005931]">ســــــوبـرمــــاركو</p>
          <span className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#005931] text-[#FFC120] shadow-[0_10px_24px_rgba(0,89,49,0.16)]">
            <WifiOff size={34} />
          </span>
          <h1 className="mt-6 text-2xl font-black text-[#005931]">مفيش اتصال بالإنترنت</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">اتأكد إن الواي فاي أو بيانات الموبايل شغالة، وبعدها جرّب تاني.</p>
          {hasCache && <p className="mt-4 rounded-xl bg-[#fff5d3] px-4 py-3 text-xs leading-6 text-[#005931]">بيانات المنتجات المحفوظة على جهازك هتتحدّث تلقائيًا لما الاتصال يرجع.</p>}
          {retryFailed && <p role="status" className="mt-3 text-xs font-semibold text-amber-800">لسه مفيش اتصال. راجع إعدادات الإنترنت وجرب مرة تانية.</p>}
          <button
            type="button"
            onClick={() => {
              if (navigator.onLine) { setOnline(true); setRetryFailed(false); }
              else setRetryFailed(true);
            }}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#005931] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(0,89,49,0.14)] active:scale-[0.99]"
          >
            <RefreshCw size={17} />
            إعادة المحاولة
          </button>
          <p className="mt-5 text-xs text-slate-400">هنرجعك لنفس الصفحة أول ما الاتصال يرجع.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
};

export default AddressGuard;
