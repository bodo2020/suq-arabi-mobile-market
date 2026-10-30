import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import AuthHeading from '@/components/auth/AuthHeading';
import PasswordRules from '@/components/auth/PasswordRules';
import PasswordInput from '@/components/auth/PasswordInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import BrandLoader from '@/components/ui/BrandLoader';
import { supabase } from '@/lib/supabase';
import { loadOnboardingState, nextOnboardingPath, safeReturnTo } from '@/lib/onboarding';

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError || !data.user?.phone) {
          navigate(`/phone-login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
          return;
        }

        setPhone(`+${data.user.phone.replace(/^\+/, '')}`);
        const { data: customer } = await supabase
          .from('customers')
          .select('name')
          .eq('user_id', data.user.id)
          .maybeSingle();
        if (!active) return;
        if (customer?.name) setName(String(customer.name));
        setChecking(false);
      } catch {
        if (active) {
          setChecking(false);
          setError('تعذر تحميل الحساب. راجع الاتصال وحاول مرة أخرى.');
        }
      }
    })();
    return () => { active = false; };
  }, [navigate, returnTo]);

  async function completeProfile(event: React.FormEvent) {
    event.preventDefault();
    if (busy || checking) return;

    const fullName = name.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) {
      setError('اكتب اسمك، حرفين على الأقل.');
      return;
    }
    if (password.length < 8) {
      setError('كلمة المرور لازم تكون 8 أحرف أو أكثر.');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.phone) throw userError || new Error('Missing session');

      const { error: passwordError } = await supabase.auth.updateUser({
        password,
        data: { password_login_enabled: true },
      });
      if (passwordError) throw passwordError;

      const [firstName, ...rest] = fullName.split(' ');
      const { error: saveError } = await supabase.from('customers').upsert({
        user_id: data.user.id,
        name: fullName,
        first_name: firstName,
        last_name: rest.join(' ') || null,
        phone: `+${data.user.phone.replace(/^\+/, '')}`,
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;

      await queryClient.invalidateQueries({ queryKey: ['customerData', data.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['customer-favorites', data.user.id] });
      queryClient.setQueryData(['profile-completion', data.user.id], { name: fullName });
      window.dispatchEvent(new Event('customer-profile-ready'));
      const state = await loadOnboardingState(data.user.id);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-state', data.user.id] });
      navigate(nextOnboardingPath({ ...state, hasName: true }, returnTo), { replace: true });
    } catch (saveError: any) {
      setError(saveError?.message?.includes('password')
        ? 'تعذر حفظ كلمة المرور. اختار كلمة أقوى وحاول مرة أخرى.'
        : 'تعذر حفظ بياناتك. راجع الاتصال وحاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md" dir="rtl">
        <AuthHeading title="كمّل بياناتك" />

        {checking ? (
          <div className="flex min-h-48 items-center justify-center"><BrandLoader label="جاري التأكد من حسابك" /></div>
        ) : (
          <form onSubmit={completeProfile} className="auth-card space-y-5" aria-busy={busy}>
            <div className="flex items-center gap-2 rounded-2xl bg-[#f0faf5] px-4 py-3 text-sm font-bold text-[#005931]">
              <ShieldCheck size={18} />
              <span>تم تأكيد رقمك</span>
              <bdi dir="ltr" className="mr-auto font-semibold">{phone}</bdi>
            </div>

            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-bold text-slate-800">اسمك</label>
              <Input
                id="fullName"
                autoComplete="name"
                autoFocus
                maxLength={100}
                value={name}
                disabled={busy}
                placeholder="الاسم اللي تحب نناديك بيه"
                className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4"
                onChange={event => { setName(event.target.value); setError(''); }}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                <KeyRound size={17} className="text-[#005931]" />
                كلمة المرور
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                disabled={busy}
                placeholder="8 أحرف أو أكثر"
                className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4"
                onChange={event => { setPassword(event.target.value); setError(''); }}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold text-slate-800">تأكيد كلمة المرور</label>
              <PasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                value={confirmPassword}
                disabled={busy}
                placeholder="اكتب كلمة المرور مرة تانية"
                className="min-h-14 rounded-2xl border-slate-200 bg-slate-50 px-4"
                onChange={event => { setConfirmPassword(event.target.value); setError(''); }}
              />
            </div>

            <PasswordRules password={password} confirmPassword={confirmPassword} />

            {error && <p id="registration-error" role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <Button className="auth-primary-button" type="submit" disabled={busy || !phone}>
              {busy ? <><BrandLoader size="sm" className="ml-2" />جاري حفظ حسابك</> : 'حفظ ومتابعة'}
            </Button>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
