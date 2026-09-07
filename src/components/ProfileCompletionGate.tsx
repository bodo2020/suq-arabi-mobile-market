import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

const authPaths = ['/register', '/phone-login', '/phone-verify', '/forgot-password', '/update-password', '/change-phone'];
const returnPaths = ['/cart', '/payment', '/addresses', '/add-address', '/account'];
export default function ProfileCompletionGate() {
  const { user, authLoading } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useQuery({
    queryKey: ['profile-completion', user?.id],
    enabled: !!user && !authLoading && !authPaths.includes(location.pathname),
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('name').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
  useEffect(() => {
    if (!user || authLoading || authPaths.includes(location.pathname) || !profile.isSuccess || profile.isFetching) return;
    if ((profile.data?.name?.trim().length || 0) < 2) {
      const returnTo = returnPaths.includes(location.pathname) ? location.pathname : '/';
      navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    }
  }, [user?.id, authLoading, profile.isSuccess, profile.isFetching, profile.data, location.pathname, navigate]);
  return null;
}
