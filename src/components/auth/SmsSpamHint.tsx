import { MailWarning } from 'lucide-react';

type SmsSpamHintProps = {
  /** Seconds left on the resend countdown (60 right after a send). */
  resendSeconds: number;
  /** Digits typed so far: once the code is in, the hint is no longer needed. */
  codeLength: number;
};

/**
 * Codes come from an ordinary phone number, so some phones' message apps
 * (Google Messages, Xiaomi, Samsung, Truecaller) file them as spam. After 30s
 * with no code, tell the customer where to look and how to stop it for good.
 */
export default function SmsSpamHint({ resendSeconds, codeLength }: SmsSpamHintProps) {
  if (resendSeconds > 30 || codeLength >= 6) return null;
  return (
    <div role="note" className="brand-search-suggestion-enter flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-right">
      <MailWarning size={19} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
      <p className="text-[13px] leading-6 text-amber-900">
        <strong className="font-extrabold">الكود ما وصلش؟</strong>{' '}
        ممكن يكون في «الرسائل غير المرغوب فيها» (Spam) في تطبيق الرسائل. افتحها واضغط «ليست رسالة مزعجة» عشان الأكواد الجاية توصل على طول.
      </p>
    </div>
  );
}
