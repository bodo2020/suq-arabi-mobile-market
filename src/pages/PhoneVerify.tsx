import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowRight, Check } from 'lucide-react';
import MainLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { authErrorMessage, localPhoneDigits, normalizeDigits } from '@/utils/authUi';
import { loadOnboardingState, nextOnboardingPath, safeReturnTo } from '@/lib/onboarding';

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

const PhoneVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signInWithPhone, verifyPhone } = useUser();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';
  const isRecovery = queryParams.get('mode') === 'recovery';
  const returnTo = safeReturnTo(queryParams.get('returnTo'));

  const [phone, setPhone] = useState(phoneFromQuery);
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isTestOtp, setIsTestOtp] = useState(false);
  const [countryCode, setCountryCode] = useState<Country>(
    KNOWN_COUNTRIES.find((country) => country.code === countryCodeFromQuery) || DEFAULT_COUNTRY
  );
  const [errors, setErrors] = useState({ phone: '', code: '' });

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    const digits = localPhoneDigits(phoneNumber, country.dialCode, country.code);
    if (country.code === 'EG' && digits.length > 0) {
      return digits.startsWith('0') ? digits.substring(1) : digits;
    }
    return digits;
  };

  const formatInternationalPhone = (phoneNumber: string, country: Country) => {
    const formattedNumber = formatPhoneNumber(phoneNumber, country);
    const dialCode = country.dialCode.replace(/\D/g, '');
    return `+${dialCode}${formattedNumber}`;
  };

  const validateEgyptianPhone = (value: string) => value.startsWith('1') && value.length === 10;

  const validatePhone = () => {
    const cleanPhone = formatPhoneNumber(phone, countryCode);
    if (!cleanPhone) {
      setErrors((prev) => ({ ...prev, phone: 'يرجى إدخال رقم هاتف' }));
      return false;
    }

    if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
      setErrors((prev) => ({
        ...prev,
        phone: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 (10 أرقام)',
      }));
      return false;
    }

    return true;
  };

  const sendOtp = async (isResend = false) => {
    if (loading || resendLoading || resendSeconds > 0) return;
    if (!validatePhone()) return;

    const setBusy = isResend ? setResendLoading : setLoading;
    setBusy(true);
    setRateLimitError(false);

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { data, error } = await signInWithPhone(fullPhone, !isRecovery);
      if (error) throw error;

      const testOtp = Boolean(data?.testOtp);
      setIsTestOtp(testOtp);
      setStep('verification');
      setCode('');
      setResendSeconds(60);
      toast(testOtp
        ? {
            title: 'رقم الاختبار جاهز',
            description: 'استخدم رمز الاختبار المخصص لإكمال تسجيل الدخول.',
          }
        : {
            title: isResend ? 'تم إعادة إرسال رمز التحقق' : 'تم إرسال رمز التحقق',
            description: 'تم إرسال رمز مكون من 6 أرقام إلى هاتفك',
          });
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.code === 'over_sms_send_rate_limit';
      if (isRateLimited) setRateLimitError(true);

      toast({
        title: isRateLimited ? 'تم تجاوز الحد المسموح' : 'تعذر إرسال الرمز',
        description: isRateLimited
          ? 'يرجى الانتظار قليلاً قبل طلب رمز جديد.'
          : authErrorMessage(error, 'خدمة إرسال الرسائل غير متاحة حاليًا. حاول مرة أخرى بعد قليل.'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (loading || resendLoading) return;
    if (!/^\d{6}$/.test(code)) {
      setErrors((prev) => ({ ...prev, code: 'يرجى إدخال الرمز المكون من 6 أرقام' }));
      return;
    }

    setLoading(true);

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { data, error } = await verifyPhone(fullPhone, code);
      if (error) throw error;

      const verifiedUser = data?.user;
      if (!verifiedUser?.id) {
        throw new Error('تعذر إنشاء جلسة دخول بعد التحقق من الرقم');
      }

      toast({
        title: 'تم التحقق بنجاح',
        description: 'تم التحقق من رقم هاتفك بنجاح',
      });

      if (isRecovery) {
        navigate('/update-password?source=phone', { replace: true });
        return;
      }

      const state = await loadOnboardingState(verifiedUser.id);
      navigate(nextOnboardingPath(state, returnTo), { replace: true });
    } catch (error: any) {
      toast({
        title: 'تعذر التحقق',
        description: authErrorMessage(error, 'تعذر إكمال الدخول. راجع الرمز والاتصال ثم حاول مرة أخرى.'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {isRecovery ? 'استعادة الحساب' : step === 'phone' ? 'أهلًا بيك في المعداوي' : 'تأكيد رقمك'}
          </h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          {step === 'phone' ? (
            <>
              <p className="text-center mb-6">
                {isRecovery
                  ? 'سنرسل رمز تحقق إلى رقم الهاتف المسجل على حسابك'
                  : 'سيتم إرسال رمز تحقق في رسالة SMS إلى هاتفك'}
              </p>

              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>

                <div className="flex gap-2 items-center">
                  <CountryCodeSelector
                    value={countryCode}
                    onChange={(country) => {
                      setCountryCode(country);
                      setIsTestOtp(false);
                    }}
                    className="min-w-[80px]"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel-national"
                    inputMode="tel"
                    disabled={loading}
                    aria-invalid={Boolean(errors.phone)}
                    onKeyDown={(event) => { if (event.key === 'Enter') void sendOtp(false); }}
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setErrors((prev) => ({ ...prev, phone: '' }));
                      setRateLimitError(false);
                      setIsTestOtp(false);
                    }}
                    className="text-right ltr flex-1"
                    placeholder={countryCode.code === 'EG' ? '1xxxxxxxxx' : 'xxx-xxxx-xxx'}
                    dir="ltr"
                  />
                </div>

                <p className="text-xs text-gray-500 mt-1 text-right">
                  {countryCode.code === 'EG'
                    ? 'اكتب رقمك مثل 01012345678، أو الصقه مع كود الدولة +20.'
                    : 'أدخل رقم الهاتف بدون رمز الدولة'}
                </p>

                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                {rateLimitError && (
                  <p className="text-amber-600 text-sm mt-1">
                    تم طلب رموز كثيرة. انتظر قليلاً قبل المحاولة مرة أخرى.
                  </p>
                )}
              </div>

              <Button onClick={() => void sendOtp(false)} disabled={loading || resendSeconds > 0} className="w-full">
                {loading && <BrandLoader size="sm" className="ml-2" />}
                {loading ? 'جاري إرسال الرمز...' : resendSeconds > 0 ? `حاول بعد ${resendSeconds} ثانية` : 'إرسال رمز التحقق'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-center mb-6">
                {isTestOtp ? 'أدخل رمز الاختبار المخصص للرقم' : 'أدخل الرمز المرسل إلى'}
                <br />
                <span className="font-bold" dir="ltr">{formatInternationalPhone(phone, countryCode)}</span>
              </p>

              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <Check size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="code" className="font-medium">رمز التحقق</label>
                </div>
                <div className="flex justify-center mb-4">
                  <InputOTP
                    id="code"
                    aria-label="رمز التحقق المكون من 6 أرقام"
                    aria-invalid={Boolean(errors.code)}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    disabled={loading || resendLoading}
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(normalizeDigits(value).replace(/\D/g, ''));
                      setErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    dir="ltr"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.code && <p className="text-red-500 text-sm text-center">{errors.code}</p>}
              </div>

              <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6} className="w-full">
                {loading && <BrandLoader size="sm" className="ml-2" />}
                التحقق من الرمز
              </Button>

              <div className="mt-4 text-center space-y-3">
                <button
                  onClick={() => void sendOtp(true)}
                  className="text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || resendLoading || resendSeconds > 0}
                  type="button"
                >
                  {resendLoading
                    ? 'جاري إعادة الإرسال...'
                    : resendSeconds > 0
                      ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
                      : isTestOtp ? 'إعادة تهيئة رمز الاختبار' : 'إعادة إرسال الرمز'}
                </button>

                <div>
                  <button
                    disabled={loading || resendLoading}
                    onClick={() => {
                      setStep('phone');
                      setCode('');
                      setIsTestOtp(false);
                      setErrors({ phone: '', code: '' });
                    }}
                    className="text-primary text-sm"
                    type="button"
                  >
                    تغيير رقم الهاتف
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneVerify;
