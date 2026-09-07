import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  return <div className="auth-password">
    <Input {...props} type={visible ? 'text' : 'password'} />
    <button type="button" className="auth-password-toggle" onClick={() => setVisible(!visible)}
      aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={visible}>
      {visible ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  </div>;
}
