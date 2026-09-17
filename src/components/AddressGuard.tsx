import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MapPin, RefreshCw, WifiOff } from 'lucide-react';
import BrandLoader from '@/components/ui/BrandLoader';
import { useBranch } from '@/contexts/BranchContext';
import { useUser } from '@/contexts/UserContext';
import { hasOfflineCatalogCache } from '@/lib/offlineCatalogCache';

interface AddressGuardProps { children: React.ReactNode; }

const openPaths = [
  '/phone-login', '/phone-verify', '/register', '/forgot-password', '/update-password', '/change-phone',
  '/address', '/add-address', '/edit-address/', '/addresses', '/address-manager', '/address-registration',
];

const isOpenPath = (pathname: string) => openPaths.some(path => path.endsWith('/') ? pathname.startsWith(path) : pathname === path);

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const location = useLocation();
  const { authLoading } = useUser();
  const { branch, branchLoading } = useBranch();
  const open = useMemo(() => isOpenPath(location.pathname), [location.pathname]);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const hasCache = useMemo(() => hasOfflineCatalogCache(), []);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => {
      setOnline(true);
      window.location.reload();
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

  if (open) return <>{children}</>;

  if (branchLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4" dir="rtl">
        <BrandLoader size="lg" label="بنجهز فرع التوصيل" />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin size={17} className="text-primary" />
          بنحدد المخزون والأسعار المناسبة لعنوانك
        </div>
      </div>
    );
  }

  if (!branch) {
    const returnTo = `${location.pathname}${location.search}` || '/';
    return <Navigate to={`/add-address?required=1&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
};

export default AddressGuard;
