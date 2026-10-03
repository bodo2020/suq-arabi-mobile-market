import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import BrandLoader from '@/components/ui/BrandLoader';
import { useUser } from '@/contexts/UserContext';

import { isPublicCustomerPath } from '@/lib/customerRoutes';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, session, authLoading } = useUser();
  const publicPath = useMemo(() => isPublicCustomerPath(location.pathname), [location.pathname]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <BrandLoader size="lg" label="جاري التأكد من حسابك" />
      </main>
    );
  }

  if (publicPath) return <>{children}</>;

  if (!user || !session) {
    const returnTo = `${location.pathname}${location.search}` || '/';
    return <Navigate to={`/phone-login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}

