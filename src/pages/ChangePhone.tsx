import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Phone, ShieldCheck } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { normalizeDigits } from '@/utils/authUi';
import OtpWhatsAppHelp from '@/components/auth/OtpWhatsAppHelp';

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
  const [sendFailed, setSendFailed] = useState(false);

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
    const digits = normalizeDigits(value).replace(/\D/g, '');
    if (country.code === 'EG' && digits.startsWith('0')) return digits.slice(1);
    return digits;
  };

  const formatInternationalPhone = (value: string, country: Country) => {
    const local = formatLocalPhone(value, country);
    const dialCode = normalizeDigits(country.dialCode).replace(/\D/g, '');
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
    setSendFailed(false);
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
      setSendFailed(true);
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
    setSendFailed(false);
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
      setSendFailed(true);
      const message = resendError?.message || 'تعذر إعادة إرسال الرمز';
      setError(message);
      toast({ title: 'تعذر إعادة الإرسال', description: message, variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    const normalizedCode = normalizeDigits(code).replace(/\D/g, '');
    if (loading || !/^\d{6}$/.test(normalizedCode) || !userId) {
      if (!/^\d{6}$/.test(normalizedCode)) setError('أدخل رمز التحقق المكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const fullPhone = formatInternationalPhone(newPhone, countryCode);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: normalizedCode,
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
      <TopNavBar hideLogo hideSearch hideCart pageTitle="تغيير رقم الهاتف" />
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-primary"><ShieldCheck size={25} /></span>
            <div>
              <h1 className="text-xl font-bold">غيّر رقمك بأمان</h1>
              <p className="mt-1 text-sm leading-6 text-gray-500">هنبعت كود تحقق للرقم الجديد قبل ما نعتمده في حسابك.</p>
            </div>
          </div>

          {currentPhone && <div className="mb-5 rounded-2xl bg-gray-50 p-4">
            <p className="mb-1 text-xs text-gray-500">الرقم الحالي</p>
            <p className="font-semibold" dir="ltr">{currentPhone}</p>
          </div>}

          {step === 'phone' ? <div className="space-y-5">
            <div>
              <label htmlFor="newPhone" className="mb-2 flex items-center gap-2 text-sm font-semibold"><Phone size={18} className="text-primary" />رقم الهاتف الجديد</label>
              <div className="flex items-center gap-2">
                <CountryCodeSelector value={countryCode} onChange={setCountryCode} className="min-w-[88px]" />
                <Input
                  id="newPhone"
                  type="tel"
                  inputMode="numeric"
                  value={newPhone}
                  onChange={(event) => {
                    setNewPhone(event.target.value);
                    setError('');
                  }}
                  placeholder={countryCode.code === 'EG' ? '01xxxxxxxxx' : 'رقم الهاتف'}
                  dir="ltr"
                  className="min-h-12 rounded-xl"
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">ينفع تكتب الرقم بالأرقام العربية أو الإنجليزية.</p>
            </div>

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <Button onClick={handleRequestChange} disabled={loading} className="min-h-12 w-full rounded-xl text-base">
              {loading && <BrandLoader size="sm" className="ml-2" />}
              {loading ? 'جاري إرسال الرمز…' : 'إرسال رمز التحقق'}
            </Button>
            {sendFailed && <OtpWhatsAppHelp />}
          </div> : <div className="space-y-5">
            <div className="rounded-2xl bg-green-50 p-4 text-center">
              <p className="text-sm text-gray-600">أدخل الرمز المرسل إلى</p>
              <p className="mt-1 font-bold text-primary" dir="ltr">{formatInternationalPhone(newPhone, countryCode)}</p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold"><Check size={18} className="text-primary" />رمز التحقق</div>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    setCode(normalizeDigits(value).replace(/\D/g, ''));
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

            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>}

            <Button onClick={handleVerify} disabled={loading || normalizeDigits(code).replace(/\D/g, '').length !== 6} className="min-h-12 w-full rounded-xl text-base">
              {loading && <BrandLoader size="sm" className="ml-2" />}
              {loading ? 'جاري التأكيد…' : 'تأكيد الرقم الجديد'}
            </Button>

            <div className="space-y-2 text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading || resendSeconds > 0}
                className="min-h-11 text-sm font-semibold text-primary disabled:opacity-50"
              >
                {resendLoading ? 'جاري إعادة الإرسال...' : resendSeconds > 0 ? `إعادة الإرسال بعد ${resendSeconds} ثانية` : 'إعادة إرسال الرمز'}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setCode('');
                    setResendSeconds(0);
                    setError('');
                  }}
                  className="min-h-11 text-sm text-gray-600 underline"
                >
                  تعديل الرقم المدخل
                </button>
              </div>
            </div>
            {(resendSeconds === 0 || sendFailed) && <OtpWhatsAppHelp />}
          </div>}
        </section>
      </div>
    </MainLayout>
  );
};

export default ChangePhone;
