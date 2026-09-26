import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Check, Phone, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { authErrorMessage, localPhoneDigits, normalizeDigits } from '@/utils/authUi';
import { safeReturnTo } from '@/lib/onboarding';
import { customerPhoneIsRegistered } from '@/services/customerAuthRoute';
import { shouldRouteRegisteredPhone } from '@/utils/otpRequest';

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

export default function PhoneVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signInWithPhone, verifyPhone } = useUser();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';
  const mode = queryParams.get('mode') === 'recovery' ? 'recovery' : 'signup';
  const isRecovery = mode === 'recovery';
  const returnTo = safeReturnTo(queryParams.get('returnTo'));

  const [phone, setPhone] = useState(phoneFromQuery);
  const [step, setStep] = useState<'phone' | 'verification'>(phoneFromQuery ? 'verification' : 'phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isTestOtp, setIsTestOtp] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>(
    KNOWN_COUNTRIES.find(country => country.code === countryCodeFromQuery) || DEFAULT_COUNTRY,
  );
  const [errors, setErrors] = useState({ phone: '', code: '' });
  const [initialSendDone, setInitialSendDone] = useState(false);
  const sendInFlight = useRef(false);
  const initialStarted = useRef(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds(seconds => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const formatPhoneNumber = (value: string, country: Country) => {
    const digits = localPhoneDigits(value, country.dialCode, country.code);
    return country.code === 'EG' && digits.startsWith('0') ? digits.slice(1) : digits;
  };

  const formatInternationalPhone = (value: string, country: Country) => {
    const digits = formatPhoneNumber(value, country);
    return `+${country.dialCode.replace(/\D/g, '')}${digits}`;
  };

  const validatePhone = () => {
    const digits = formatPhoneNumber(phone, countryCode);
    if (!digits) {
      setErrors(prev => ({ ...prev, phone: 'اكتب رقم الموبايل.' }));
      return false;
    }
    if (countryCode.code !== 'EG' || !/^1[0125]\d{8}$/.test(digits)) {
      setErrors(prev => ({ ...prev, phone: 'اكتب رقم موبايل مصري صحيح، مثل 01012345678.' }));
      return false;
    }
    return true;
  };

  const sendOtp = async (isResend = false) => {
    if (sendInFlight.current || loading || resendLoading || (isResend && resendSeconds > 0)) return;
    if (!validatePhone()) return;
    const fullPhone = formatInternationalPhone(phone, countryCode);
    const cooldownKey = `otp-cooldown:${fullPhone}`;
    try {
      const remaining = Math.ceil((Number(sessionStorage.getItem(cooldownKey) || 0) - Date.now()) / 1000);
      if (remaining > 0) { setResendSeconds(remaining); return; }
    } catch { /* Browser storage may be unavailable; server remains authoritative. */ }
    sendInFlight.current = true;

    const setBusy = isResend ? setResendLoading : setLoading;
    setBusy(true);
    setRateLimitError(false);
    try {
      if (shouldRouteRegisteredPhone(isRecovery, isResend)) {
        const registered = await customerPhoneIsRegistered(fullPhone);
        if (registered) {
          setInitialSendDone(true);
          const next = new URLSearchParams({
            phone: formatPhoneNumber(phone, countryCode),
            countryCode: countryCode.code,
            returnTo,
          });
          navigate(`/phone-login?${next.toString()}`, { replace: true });
          return;
        }
      }

      const { data, error } = await signInWithPhone(fullPhone, !isRecovery);
      if (error) throw error;

      const testOtp = Boolean(data?.testOtp);
      setIsTestOtp(testOtp);
      setStep('verification');
      setCode('');
      setResendSeconds(60);
      try { sessionStorage.setItem(cooldownKey, String(Date.now() + 60_000)); } catch { /* server cooldown still applies */ }
      setInitialSendDone(true);
      toast({
        title: isResend ? 'تم إعادة إرسال الرمز' : 'تم إرسال رمز التحقق',
        description: testOtp ? 'استخدم رمز الاختبار المخصص لإكمال التحقق.' : 'أدخل الرمز المكون من 6 أرقام.',
      });
    } catch (error: any) {
      const rateLimited = error?.status === 429 || error?.code === 'over_sms_send_rate_limit';
      if (rateLimited) setRateLimitError(true);
      if (rateLimited) setResendSeconds(60);
      toast({
        title: rateLimited ? 'تم تجاوز الحد المسموح' : 'تعذر إرسال الرمز',
        description: rateLimited
          ? 'انتظر قليلًا قبل طلب رمز جديد.'
          : authErrorMessage(error, isRecovery
            ? 'تعذر إرسال رمز الاستعادة. تأكد من الرقم وحاول مرة أخرى.'
            : 'تعذر إرسال رمز إنشاء الحساب. حاول مرة أخرى.'),
        variant: 'destructive',
      });
    } finally {
      sendInFlight.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!phoneFromQuery || initialSendDone || initialStarted.current) return;
    initialStarted.current = true;
    void sendOtp(false);
    // Send exactly once when arriving from login with a prefilled phone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    if (loading || resendLoading) return;
    if (!/^\d{6}$/.test(code)) {
      setErrors(prev => ({ ...prev, code: 'اكتب الرمز المكون من 6 أرقام.' }));
      return;
    }

    setLoading(true);
    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { data, error } = await verifyPhone(fullPhone, code);
      if (error) throw error;
      const verifiedUser = data?.user;
      if (!verifiedUser?.id) throw new Error('تعذر إنشاء جلسة بعد التحقق');

      if (isRecovery) {
        navigate('/update-password?source=phone', { replace: true });
        return;
      }

      navigate(`/register?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
    } catch (error: any) {
      toast({
        title: 'تعذر التحقق',
        description: authErrorMessage(error, 'راجع الرمز وحاول مرة أخرى.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md px-1 py-2" dir="rtl">
        <div className="mb-6 flex items-center">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600" aria-label="الرجوع">
            <ArrowRight size={22} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-black text-slate-950">{isRecovery ? 'استعادة كلمة المرور' : 'تأكيد رقم الموبايل'}</h1>
            <p className="mt-1 text-xs text-slate-500">{isRecovery ? 'OTP لمرة واحدة لتعيين باسورد جديد' : 'OTP لمرة واحدة لإنشاء الحساب'}</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
          {step === 'phone' ? (
            <div className="space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5ee] text-[#005931]">
                <Phone size={26} />
              </div>
              <p className="text-center text-sm leading-6 text-slate-500">
                {isRecovery ? 'اكتب رقم حسابك وهنبعتلك رمز لاستعادة كلمة المرور.' : 'اكتب رقمك وهتبعتلك رسالة واحدة لتأكيد إنشاء الحساب.'}
              </p>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-bold text-slate-800">رقم الموبايل</label>
                <div className="flex min-h-14 items-stretch gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-[#005931] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005931]/10">
                  <CountryCodeSelector
                    value={countryCode}
                    onChange={country => { setCountryCode(country); setErrors({ phone: '', code: '' }); }}
                    className="min-w-[86px] border-0 bg-transparent shadow-none"
                  />
                  <div className="my-2 w-px bg-slate-200" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phone}
                    disabled={loading}
                    onChange={event => { setPhone(event.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
                    onKeyDown={event => { if (event.key === 'Enter') void sendOtp(false); }}
                    placeholder={countryCode.code === 'EG' ? '010 1234 5678' : 'رقم الموبايل'}
                    className="h-auto flex-1 border-0 bg-transparent px-2 text-left text-base font-semibold shadow-none focus-visible:ring-0"
                    dir="ltr"
                  />
                </div>
                {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone}</p>}
                {rateLimitError && <p className="mt-2 text-sm text-amber-700">تم طلب رموز كثيرة. انتظر قليلًا قبل المحاولة مرة أخرى.</p>}
              </div>

              <Button onClick={() => void sendOtp(false)} disabled={loading} className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black">
                {loading ? <><BrandLoader size="sm" className="ml-2" />جاري إرسال الرمز</> : 'إرسال رمز التحقق'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5ee] text-[#005931]">
                <ShieldCheck size={27} />
              </div>
              <p className="text-center text-sm leading-6 text-slate-500">
                {isTestOtp ? 'أدخل رمز الاختبار' : 'أدخل الرمز المرسل إلى'}
                <br />
                <bdi dir="ltr" className="font-black text-slate-800">{formatInternationalPhone(phone, countryCode)}</bdi>
              </p>

              <div>
                <div className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-800"><Check size={17} className="text-[#005931]" />رمز التحقق</div>
                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    aria-label="رمز التحقق المكون من 6 أرقام"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={loading || resendLoading}
                    maxLength={6}
                    value={code}
                    onChange={value => { setCode(normalizeDigits(value).replace(/\D/g, '')); setErrors(prev => ({ ...prev, code: '' })); }}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map(index => <InputOTPSlot key={index} index={index} />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.code && <p className="mt-3 text-center text-sm text-red-600">{errors.code}</p>}
              </div>

              <Button onClick={() => void verify()} disabled={loading || code.length !== 6} className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black">
                {loading ? <><BrandLoader size="sm" className="ml-2" />جاري التحقق</> : 'تأكيد الرمز'}
              </Button>

              <div className="space-y-2 text-center text-sm">
                <button type="button" onClick={() => void sendOtp(true)} disabled={loading || resendLoading || resendSeconds > 0} className="min-h-10 font-bold text-[#005931] disabled:opacity-50">
                  {resendLoading ? 'جاري إعادة الإرسال...' : resendSeconds > 0 ? `إعادة الإرسال بعد ${resendSeconds} ثانية` : 'إعادة إرسال الرمز'}
                </button>
                <div>
                  <button type="button" onClick={() => { setStep('phone'); setCode(''); setInitialSendDone(true); }} className="min-h-10 text-slate-500">تغيير رقم الموبايل</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
