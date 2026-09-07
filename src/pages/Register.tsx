import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { loadOnboardingState, nextOnboardingPath, safeReturnTo } from '@/lib/onboarding';

export default function Register() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user?.phone) {
        navigate(`/phone-verify?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
        return;
      }
      setPhone(`+${data.user.phone.replace(/^\+/, '')}`);
      setChecking(false);
    }).catch(() => { if (active) { setChecking(false); setError('تعذر تحميل الحساب. حدّث الصفحة وحاول مرة أخرى.'); } });
    return () => { active = false; };
  }, [navigate, returnTo]);
  async function completeProfile(event: React.FormEvent) {
    event.preventDefault();
    if (busy || checking) return;
    const fullName = name.trim().replace(/\s+/g, ' ');
    if (fullName.length < 2) { setError('اكتب اسمك، حرفين على الأقل.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.phone) throw userError || new Error('Missing session');
      const [firstName, ...rest] = fullName.split(' ');
      const { error: saveError } = await supabase.from('customers').upsert({
        user_id: data.user.id, name: fullName, first_name: firstName,
        last_name: rest.join(' ') || null, phone: `+${data.user.phone.replace(/^\+/, '')}`,
      }, { onConflict: 'user_id' });
      if (saveError) throw saveError;
      await queryClient.invalidateQueries({ queryKey: ['customerData', data.user.id] });
      await queryClient.invalidateQueries({ queryKey: ['customer-favorites', data.user.id] });
      queryClient.setQueryData(['profile-completion', data.user.id], { name: fullName });
      window.dispatchEvent(new Event('customer-profile-ready'));
      const state = await loadOnboardingState(data.user.id);
      await queryClient.invalidateQueries({ queryKey: ['onboarding-state', data.user.id] });
      navigate(nextOnboardingPath({ ...state, hasName: true }, returnTo), { replace: true });
    } catch { setError('تعذر حفظ بياناتك. راجع الاتصال وحاول مرة أخرى.'); }
    finally { setBusy(false); }
  }
  return <AuthLayout>
    <h1 className="text-center font-bold mb-2">خلّينا نتعرف عليك</h1>
    <p className="text-center text-gray-600 mb-6">خطوة بسيطة لأول مرة: اكتب اسمك، وبعدها هنحدد عنوان التوصيل عشان طلباتك توصل لبابك.</p>
    {checking ? <p role="status" className="text-center">جاري التأكد من حسابك...</p> :
      <form onSubmit={completeProfile} className="space-y-5" aria-busy={busy}>
        <p className="text-center rounded-xl bg-green-50 p-3 text-green-800">رقمك اتأكد · <bdi dir="ltr">{phone}</bdi></p>
        <div><label htmlFor="fullName" className="block mb-2 font-medium">اسمك</label>
          <Input id="fullName" autoComplete="name" autoFocus maxLength={100} value={name} disabled={busy}
            placeholder="الاسم اللي تحب نناديك بيه" aria-invalid={Boolean(error)} aria-describedby={error ? 'registration-error' : undefined}
            onChange={event => { setName(event.target.value); setError(''); }} />
        </div>
        {error && <p id="registration-error" role="alert" className="text-sm text-red-700">{error}</p>}
        <Button className="w-full" type="submit" disabled={busy || !phone}>{busy ? 'جاري حفظ حسابك...' : 'حفظ ومتابعة'}</Button>
      </form>}
  </AuthLayout>;
}
