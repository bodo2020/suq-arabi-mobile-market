import { Navigate, useLocation } from 'react-router-dom';
import { safeReturnTo } from '@/lib/onboarding';

// Passwordless customer journey: password login is retired.
// This route only forwards legacy links to the OTP screen.
export default function PhoneLogin() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = new URLSearchParams();
  next.set('returnTo', safeReturnTo(params.get('returnTo')));
  const phone = params.get('phone');
  const countryCode = params.get('countryCode');
  const mode = params.get('mode');
  if (phone) next.set('phone', phone);
  if (countryCode) next.set('countryCode', countryCode);
  if (mode === 'recovery') next.set('mode', 'recovery');
  return <Navigate to={`/phone-verify?${next.toString()}`} replace />;
}
