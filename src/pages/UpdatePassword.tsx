import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import AuthHeading from '@/components/auth/AuthHeading';
import PasswordRules from '@/components/auth/PasswordRules';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/auth/PasswordInput';
import { authErrorMessage } from '@/utils/authUi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { clearPhoneRecoveryProof, readPhoneRecoveryProof, recoveryProofMatches } from '@/utils/phoneRecovery';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const phoneRecovery = new URLSearchParams(location.search).get('source') === 'phone';
  const updateInFlight = useRef(false);
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (!mounted) return;
        setSessionValid(Boolean(data.user) && !sessionError && (!phoneRecovery || recoveryProofMatches(readPhoneRecoveryProof(), data.user!)));
      } catch { if (mounted) setSessionValid(false); }
      finally { if (mounted) setCheckingSession(false); }
    };

    void checkSession();
    return () => { mounted = false; };
  }, [phoneRecovery]);

  const handleUpdatePassword = async () => {
    if (updateInFlight.current || loading || !sessionValid) return;
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف أو أكثر');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    updateInFlight.current = true;
    try {
      const { data: current, error: currentError } = await supabase.auth.getUser();
      if (currentError || !current.user || (phoneRecovery && !recoveryProofMatches(readPhoneRecoveryProof(), current.user))) {
        setSessionValid(false);
        throw new Error('RECOVERY_SESSION_EXPIRED');
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast({
        title: 'تم تغيير كلمة المرور',
        description: 'يمكنك تسجيل الدخول الآن باستخدام كلمة المرور الجديدة.',
      });

      clearPhoneRecoveryProof();
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
      if (signOutError) {
        await supabase.auth.signOut({ scope: 'local' });
        toast({ title: 'تم تغيير كلمة المرور', description: 'تعذر إنهاء الجلسات الأخرى. راجع أمان الحساب.', variant: 'destructive' });
      }
      navigate('/phone-login', { replace: true });
    } catch (updateError: any) {
      const message = updateError?.message === 'RECOVERY_SESSION_EXPIRED' ? 'انتهت جلسة الاستعادة. اطلب رمزًا جديدًا.' : authErrorMessage(updateError, 'تعذر تغيير كلمة المرور. حاول مرة أخرى أو اطلب رمز استعادة جديدًا.');
      setError(message);
      toast({
        title: 'تعذر تغيير كلمة المرور',
        description: message,
        variant: 'destructive',
      });
    } finally {
      updateInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md" dir="rtl">
        <div className="mb-2 flex justify-start">
          <button type="button" onClick={() => navigate('/phone-login')} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600" aria-label="الرجوع">
            <ArrowRight size={22} />
          </button>
        </div>
        <AuthHeading
          icon={KeyRound}
          title="تعيين كلمة مرور جديدة"
          description="اختار كلمة مرور قوية لحماية حسابك. هتستخدمها بعد كده مع رقم موبايلك."
        />

        <div className="auth-card">
          {checkingSession ? (
            <div className="flex min-h-44 items-center justify-center">
              <BrandLoader label="جاري التأكد من جلسة الاستعادة" />
            </div>
          ) : !sessionValid ? (
            <div className="space-y-4 text-center">
              <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">جلسة الاستعادة غير صالحة أو انتهت. اطلب رمز تحقق جديدًا.</p>
              <Button type="button" onClick={() => navigate('/forgot-password')} className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-bold">
                بدء الاستعادة من جديد
              </Button>
            </div>
          ) : (
            <div className="space-y-5" aria-busy={loading}>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-800">كلمة المرور الجديدة</label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  disabled={loading}
                  onChange={event => { setPassword(event.target.value); setError(''); }}
                  placeholder="8 أحرف على الأقل"
                  className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-slate-800">تأكيد كلمة المرور</label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={loading}
                  onChange={event => { setConfirmPassword(event.target.value); setError(''); }}
                  onKeyDown={event => { if (event.key === 'Enter') void handleUpdatePassword(); }}
                  placeholder="اكتب كلمة المرور مرة تانية"
                  className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4"
                />
              </div>
              <PasswordRules password={password} confirmPassword={confirmPassword} />
              {error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <Button
                type="button"
                onClick={() => void handleUpdatePassword()}
                disabled={loading}
                className="min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black hover:bg-[#004a29]"
              >
                {loading && <BrandLoader size="sm" className="ml-2" />}
                {loading ? 'جاري حفظ كلمة المرور' : 'حفظ كلمة المرور الجديدة'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};

export default UpdatePassword;
