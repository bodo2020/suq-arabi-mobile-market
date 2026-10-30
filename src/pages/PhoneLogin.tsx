import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import AuthHeading from '@/components/auth/AuthHeading';
import PasswordInput from '@/components/auth/PasswordInput';
import EgyptPhoneField from '@/components/auth/EgyptPhoneField';
import { Button } from '@/components/ui/button';
import { egyptianMobileDigits, egyptianMobileE164, egyptianPhoneStartError, isValidEgyptianMobile } from '@/utils/egyptPhone';
import BrandLoader from '@/components/ui/BrandLoader';
import { useUser } from '@/contexts/UserContext';
import { authErrorMessage } from '@/utils/authUi';
import { loadOnboardingState, nextOnboardingPath, safeReturnTo } from '@/lib/onboarding';
import { customerPhoneIsRegistered } from '@/services/customerAuthRoute';

type LoginStep = 'phone' | 'password';

export default function PhoneLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useUser();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnTo = safeReturnTo(params.get('returnTo'));

  const [phone, setPhone] = useState(params.get('phone') || '');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<LoginStep>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const localDigits = () => egyptianMobileDigits(phone);
  const fullPhone = () => egyptianMobileE164(phone);
  const validPhone = () => {
    if (!localDigits()) {
      setError('اكتب رقم الموبايل.');
      return false;
    }
    if (!isValidEgyptianMobile(phone)) {
      setError(egyptianPhoneStartError(phone) ? '' : 'اكتب رقم موبايل مصري صحيح، مثل 01012345678.');
      return false;
    }
    return true;
  };

  const otpPath = (mode: 'signup' | 'recovery') => {
    const next = new URLSearchParams({
      phone: localDigits(),
      countryCode: 'EG',
      returnTo,
      mode,
    });
    return `/phone-verify?${next.toString()}`;
  };

  const continueWithPhone = async () => {
    if (busy || !validPhone()) return;
    setBusy(true);
    setError('');
    try {
      const registered = await customerPhoneIsRegistered(fullPhone());
      if (registered) {
        setStep('password');
        return;
      }
      navigate(otpPath('signup'));
    } catch {
      setError('تعذر التأكد من الحساب دلوقتي. راجع الاتصال وحاول مرة تانية.');
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    if (busy || !validPhone()) return;
    if (!password) {
      setError('اكتب كلمة المرور.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { data, error: signInError } = await signIn(fullPhone(), password);
      if (signInError) throw signInError;
      const user = data?.user || data?.session?.user;
      if (!user?.id) throw new Error('Missing user');
      const state = await loadOnboardingState(user.id);
      navigate(nextOnboardingPath(state, returnTo), { replace: true });
    } catch (loginError: any) {
      setError(authErrorMessage(
        loginError,
        'تعذر تسجيل الدخول. راجع كلمة المرور وحاول مرة تانية.',
      ));
    } finally {
      setBusy(false);
    }
  };

  const changePhone = () => {
    setStep('phone');
    setPassword('');
    setError('');
  };

  return (
    <AuthLayout variant={step === 'phone' ? 'welcome' : 'flow'}>
      <div className="mx-auto w-full max-w-md" dir="rtl">
        {step === 'password' && <AuthHeading title="كلمة المرور" />}

        <div className={step === 'phone' ? 'auth-card auth-card--entry' : 'auth-card'}>
          {step === 'phone' ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="phone" className="mb-3 block text-sm font-bold text-[#174b35]">رقم موبايلك</label>
                <EgyptPhoneField
                  id="phone"
                  value={phone}
                  disabled={busy}
                  onChange={event => { setPhone(event.target.value); setError(''); }}
                  onKeyDown={event => { if (event.key === 'Enter') void continueWithPhone(); }}
                  aria-invalid={Boolean(error)}
                />
              </div>

              {error && (
                <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={() => void continueWithPhone()}
                disabled={busy}
                className="auth-primary-button"
              >
                {busy ? <><BrandLoader size="sm" className="ml-2" />جاري المتابعة</> : 'يلا نكمل'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfefe4] bg-[#f6fbf8] px-4 py-3">
                <div>
                  <p className="text-xs text-slate-500">رقم الموبايل</p>
                  <bdi dir="ltr" className="mt-1 block font-black text-[#005931]">{fullPhone()}</bdi>
                </div>
                <button type="button" onClick={changePhone} disabled={busy} className="min-h-9 px-2 text-xs font-bold text-[#005931]">
                  تغيير الرقم
                </button>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="text-sm font-bold text-[#174b35]">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => navigate(otpPath('recovery'))}
                    className="min-h-9 px-1 text-xs font-bold text-[#005931]"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  disabled={busy}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  onKeyDown={event => { if (event.key === 'Enter') void login(); }}
                  placeholder="اكتب كلمة المرور"
                  className="min-h-14 rounded-2xl border-[#cbdcd1] bg-white px-4 text-base focus-visible:border-[#005931] focus-visible:ring-[#005931]/10"
                  autoFocus
                />
              </div>

              {error && (
                <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="button"
                onClick={() => void login()}
                disabled={busy}
                className="auth-primary-button"
              >
                {busy ? <><BrandLoader size="sm" className="ml-2" />جاري تسجيل الدخول</> : 'دخول'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
