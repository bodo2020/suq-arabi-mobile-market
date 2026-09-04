import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowRight, Check, Loader } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
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

  const [phone, setPhone] = useState(phoneFromQuery);
  const [step, setStep] = useState<'phone' | 'verification'>(phoneFromQuery ? 'verification' : 'phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(phoneFromQuery ? 60 : 0);
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

  const handleSendCode = async () => {
    if (!validatePhone() || loading) return;

    setLoading(true);
    setRateLimitError(false);

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { error } = await signInWithPhone(fullPhone);
      if (error) throw error;

      setStep('verification');
      setCode('');
      setResendSeconds(60);
      toast({
        title: 'تم إرسال رمز التحقق',
        description: 'تم إرسال رمز مكون من 6 أرقام إلى هاتفك',
      });
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.code === 'over_sms_send_rate_limit';
      if (isRateLimited) setRateLimitError(true);

      toast({
        title: isRateLimited ? 'تم تجاوز الحد المسموح' : 'حدث خطأ',
        description: isRateLimited
          ? 'يرجى الانتظار قليلاً قبل طلب رمز جديد.'
          : error?.message || 'لم نتمكن من إرسال رمز التحقق، يرجى المحاولة مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendLoading || resendSeconds > 0 || !validatePhone()) return;

    setResendLoading(true);
    setRateLimitError(false);

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { error } = await signInWithPhone(fullPhone);
      if (error) throw error;

      setCode('');
      setResendSeconds(60);
      toast({
        title: 'تم إعادة إرسال رمز التحقق',
        description: 'تم إرسال رمز تحقق جديد إلى هاتفك',
      });
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.code === 'over_sms_send_rate_limit';
      if (isRateLimited) setRateLimitError(true);

      toast({
        title: isRateLimited ? 'تم تجاوز الحد المسموح' : 'حدث خطأ',
        description: isRateLimited
          ? 'يرجى الانتظار قليلاً قبل طلب رمز جديد.'
          : error?.message || 'لم نتمكن من إعادة إرسال رمز التحقق',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
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

      // Existing customers go straight to their account. New Auth users
      // complete their profile and address on the registration screen.
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

  return (
    <MainLayout>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate(-1)} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">التحقق من رقم الهاتف</h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          {step === 'phone' ? (
            <>
              <p className="text-center mb-6">سيتم إرسال رمز تحقق في رسالة SMS إلى هاتفك</p>

              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="phone" className="font-medium">رقم الهاتف</label>
                </div>

                <div className="flex gap-2 items-center">
                  <CountryCodeSelector
                    value={countryCode}
                    onChange={setCountryCode}
                    className="min-w-[80px]"
                  />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setErrors((prev) => ({ ...prev, phone: '' }));
                      setRateLimitError(false);
                    }}
                    className="text-right ltr flex-1"
                    placeholder={countryCode.code === 'EG' ? '1xxxxxxxxx' : 'xxx-xxxx-xxx'}
                    dir="ltr"
                  />
                </div>

                <p className="text-xs text-gray-500 mt-1 text-right">
                  {countryCode.code === 'EG'
                    ? 'أدخل رقم الهاتف المصري بدون 0 في البداية (مثال: 1xxxxxxxxx)'
                    : 'أدخل رقم الهاتف بدون رمز الدولة'}
                </p>

                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                {rateLimitError && (
                  <p className="text-amber-600 text-sm mt-1">
                    تم طلب رموز كثيرة. انتظر قليلاً قبل المحاولة مرة أخرى.
                  </p>
                )}
              </div>

              <Button onClick={handleSendCode} disabled={loading} className="w-full">
                {loading && <Loader size={16} className="animate-spin ml-2" />}
                إرسال رمز التحقق
              </Button>
            </>
          ) : (
            <>
              <p className="text-center mb-6">
                أدخل الرمز المرسل إلى
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
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value.replace(/\D/g, ''));
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
                {loading && <Loader size={16} className="animate-spin ml-2" />}
                التحقق من الرمز
              </Button>

              <div className="mt-4 text-center space-y-3">
                <button
                  onClick={handleResendCode}
                  className="text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={resendLoading || resendSeconds > 0}
                  type="button"
                >
                  {resendLoading
                    ? 'جاري إعادة الإرسال...'
                    : resendSeconds > 0
                      ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
                      : 'إعادة إرسال الرمز'}
                </button>

                <div>
                  <button
                    onClick={() => {
                      setStep('phone');
                      setCode('');
                      setResendSeconds(0);
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
