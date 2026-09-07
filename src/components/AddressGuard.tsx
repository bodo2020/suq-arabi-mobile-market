import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BrandLoader from '@/components/ui/BrandLoader';
import { readGuestAddress } from '@/lib/deliveryAddress';
import { useUser } from '@/contexts/UserContext';

interface AddressGuardProps { children: React.ReactNode; }

const openPaths = [
  '/phone-login', '/phone-verify', '/register', '/forgot-password', '/update-password', '/change-phone',
  '/address', '/add-address', '/edit-address/', '/addresses', '/address-manager', '/address-registration',
];

const isOpenPath = (pathname: string) => openPaths.some(path => path.endsWith('/') ? pathname.startsWith(path) : pathname === path);

const AddressGuard: React.FC<AddressGuardProps> = ({ children }) => {
  const location = useLocation();
  const { user, authLoading } = useUser();
  const [checking, setChecking] = useState(true);
  const [hasAddress, setHasAddress] = useState(false);
  const open = useMemo(() => isOpenPath(location.pathname), [location.pathname]);

  useEffect(() => {
    let active = true;
    if (open) {
      setChecking(false);
      setHasAddress(true);
      return () => { active = false; };
    }
    if (authLoading) {
      setChecking(true);
      return () => { active = false; };
    }

    const check = async () => {
      setChecking(true);
      try {
        if (!user) {
          if (active) setHasAddress(Boolean(readGuestAddress()));
          return;
        }

        const client = supabase as any;
        const { data, error } = await client
          .from('customer_addresses')
          .select('id,assigned_branch_id,is_deliverable,latitude,longitude,is_default')
          .eq('user_id', user.id)
          .eq('is_deliverable', true)
          .not('assigned_branch_id', 'is', null)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('is_default', { ascending: false })
          .limit(1);
        if (error) throw error;
        if (active) setHasAddress(Boolean(data?.length));
      } catch (error) {
        console.error('Error checking delivery address:', error);
        if (active) setHasAddress(false);
      } finally {
        if (active) setChecking(false);
      }
    };

    void check();
    return () => { active = false; };
  }, [open, authLoading, user?.id, location.pathname]);

  if (open) return <>{children}</>;

  if (checking || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4" dir="rtl">
        <BrandLoader size="lg" label="بنراجع عنوان التوصيل" />
        <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={17} className="text-primary" />بنحدد فرع التوصيل المناسب لعنوانك</div>
      </div>
    );
  }

  if (!hasAddress) {
    const returnTo = `${location.pathname}${location.search}` || '/';
    return <Navigate to={`/add-address?required=1&returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
};

export default AddressGuard;
