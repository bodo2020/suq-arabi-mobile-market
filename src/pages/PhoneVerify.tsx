import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import AuthHeading from '@/components/auth/AuthHeading';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { egyptianMobileDigits, egyptianMobileE164, egyptianPhoneStartError, isValidEgyptianMobile } from '@/utils/egyptPhone';
import EgyptPhoneField from '@/components/auth/EgyptPhoneField';
import { authErrorMessage, normalizeDigits } from '@/utils/authUi';
import { safeReturnTo } from '@/lib/onboarding';
import { customerPhoneIsRegistered } from '@/services/customerAuthRoute';
import { shouldRouteRegisteredPhone } from '@/utils/otpRequest';
import { savePhoneRecoveryProof } from '@/utils/phoneRecovery';
import { listenForSmsCode, stopSmsCode } from '@/lib/smsCodeAutofill';

export default function PhoneVerify() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signInWithPhone, verifyPhone } = useUser();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const phoneFromQuery = queryParams.get('phone') || '';
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
  const [errors, setErrors] = useState({ phone: '', code: '' });
  const [initialSendDone, setInitialSendDone] = useState(false);
  const sendInFlight = useRef(false);
  const verifyInFlight = useRef(false);
  const initialStarted = useRef(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds(seconds => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => () => { void stopSmsCode(); }, []);

  const formatPhoneNumber = (value: string) => egyptianMobileDigits(value);
  const formatInternationalPhone = (value: string) => egyptianMobileE164(value);
  const validatePhone = () => {
    if (!formatPhoneNumber(phone)) {
      setErrors(prev => ({ ...prev, phone: 'اكتب رقم الموبايل.' }));
      return false;
    }
    if (!isValidEgyptianMobile(phone)) {
      setErrors(prev => ({ ...prev, phone: egyptianPhoneStartError(phone) ? '' : 'اكتب رقم موبايل مصري صحيح، مثل 01012345678.' }));
      return false;
    }
    return true;
  };

  const sendOtp = async (isResend = false) => {
    if (sendInFlight.current || loading || resendLoading || (isResend && resendSeconds > 0)) return;
    if (!validatePhone()) return;
    const fullPhone = formatInternationalPhone(phone);
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
            phone: formatPhoneNumber(phone),
            countryCode: 'EG',
            returnTo,
          });
          navigate(`/phone-login?${next.toString()}`, { replace: true });
          return;
        }
      }

      // Android: listen before asking, so the texted code fills itself (one "allow" tap) and is confirmed.
      void listenForSmsCode(value => { setCode(value); void verify(value); });
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

  const verify = async (value: string = code) => {
    // Autofill (SMS prompt, keyboard suggestion, paste) and the button can fire together: confirm once.
    if (resendLoading || verifyInFlight.current) return;
    if (!/^\d{6}$/.test(value)) {
      setErrors(prev => ({ ...prev, code: 'اكتب الرمز المكون من 6 أرقام.' }));
      return;
    }

    verifyInFlight.current = true;
    setLoading(true);
    try {
      const fullPhone = formatInternationalPhone(phone);
      const { data, error } = await verifyPhone(fullPhone, value);
      if (error) throw error;
      const verifiedUser = data?.user;
      if (!verifiedUser?.id) throw new Error('تعذر إنشاء جلسة بعد التحقق');

      if (isRecovery) {
        savePhoneRecoveryProof(verifiedUser.id, fullPhone);
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
      verifyInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md" dir="rtl">
        <button type="button" onClick={() => navigate(-1)} className="auth-back-button" aria-label="الرجوع">
          <ArrowRight size={20} />
        </button>
        <AuthHeading title={step === 'phone' ? (isRecovery ? 'استعادة كلمة المرور' : 'تأكيد رقمك') : 'اكتب كود التحقق'} />

        <div className="auth-card auth-card--flow">
          {step === 'phone' ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="phone" className="auth-field-label">رقم موبايلك</label>
                <EgyptPhoneField
                  id="phone"
                  value={phone}
                  disabled={loading}
                  onChange={event => { setPhone(event.target.value); setErrors(prev => ({ ...prev, phone: '' })); }}
                  onKeyDown={event => { if (event.key === 'Enter') void sendOtp(false); }}
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <p className="mt-2 text-sm text-red-600">{errors.phone}</p>}
                {rateLimitError && <p className="mt-2 text-sm text-amber-700">تم طلب رموز كثيرة. انتظر قليلًا قبل المحاولة مرة أخرى.</p>}
              </div>

              <Button onClick={() => void sendOtp(false)} disabled={loading} className="auth-primary-button">
                {loading ? <><BrandLoader size="sm" tone="onGreen" className="ml-2" />جاري إرسال الرمز</> : 'إرسال رمز التحقق'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="auth-recipient">
                <div className="min-w-0">
                  <p className="auth-recipient-label">{isTestOtp ? 'كود الاختبار للرقم' : 'بعتنالك الكود على'}</p>
                  <bdi dir="ltr" className="auth-recipient-phone">{formatInternationalPhone(phone)}</bdi>
                </div>
                <button
                  type="button"
                  className="auth-inline-link"
                  onClick={() => { setStep('phone'); setCode(''); setInitialSendDone(true); setErrors({ phone: '', code: '' }); }}
                  disabled={loading || resendLoading}
                >
                  تغيير الرقم
                </button>
              </div>

              <div className="auth-otp-entry">
                <div dir="ltr">
                  <InputOTP
                    aria-label="رمز التحقق المكون من 6 أرقام"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    containerClassName="auth-otp-input"
                    disabled={loading || resendLoading}
                    maxLength={6}
                    value={code}
                    onChange={value => { setCode(normalizeDigits(value).replace(/\D/g, '')); setErrors(prev => ({ ...prev, code: '' })); }}
                    onComplete={(value: string) => void verify(normalizeDigits(value).replace(/\D/g, ''))}
                  >
                    <InputOTPGroup className="auth-otp-group">
                      {[0, 1, 2, 3, 4, 5].map(index => <InputOTPSlot key={index} index={index} className="auth-otp-slot" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {errors.code && <p role="alert" className="mt-3 text-center text-sm text-red-700">{errors.code}</p>}
              </div>

              <Button onClick={() => void verify()} disabled={loading || code.length !== 6} className="auth-primary-button">
                {loading ? <><BrandLoader size="sm" tone="onGreen" className="ml-2" />جاري التحقق</> : 'تأكيد الرمز'}
              </Button>

              <div className="auth-otp-resend">
                <button type="button" onClick={() => void sendOtp(true)} disabled={loading || resendLoading || resendSeconds > 0} className="auth-inline-link">
                  {resendLoading ? 'جاري إعادة الإرسال...' : resendSeconds > 0 ? `إعادة الإرسال بعد ${resendSeconds} ثانية` : 'إعادة إرسال الكود'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
