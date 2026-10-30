import { CheckCircle2, Circle } from 'lucide-react';

export default function PasswordRules({ password, confirmPassword }: { password: string; confirmPassword: string }) {
  const longEnough = password.length >= 8;
  const matches = confirmPassword.length > 0 && password === confirmPassword;
  return (
    <div className="auth-password-rules" aria-label="متطلبات كلمة المرور">
      <div className={longEnough ? 'auth-rule auth-rule--valid' : 'auth-rule'}>
        {longEnough ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
        <span>8 أحرف على الأقل</span>
      </div>
      <div className={matches ? 'auth-rule auth-rule--valid' : 'auth-rule'}>
        {matches ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
        <span>كلمتا المرور متطابقتان</span>
      </div>
    </div>
  );
}
