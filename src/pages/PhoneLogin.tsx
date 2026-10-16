import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import PasswordInput from '@/components/auth/PasswordInput';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BrandLoader from '@/components/ui/BrandLoader';
import { useUser } from '@/contexts/UserContext';
import { authErrorMessage, localPhoneDigits } from '@/utils/authUi';
import { loadOnboardingState, nextOnboardingPath, safeReturnTo } from '@/lib/onboarding';
import { customerPhoneIsRegistered } from '@/services/customerAuthRoute';

const DEFAULT_COUNTRY: Country = {
  name: 'مصر',
  code: 'EG',
  dialCode: '+20',
  flag: '🇪🇬',
};

const KNOWN_COUNTRIES: Country[] = [
  DEFAULT_COUNTRY,
  { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
];

type LoginStep = 'phone' | 'password';

export default function PhoneLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useUser();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnTo = safeReturnTo(params.get('returnTo'));
  const countryFromQuery = params.get('countryCode') || 'EG';

  const [country, setCountry] = useState<Country>(
    KNOWN_COUNTRIES.find(item => item.code === countryFromQuery) || DEFAULT_COUNTRY,
  );
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<LoginStep>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const localDigits = () => localPhoneDigits(phone, country.dialCode, country.code);

  const fullPhone = () => {
    const digits = localDigits();
    const dialCode = country.dialCode.replace(/\D/g, '');
    return `+${dialCode}${digits}`;
  };

  const validPhone = () => {
    const digits = localDigits();
    if (!digits) {
      setError('اكتب رقم الموبايل.');
      return false;
    }
    if (country.code === 'EG' && !(digits.startsWith('1') && digits.length === 10)) {
      setError('اكتب رقم موبايل مصري صحيح، مثل 01012345678.');
      return false;
    }
    return true;
  };

  const otpPath = (mode: 'signup' | 'recovery') => {
    const next = new URLSearchParams({
      phone: localDigits(),
      countryCode: country.code,
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
    <AuthLayout>
      <div className="mx-auto w-full max-w-md px-1 py-2" dir="rtl">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#e8f5ee] text-[#005931] shadow-sm">
            {step === 'phone' ? <Phone size={30} strokeWidth={2.2} /> : <KeyRound size={30} strokeWidth={2.2} />}
          </div>
          <h1 className="text-2xl font-black text-slate-950">
            {step === 'phone' ? 'أهلًا بيك في ســــــوبـرمــــاركو' : 'اكتب كلمة المرور'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {step === 'phone'
              ? 'ابدأ برقم موبايلك وهنكمل معاك تلقائيًا'
              : 'الحساب موجود، كمّل بكلمة المرور'}
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
          {step === 'phone' ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="phone" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Phone size={17} className="text-[#005931]" />
                  رقم الموبايل
                </label>
                <div className="flex min-h-14 items-stretch gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-[#005931] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005931]/10">
                  <CountryCodeSelector
                    value={country}
                    onChange={value => { setCountry(value); setError(''); }}
                    className="min-w-[86px] border-0 bg-transparent shadow-none"
                  />
                  <div className="my-2 w-px bg-slate-200" aria-hidden="true" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    disabled={busy}
                    onChange={event => { setPhone(event.target.value); setError(''); }}
                    onKeyDown={event => { if (event.key === 'Enter') void continueWithPhone(); }}
                    placeholder={country.code === 'EG' ? '010 1234 5678' : 'رقم الموبايل'}
                    className="h-auto flex-1 border-0 bg-transparent px-2 text-left text-base font-semibold shadow-none focus-visible:ring-0"
                    dir="ltr"
                    autoFocus
                  />
                </div>
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
                className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black shadow-[0_12px_28px_rgba(0,89,49,0.18)] hover:bg-[#004a29]"
              >
                {busy ? <><BrandLoader size="sm" className="ml-2" />جاري المتابعة</> : <>استمرار<ArrowRight size={18} className="mr-2 rotate-180" /></>}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f0faf5] px-4 py-3">
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
                  <label htmlFor="password" className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <KeyRound size={17} className="text-[#005931]" />
                    كلمة المرور
                  </label>
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
                  className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4 text-base focus-visible:border-[#005931] focus-visible:ring-[#005931]/10"
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
                className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black shadow-[0_12px_28px_rgba(0,89,49,0.18)] hover:bg-[#004a29]"
              >
                {busy ? <><BrandLoader size="sm" className="ml-2" />جاري تسجيل الدخول</> : 'دخول'}
              </Button>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#005931]" />
          <span>{step === 'phone' ? 'لو الرقم جديد هنبعت OTP لتأكيده مرة واحدة.' : 'نسيت الباسورد؟ هنأكد رقمك بـ OTP وتختار باسورد جديد.'}</span>
        </div>
      </div>
    </AuthLayout>
  );
}
