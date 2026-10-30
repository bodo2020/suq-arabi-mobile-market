import { localPhoneDigits, normalizeDigits } from '@/utils/authUi';

export const EGYPT_DIAL_CODE = '+20';
export const EGYPT_COUNTRY_CODE = 'EG';

// Egyptian mobiles use 010, 011, 012 or 015 in national format.
// Always normalize Arabic/Persian digits and remove 0 or +20 before validation.
export const egyptianMobileDigits = (value: string): string => {
  const digits = localPhoneDigits(value, EGYPT_DIAL_CODE, EGYPT_COUNTRY_CODE);
  // Accept a pasted 2010... number even if the + sign was omitted.
  return /^201[0125]\d{8}$/.test(digits) ? digits.slice(2) : digits;
};

export const isValidEgyptianMobile = (value: string): boolean =>
  /^1[0125]\d{8}$/.test(egyptianMobileDigits(value));

export const egyptianMobileE164 = (value: string): string =>
  `${EGYPT_DIAL_CODE}${egyptianMobileDigits(value)}`;

/**
 * Immediate feedback for the first national mobile digit.
 * Local entry starts with 0 or 1. Keep existing complete +20 / 0020 /
 * 201... paste formats working without triggering a false warning.
 */
export const egyptianPhoneStartError = (value: string): string => {
  const normalized = normalizeDigits(value).trim();
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') || digits.startsWith('1')) return '';
  if (normalized.startsWith('+') && ('20'.startsWith(digits) || digits.startsWith('20'))) return '';
  if (/^201[0125]\d{8}$/.test(digits)) return '';
  return 'رقم الموبايل غلط، لازم يبدأ بـ 0 أو 1.';
};
