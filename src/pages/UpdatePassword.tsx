import BrandLoader from '@/components/ui/BrandLoader';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Loader } from 'lucide-react';
import MainLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/auth/PasswordInput';
import { authErrorMessage } from '@/utils/authUi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const UpdatePassword = () => {
  const navigate = useNavigate();
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
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!mounted) return;
      setSessionValid(Boolean(data.session) && !sessionError);
      setCheckingSession(false);
    };

    void checkSession();
    return () => { mounted = false; };
  }, []);

  const handleUpdatePassword = async () => {
    if (loading || !sessionValid) return;
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
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      toast({
        title: 'تم تغيير كلمة المرور',
        description: 'يمكنك تسجيل الدخول الآن باستخدام كلمة المرور الجديدة.',
      });

      await supabase.auth.signOut();
      navigate('/phone-login', { replace: true });
    } catch (updateError: any) {
      const message = authErrorMessage(updateError, 'تعذر تغيير كلمة المرور. حاول مرة أخرى أو اطلب رابط استعادة جديدًا.');
      setError(message);
      toast({
        title: 'تعذر تغيير كلمة المرور',
        description: message,
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
          <h1 className="text-xl font-bold flex-1 text-center">تعيين كلمة مرور جديدة</h1>
          <div className="w-10" />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm space-y-5">
          {checkingSession ? (
            <div className="text-center text-gray-500">جاري التحقق من جلسة الاستعادة...</div>
          ) : !sessionValid ? (
            <div className="space-y-4 text-center">
              <p className="text-red-600">رابط أو جلسة الاستعادة غير صالحة أو انتهت.</p>
              <Button onClick={() => navigate('/forgot-password')} className="w-full">
                بدء الاستعادة من جديد
              </Button>
            </div>
          ) : (
            <>
              <p className="text-gray-600">اختر كلمة مرور جديدة لحسابك.</p>

              <div>
                <div className="flex items-center mb-2">
                  <KeyRound size={18} className="ml-2 text-gray-500" />
                  <label htmlFor="password" className="font-medium">كلمة المرور الجديدة</label>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError('');
                  }}
                  placeholder="8 أحرف أو أكثر"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="font-medium block mb-2">تأكيد كلمة المرور</label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleUpdatePassword();
                  }}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button onClick={handleUpdatePassword} disabled={loading} className="w-full">
                {loading && <BrandLoader size="sm" className="ml-2" />}
                حفظ كلمة المرور الجديدة
              </Button>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default UpdatePassword;
