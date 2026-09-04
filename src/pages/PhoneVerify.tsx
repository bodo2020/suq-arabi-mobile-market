import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader, Phone } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';

const COUNTRIES: Country[] = [
  { name: 'مصر', code: 'EG', dialCode: '+20', flag: '🇪🇬' },
  { name: 'السعودية', code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'الإمارات', code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'الكويت', code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'البحرين', code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'قطر', code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'عمان', code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'الأردن', code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'لبنان', code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'فلسطين', code: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'سوريا', code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'العراق', code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'ليبيا', code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'تونس', code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'الجزائر', code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'المغرب', code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'السودان', code: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'اليمن', code: 'YE', dialCode: '+967', flag: '🇾🇪' },
];

const PhoneVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signInWithPhone, verifyPhone } = useUser();

  const queryParams = new URLSearchParams(location.search);
  const phoneFromQuery = queryParams.get('phone') || '';
  const countryCodeFromQuery = queryParams.get('countryCode') || 'EG';
  const mode = queryParams.get('mode') === 'signup' ? 'signup' : 'login';

  const [phone, setPhone] = useState(phoneFromQuery);
  const [countryCode, setCountryCode] = useState<Country>(
    COUNTRIES.find(country => country.code === countryCodeFromQuery) || COUNTRIES[0]
  );
  const [step, setStep] = useState<'phone' | 'verification'>('phone');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [rateLimitError, setRateLimitError] = useState(false);
  const [errors, setErrors] = useState({ phone: '', code: '' });

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds(seconds => Math.max(0, seconds - 1));
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
    const localNumber = formatPhoneNumber(phoneNumber, country);
    const dialCode = country.dialCode.replace(/\D/g, '');
    return `+${dialCode}${localNumber}`;
  };

  const validateEgyptianPhone = (value: string) => value.startsWith('1') && value.length === 10;

  const validatePhone = () => {
    const cleanPhone = formatPhoneNumber(phone, countryCode);
    if (!cleanPhone) {
      setErrors(prev => ({ ...prev, phone: 'يرجى إدخال رقم هاتف' }));
      return false;
    }
    if (countryCode.code === 'EG' && !validateEgyptianPhone(cleanPhone)) {
      setErrors(prev => ({
        ...prev,
        phone: 'يرجى إدخال رقم هاتف مصري صحيح يبدأ بـ 1 ومكوّن من 10 أرقام',
      }));
      return false;
    }
    return true;
  };

  const requestCode = async (isResend = false) => {
    if (!validatePhone()) return;
    if (isResend && resendSeconds > 0) return;

    isResend ? setResendLoading(true) : setLoading(true);
    setRateLimitError(false);
    setErrors(prev => ({ ...prev, phone: '' }));

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { error } = await signInWithPhone(fullPhone, {
        shouldCreateUser: mode === 'signup',
      });

      if (error) {
        if (error.status === 429 || error.code === 'over_sms_send_rate_limit') {
          setRateLimitError(true);
          setResendSeconds(60);
          toast({
            title: 'تم تجاوز الحد المسموح',
            description: 'انتظر قليلاً قبل طلب رمز تحقق جديد.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      setStep('verification');
      setResendSeconds(60);
      toast({
        title: isResend ? 'تم إعادة إرسال رمز التحقق' : 'تم إرسال رمز التحقق',
        description: 'تم إرسال رمز مكوّن من 6 أرقام إلى هاتفك عبر SMS.',
      });
    } catch (error: any) {
      console.error('Error requesting phone OTP:', error);
      toast({
        title: 'تعذر إرسال رمز التحقق',
        description: error?.message || 'تأكد من رقم الهاتف وحاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      isResend ? setResendLoading(false) : setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setErrors(prev => ({ ...prev, code: 'يرجى إدخال الرمز المكوّن من 6 أرقام' }));
      return;
    }

    setLoading(true);
    setErrors(prev => ({ ...prev, code: '' }));

    try {
      const fullPhone = formatInternationalPhone(phone, countryCode);
      const { data, error } = await verifyPhone(fullPhone, code);
      if (error) throw error;

      const verifiedUser = data?.user;
      toast({
        title: 'تم التحقق بنجاح',
        description: 'تم تأكيد رقم الهاتف بنجاح.',
      });

      if (mode === 'signup' && verifiedUser?.id) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', verifiedUser.id)
          .maybeSingle();

        if (existingCustomer) {
          navigate('/account', { replace: true });
          return;
        }

        navigate(
          `/register?phone=${encodeURIComponent(phone)}&countryCode=${encodeURIComponent(countryCode.code)}`,
          { replace: true }
        );
        return;
      }

      navigate('/account', { replace: true });
    } catch (error: any) {
      console.error('Error verifying phone OTP:', error);
      toast({
        title: 'رمز التحقق غير صحيح',
        description: error?.message || 'الرمز غير صحيح أو منتهي الصلاحية.',
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
            {mode === 'signup' ? 'تأكيد رقم الهاتف' : 'الدخول برمز التحقق'}
          </h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          {step === 'phone' ? (
            <>
              <p className="text-center mb-6">
                سنرسل رمز تحقق مكوّن من 6 أرقام إلى رقم هاتفك.
              </p>

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
                    onChange={event => {
                      setPhone(event.target.value);
                      setErrors(prev => ({ ...prev, phone: '' }));
                      setRateLimitError(false);
                    }}
                    className="text-right ltr flex-1"
                    placeholder={countryCode.code === 'EG' ? '1xxxxxxxxx' : 'رقم الهاتف'}
                    dir="ltr"
                    autoComplete="tel"
                  />
                </div>

                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                {rateLimitError && (
                  <p className="text-amber-600 text-sm mt-1">
                    تم طلب رموز كثيرة. انتظر قبل المحاولة مرة أخرى.
                  </p>
                )}
              </div>

              <Button onClick={() => requestCode(false)} disabled={loading} className="w-full">
                {loading && <Loader size={16} className="animate-spin ml-2" />}
                إرسال رمز التحقق
              </Button>
            </>
          ) : (
            <>
              <p className="text-center mb-6">
                أدخل الرمز الذي تم إرساله إلى
                <br />
                <span className="font-bold" dir="ltr">
                  {formatInternationalPhone(phone, countryCode)}
                </span>
              </p>

              <div dir="ltr" className="flex justify-center mb-3">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={value => {
                    setCode(value.replace(/\D/g, ''));
                    setErrors(prev => ({ ...prev, code: '' }));
                  }}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(index => (
                      <InputOTPSlot key={index} index={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {errors.code && <p className="text-red-500 text-sm text-center mb-3">{errors.code}</p>}

              <Button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="w-full mb-3"
              >
                {loading && <Loader size={16} className="animate-spin ml-2" />}
                تأكيد الرمز
              </Button>

              <Button
                variant="outline"
                onClick={() => requestCode(true)}
                disabled={resendLoading || resendSeconds > 0}
                className="w-full"
              >
                {resendLoading && <Loader size={16} className="animate-spin ml-2" />}
                {resendSeconds > 0 ? `إعادة الإرسال بعد ${resendSeconds}ث` : 'إعادة إرسال الرمز'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
                className="w-full text-primary text-sm mt-4"
              >
                تغيير رقم الهاتف
              </button>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default PhoneVerify;
