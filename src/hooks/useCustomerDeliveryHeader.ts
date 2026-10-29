import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { readGuestAddress } from '@/lib/deliveryAddress';

/**
 * Share one delivery-location source for the home and main categories headers.
 * Guest addresses update immediately when the address picker saves a location.
 * Signed-in addresses are read through the same React Query cache key.
 */
export function useCustomerDeliveryHeader(returnTo: '/' | '/categories' = '/') {
  const navigate = useNavigate();
  const { user, authLoading } = useUser();
  const [guestAddress, setGuestAddress] = useState(() => readGuestAddress());

  useEffect(() => {
    const refresh = () => setGuestAddress(readGuestAddress());
    window.addEventListener('guest-address-changed', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('delivery-address-changed', refresh);
    return () => {
      window.removeEventListener('guest-address-changed', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('delivery-address-changed', refresh);
    };
  }, []);

  const addressQuery = useQuery({
    queryKey: ['home-default-address', user?.id],
    enabled: Boolean(user) && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('address,latitude,longitude')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const address = user ? addressQuery.data?.address || '' : guestAddress?.address || '';
  const addressLoading = authLoading || Boolean(user && addressQuery.isLoading);
  const addressError = Boolean(user && addressQuery.isError);
  const addressLabel = addressError ? 'تعذّر تحميل العنوان — اضغط للمراجعة' : address;

  const openAddress = () => {
    if (!user && !guestAddress) {
      navigate(`/add-address?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      navigate('/address-manager');
    }
  };

  return {
    address,
    addressLabel,
    addressLoading,
    addressError,
    deliveryEstimateMinutes: user ? null : guestAddress?.estimated_time ?? null,
    openAddress,
  };
}
