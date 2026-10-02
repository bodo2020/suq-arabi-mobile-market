import { MessageCircle } from 'lucide-react';

const helpMessage = 'مرحبًا، رمز التحقق في تطبيق ســــــوبـرمــــاركو لم يصلني. أحتاج مساعدة.';
const helpUrl = `https://wa.me/201005245096?text=${encodeURIComponent(helpMessage)}`;

export default function OtpWhatsAppHelp() {
  return <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center text-sm" dir="rtl">
    <p className="font-semibold text-slate-800">رمز التحقق اتأخر؟</p>
    <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 font-bold text-[#005931] underline underline-offset-4">
      <MessageCircle size={18} aria-hidden="true" /> تواصل معنا على واتساب
    </a>
    <p className="text-xs text-slate-600">لا تشارك رمز التحقق أو كلمة المرور مع أي شخص.</p>
  </div>;
}
