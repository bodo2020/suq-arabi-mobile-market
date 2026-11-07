import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadMyAddresses, loadMyCustomer } from '@/lib/customerProfileCache';

/** The signed-in user's customer row id (cached; it never changes for a user). */
export function useMyCustomerId(userId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['my-customer-id', userId],
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      const customer = await loadMyCustomer(userId!);
      return customer?.id ?? null;
    },
  });
  return data ?? null;
}
