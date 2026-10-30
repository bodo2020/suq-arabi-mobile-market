import { CheckCircle2, Circle } from 'lucide-react';

export default function PasswordRules({ password, confirmPassword }: { password: string; confirmPassword: string }) {
  const longEnough = password.length >= 8;
  const matches = confirmPassword.length > 0 && password === confirmPassword;
  return (
    <div className="space-y-1.5 rounded-2xl bg-[#f2f8f4] px-4 py-3 text-xs" aria-label="متطلبات كلمة المرور">
      <div className={longEnough ? 'flex items-center gap-2 text-[#005931]' : 'flex items-center gap-2 text-slate-500'}>
        {longEnough ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
        8 أحرف على الأقل
      </div>
      <div className={matches ? 'flex items-center gap-2 text-[#005931]' : 'flex items-center gap-2 text-slate-500'}>
        {matches ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
        تطابق كلمة المرور وتأكيدها
      </div>
    </div>
  );
}
