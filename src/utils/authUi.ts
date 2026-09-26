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

export function authErrorMessage(error: { code?: string; status?: number; message?: string }, fallback: string) {
  if (error?.message?.includes('5 طلبات')) return error.message;
  if (error?.status === 429 || error?.code?.includes('rate_limit')) return 'محاولات كثيرة في وقت قصير. انتظر دقيقة ثم حاول مرة أخرى.';
  if (error?.code === 'otp_expired') return 'الرمز غير صحيح أو انتهت صلاحيته. راجعه أو اطلب رمزًا جديدًا.';
  if (error?.code === 'invalid_credentials') return 'رقم الموبايل أو كلمة المرور غير صحيحة.';
  return fallback;
}
