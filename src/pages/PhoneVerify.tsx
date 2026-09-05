import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLoader from '@/components/ui/BrandLoader';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { supabase } from '@/lib/supabase';

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

  const [phone, setPhone] = useState(phoneFromQuery);
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [countryCode, setCountryCode] = useState<Country>(
    KNOWN_COUNTRIES.find((country) => country.code === countryCodeFromQuery) || DEFAULT_COUNTRY
  );
  const [errors, setErrors] = useState({ phone: '', code: '' });

  const resetToPhoneStep = () => {
    setStep('phone');
    setCode('');
    setResendSeconds(0);
    setRateLimitError(false);
    setErrors({ phone: '', code: '' });
  };

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const formatPhoneNumber = (phoneNumber: string, country: Country) => {
    const digits = phoneNumber.replace(/\D/g, '');
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
    if (!validatePhone()) return;

    const setBusy = isResend ? setResendLoading : setLoading;
    setBusy(true);
    setRateLimitError(false);

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { error } = await signInWithPhone(fullPhone, !isRecovery);
      if (error) throw error;

      setStep('verification');
      setCode('');
      setResendSeconds(60);
      toast({
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
          : error?.message || 'تأكد من رقم الهاتف وحاول مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
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

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', verifiedUser.id)
        .maybeSingle();

      if (customerError) {
        console.error('Error checking customer profile after OTP:', customerError);
      }

      if (customer) {
        navigate('/account', { replace: true });
      } else {
        navigate(
          `/register?phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode.code)}&verified=true`,
          { replace: true }
        );
      }
    } catch (error: any) {
      toast({
        title: 'تعذر التحقق',
        description: error?.message || 'الرمز غير صحيح أو منتهي الصلاحية',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = errors.phone || errors.code || (rateLimitError
    ? 'تم طلب رموز كثيرة. انتظر قليلاً قبل المحاولة مرة أخرى.'
    : '');

  return (
    <main className="relative min-h-screen overflow-hidden bg-secondary/60 px-4 py-6 sm:px-6 sm:py-10" dir="rtl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-primary" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center sm:min-h-[calc(100vh-5rem)]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute right-0 top-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label="الرجوع"
        >
          <ArrowRight size={22} />
        </Button>

        <section className="animate-scale-in overflow-hidden rounded-lg border border-border bg-card shadow-xl shadow-primary/10">
          <div className="flex min-h-36 items-center justify-center bg-background px-8 py-5">
            <img
              src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png"
              alt="ماركت المعداوي"
              className="h-24 w-full max-w-56 object-contain sm:h-28"
              width={224}
              height={112}
              decoding="async"
            />
          </div>

          <div className="space-y-6 border-t-4 border-primary px-5 py-7 sm:px-8 sm:py-8">
            <header className="space-y-2 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck size={23} />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {isRecovery ? 'تأكيد رقم الموبايل' : 'التحقق من رقم الهاتف'}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {step === 'phone'
                  ? isRecovery
                    ? 'أدخل رقم الهاتف المسجل لنرسل لك كود استعادة آمن.'
                    : 'أدخل رقم الموبايل لنرسل لك كود التحقق في رسالة SMS.'
                  : 'أدخل الكود المكوّن من 6 أرقام الذي أرسلناه إلى رقمك.'}
              </p>
            </header>

            {step === 'phone' ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="phone" className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Phone size={17} className="text-primary" />
                    رقم الموبايل
                  </label>
                  <div className="flex items-stretch gap-2">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={setCountryCode}
                      className="min-w-[88px]"
                    />
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        setErrors((prev) => ({ ...prev, phone: '' }));
                        setRateLimitError(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void sendOtp(false);
                      }}
                      className="h-12 flex-1 text-center text-base focus-visible:ring-primary"
                      placeholder={countryCode.code === 'EG' ? '1xxxxxxxxx' : 'رقم الموبايل'}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {countryCode.code === 'EG'
                      ? 'اكتب الرقم المصري بدون الصفر في البداية.'
                      : 'اكتب الرقم بدون رمز الدولة.'}
                  </p>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button onClick={() => void sendOtp(false)} disabled={loading} size="lg" className="h-12 w-full text-base">
                  {loading ? <BrandLoader text="جاري إرسال الكود..." className="text-primary-foreground [&_span]:text-primary-foreground" /> : 'إرسال كود التحقق'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2 rounded-md bg-secondary px-3 py-2.5 text-sm">
                  <span className="font-semibold text-foreground" dir="ltr">{formatInternationalPhone(phone, countryCode)}</span>
                  <Button type="button" variant="link" onClick={resetToPhoneStep} className="h-auto p-0 text-sm">
                    تغيير الرقم
                  </Button>
                </div>

                <div className="space-y-3">
                  <label className="block text-center text-sm font-semibold text-foreground">كود التحقق</label>
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value.replace(/\D/g, ''));
                      setErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && code.length === 6) void handleVerifyCode();
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    dir="ltr"
                    containerClassName="w-full justify-center"
                    aria-label="كود التحقق المكون من 6 أرقام"
                  >
                    <InputOTPGroup className="gap-2 sm:gap-3">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-12 w-10 rounded-md border bg-background text-lg font-bold first:rounded-md first:border last:rounded-md sm:h-14 sm:w-12 data-[active=true]:border-primary"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6} size="lg" className="h-12 w-full text-base">
                  {loading ? <BrandLoader text="جاري التحقق..." className="text-primary-foreground [&_span]:text-primary-foreground" /> : 'تأكيد الكود'}
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  {resendLoading ? (
                    <BrandLoader text="جاري إعادة الإرسال..." />
                  ) : resendSeconds > 0 ? (
                    <p>يمكنك إعادة إرسال الكود بعد <span className="font-bold tabular-nums text-foreground">{resendSeconds}</span> ثانية</p>
                  ) : (
                    <Button type="button" variant="link" onClick={() => void sendOtp(true)} className="h-auto p-0 text-sm">
                      إعادة إرسال الكود
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PhoneVerify;
