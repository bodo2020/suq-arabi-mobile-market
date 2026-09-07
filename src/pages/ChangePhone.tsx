import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Loader, Phone } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const DEFAULT_COUNTRY: Country = {
  name: 'مصر',
  code: 'EG',
  dialCode: '+20',
  flag: '🇪🇬',
};

const ChangePhone = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPhone, setCurrentPhone] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [countryCode, setCountryCode] = useState<Country>(DEFAULT_COUNTRY);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userError || !data.user) {
        navigate('/phone-login', { replace: true });
        return;
      }

      setUserId(data.user.id);
      setCurrentPhone(data.user.phone || '');
    };

    void loadUser();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const formatLocalPhone = (value: string, country: Country) => {
    const digits = value.replace(/\D/g, '');
    if (country.code === 'EG' && digits.startsWith('0')) return digits.slice(1);
    return digits;
  };

  const formatInternationalPhone = (value: string, country: Country) => {
    const local = formatLocalPhone(value, country);
    const dialCode = country.dialCode.replace(/\D/g, '');
    return `+${dialCode}${local}`;
  };

  const validatePhone = () => {
    const local = formatLocalPhone(newPhone, countryCode);
    if (!local) {
      setError('أدخل رقم الهاتف الجديد');
      return false;
    }

    if (countryCode.code === 'EG' && !(local.startsWith('1') && local.length === 10)) {
      setError('أدخل رقم هاتف مصري صحيح مكون من 10 أرقام ويبدأ بـ 1');
      return false;
    }

    const fullPhone = formatInternationalPhone(newPhone, countryCode);
    if (currentPhone && fullPhone === currentPhone) {
      setError('الرقم الجديد هو نفس الرقم الحالي');
      return false;
    }

    return true;
  };

  const handleRequestChange = async () => {
    if (loading || !validatePhone()) return;

    setLoading(true);
    setError('');
    try {
      const fullPhone = formatInternationalPhone(newPhone, countryCode);
      const { error: updateError } = await supabase.auth.updateUser({ phone: fullPhone });
      if (updateError) throw updateError;

      setStep('otp');
      setResendSeconds(60);
      toast({
        title: 'تم إرسال رمز التحقق',
        description: 'أدخل الرمز المرسل لتأكيد رقم الهاتف الجديد.',
      });
    } catch (requestError: any) {
      const message = requestError?.message || 'تعذر إرسال رمز التحقق للرقم الجديد';
      setError(message);
      toast({ title: 'تعذر تغيير الرقم', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendLoading || resendSeconds > 0 || !validatePhone()) return;

    setResendLoading(true);
    setError('');
    try {
      const fullPhone = formatInternationalPhone(newPhone, countryCode);
      const { error: resendError } = await supabase.auth.resend({
        type: 'phone_change',
        phone: fullPhone,
      });
      if (resendError) throw resendError;

      setResendSeconds(60);
      toast({ title: 'تم إعادة إرسال الرمز' });
    } catch (resendError: any) {
      const message = resendError?.message || 'تعذر إعادة إرسال الرمز';
      setError(message);
      toast({ title: 'تعذر إعادة الإرسال', description: message, variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (loading || !/^\d{6}$/.test(code) || !userId) {
      if (!/^\d{6}$/.test(code)) setError('أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const fullPhone = formatInternationalPhone(newPhone, countryCode);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: code,
        type: 'phone_change',
      });
      if (verifyError) throw verifyError;

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.phone !== fullPhone) {
        throw authError || new Error('لم يتم تأكيد تغيير رقم الهاتف');
      }

      const { error: customerError } = await supabase
        .from('customers')
        .update({ phone: fullPhone })
        .eq('user_id', userId);
      if (customerError) throw customerError;

      localStorage.setItem('userPhone', fullPhone);
      toast({
        title: 'تم تغيير رقم الهاتف',
        description: 'تم تأكيد وحفظ رقم الهاتف الجديد بنجاح.',
      });
      navigate('/edit-account', { replace: true });
    } catch (verifyError: any) {
      const message = verifyError?.message || 'الرمز غير صحيح أو منتهي الصلاحية';
      setError(message);
      toast({ title: 'تعذر تأكيد الرقم', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 max-w-md mx-auto">
        <div className="flex items-center mb-6">
          <button onClick={() => navigate('/edit-account')} className="p-2" aria-label="الرجوع">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">تغيير رقم الهاتف</h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm space-y-5">
          {currentPhone && (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500 mb-1">الرقم الحالي</p>
              <p className="font-medium" dir="ltr">{currentPhone}</p>
            </div>
          )}

          {step === 'phone' ? (
            <>
              <div>
                <div className="flex items-center mb-2">
                  <Phone size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="newPhone" className="font-medium">رقم الهاتف الجديد</label>
                </div>
                <div className="flex gap-2 items-center">
                  <CountryCodeSelector value={countryCode} onChange={setCountryCode} className="min-w-[80px]" />
                  <Input
                    id="newPhone"
                    type="tel"
                    value={newPhone}
                    onChange={(event) => {
                      setNewPhone(event.target.value);
                      setError('');
                    }}
                    placeholder={countryCode.code === 'EG' ? '1xxxxxxxxx' : 'رقم الهاتف'}
                    dir="ltr"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button onClick={handleRequestChange} disabled={loading} className="w-full">
                {loading && <BrandLoader size="sm" className="ml-2" />}
                إرسال رمز التحقق
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-center">
                أدخل الرمز المرسل إلى
                <br />
                <span className="font-bold" dir="ltr">{formatInternationalPhone(newPhone, countryCode)}</span>
              </p>

              <div>
                <div className="flex items-center mb-3">
                  <Check size={18} className="ml-2 text-gray-500" />
                  <label className="font-medium">رمز التحقق</label>
                </div>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => {
                      setCode(value.replace(/\D/g, ''));
                      setError('');
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
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="w-full">
                {loading && <BrandLoader size="sm" className="ml-2" />}
                تأكيد الرقم الجديد
              </Button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading || resendSeconds > 0}
                  className="text-primary text-sm disabled:opacity-50"
                >
                  {resendLoading
                    ? 'جاري إعادة الإرسال...'
                    : resendSeconds > 0
                      ? `إعادة الإرسال بعد ${resendSeconds} ثانية`
                      : 'إعادة إرسال الرمز'}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('phone');
                      setCode('');
                      setResendSeconds(0);
                    }}
                    className="text-primary text-sm"
                  >
                    تغيير الرقم المدخل
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

export default ChangePhone;

