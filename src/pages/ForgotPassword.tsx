import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import AuthHeading from '@/components/auth/AuthHeading';
import { Button } from '@/components/ui/button';
import EgyptPhoneField from '@/components/auth/EgyptPhoneField';
import { egyptianMobileDigits, isValidEgyptianMobile } from '@/utils/egyptPhone';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const continueWithOtp = () => {
    const digits = egyptianMobileDigits(phone);
    if (!digits) {
      setError('اكتب رقم الموبايل.');
      return;
    }
    if (!isValidEgyptianMobile(phone)) {
      setError('اكتب رقم موبايل مصري صحيح، مثل 01012345678.');
      return;
    }

    const params = new URLSearchParams({
      phone: digits,
      countryCode: 'EG',
      mode: 'recovery',
    });
    navigate(`/phone-verify?${params.toString()}`);
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-md px-1 py-2" dir="rtl">
        <div className="mb-2 flex justify-start">
          <button type="button" onClick={() => navigate('/phone-login')} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600" aria-label="الرجوع">
            <ArrowRight size={22} />
          </button>
        </div>
        <AuthHeading title="استعادة كلمة المرور" />

        <div className="auth-card space-y-5">
          <div>
            <label htmlFor="recovery-phone" className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Phone size={17} className="text-[#005931]" />
              رقم الموبايل
            </label>
            <EgyptPhoneField
              id="recovery-phone"
              value={phone}
              onChange={event => { setPhone(event.target.value); setError(''); }}
              onKeyDown={event => { if (event.key === 'Enter') continueWithOtp(); }}
              aria-invalid={Boolean(error)}
            />
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <Button onClick={continueWithOtp} className="mt-5 min-h-14 w-full rounded-2xl bg-[#005931] text-base font-black">
            إرسال رمز الاستعادة
          </Button>

        </div>

      </div>
    </AuthLayout>
  );
}
