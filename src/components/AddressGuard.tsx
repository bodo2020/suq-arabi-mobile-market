import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import BrandLoader from '@/components/ui/BrandLoader';
import { useBranch } from '@/contexts/BranchContext';
import { useUser } from '@/contexts/UserContext';

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
