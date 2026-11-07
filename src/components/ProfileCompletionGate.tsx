import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';
import { loadOnboardingState, nextOnboardingPath, RETURN_PATHS } from '@/lib/onboarding';

const authPaths = ['/register', '/phone-login', '/phone-verify', '/forgot-password', '/update-password', '/change-phone', '/add-address', '/address', '/address-registration'];

export default function ProfileCompletionGate() {
  const { user, authLoading } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const skip = !user || authLoading || authPaths.includes(location.pathname);
  const state = useQuery({
    queryKey: ['onboarding-state', user?.id],
    enabled: !skip,
    queryFn: () => loadOnboardingState(user!.id),
    // Name/default address rarely change; saving either refreshes this query.
    staleTime: 60_000,
  });
  useEffect(() => {
    if (skip || !state.isSuccess || state.isFetching || !state.data) return;
    if (state.data.hasName && state.data.hasDefaultAddress) return;
    const returnTo = RETURN_PATHS.includes(location.pathname) ? location.pathname : '/';
    navigate(nextOnboardingPath(state.data, returnTo), { replace: true });
  }, [skip, state.isSuccess, state.isFetching, state.data, location.pathname, navigate]);
  return null;
}
