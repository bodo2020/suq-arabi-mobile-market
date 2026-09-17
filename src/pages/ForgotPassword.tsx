import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CountryCodeSelector, { Country } from '@/components/ui/CountryCodeSelector';
import { localPhoneDigits } from '@/utils/authUi';

const DEFAULT_COUNTRY: Country = {
  name: 'مصر',
  code: 'EG',
  dialCode: '+20',
  flag: '🇪🇬',
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [error, setError] = useState('');

  const continueWithOtp = () => {
    const digits = localPhoneDigits(phone, country.dialCode, country.code);
    if (!digits) {
      setError('اكتب رقم الموبايل.');
      return;
    }
    if (country.code === 'EG' && !(digits.startsWith('1') && digits.length === 10)) {
      setError('اكتب رقم موبايل مصري صحيح، مثل 01012345678.');
      return;
    }

    const params = new URLSearchParams({
      phone: digits,
      countryCode: country.code,
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
            <div className="flex min-h-14 items-stretch gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-[#005931] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#005931]/10">
              <CountryCodeSelector
                value={country}
                onChange={value => { setCountry(value); setError(''); }}
                className="min-w-[86px] border-0 bg-transparent shadow-none"
              />
              <div className="my-2 w-px bg-slate-200" aria-hidden="true" />
              <Input
                id="recovery-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={event => { setPhone(event.target.value); setError(''); }}
                onKeyDown={event => { if (event.key === 'Enter') continueWithOtp(); }}
                placeholder={country.code === 'EG' ? '010 1234 5678' : 'رقم الموبايل'}
                className="h-auto flex-1 border-0 bg-transparent px-2 text-left text-base font-semibold shadow-none focus-visible:ring-0"
                dir="ltr"
              />
            </div>
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
