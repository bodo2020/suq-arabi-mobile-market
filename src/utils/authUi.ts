export const normalizeDigits = (value: string) => value
  .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
  .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));

export const localPhoneDigits = (value: string, dialCode: string, country: string) => {
  const normalized = normalizeDigits(value).trim();
  let digits = normalized.replace(/\D/g, '');
  const prefix = dialCode.replace(/\D/g, '');
  if (normalized.startsWith('+') && digits.startsWith(prefix)) digits = digits.slice(prefix.length);
  else if (digits.startsWith(`00${prefix}`)) digits = digits.slice(prefix.length + 2);
  return country === 'EG' && digits.startsWith('0') ? digits.slice(1) : digits;
};

export function authErrorMessage(error: { code?: string; status?: number }, fallback: string) {
  if (error?.status === 429 || error?.code?.includes('rate_limit')) return 'محاولات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.';
  if (error?.code === 'auth/too-many-requests') return 'محاولات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مرة أخرى.';
  if (error?.code === 'auth/invalid-verification-code') return 'رمز التحقق غير صحيح. راجعه ثم حاول مرة أخرى.';
  if (error?.code === 'auth/code-expired' || error?.code === 'auth/session-expired') return 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا.';
  if (error?.code === 'auth/invalid-phone-number') return 'رقم الهاتف غير صحيح.';
  if (error?.code === 'auth/quota-exceeded') return 'تم الوصول إلى حد رسائل التحقق اليومي. حاول لاحقًا.';
  if (error?.code === 'otp_expired') return 'الرمز غير صحيح أو انتهت صلاحيته. راجعه أو اطلب رمزًا جديدًا.';
  if (error?.code === 'invalid_credentials') return 'بيانات الدخول غير صحيحة. راجع الرقم أو البريد وكلمة المرور.';
  return fallback;
}
