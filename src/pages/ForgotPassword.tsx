import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
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
        <div className="mb-6 flex items-center">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600" aria-label="الرجوع">
            <ArrowRight size={22} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-black text-slate-950">نسيت كلمة المرور؟</h1>
            <p className="mt-1 text-xs text-slate-500">هنتأكد من رقمك برمز OTP مرة واحدة</p>
          </div>
          <div className="w-10" />
        </div>

        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f5ee] text-[#005931]">
            <KeyRound size={27} />
          </div>

          <p className="mb-5 text-center text-sm leading-6 text-slate-500">
            اكتب رقم الموبايل المسجل على حسابك، وبعد تأكيد الرمز هتختار كلمة مرور جديدة.
          </p>

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

          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#005931]" />
            <span>بعد تغيير كلمة المرور، تسجيل الدخول القادم هيكون بالرقم والباسورد بدون OTP.</span>
          </div>
        </div>

        <button type="button" onClick={() => navigate('/phone-login')} className="mt-4 min-h-11 w-full text-sm font-bold text-[#005931]">
          الرجوع لتسجيل الدخول
        </button>
      </div>
    </AuthLayout>
  );
}
