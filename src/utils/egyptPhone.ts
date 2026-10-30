import { localPhoneDigits } from '@/utils/authUi';

export const EGYPT_DIAL_CODE = '+20';
export const EGYPT_COUNTRY_CODE = 'EG';

// Egyptian mobiles use 010, 011, 012 or 015 in national format.
// Always normalize Arabic/Persian digits and remove 0 or +20 before validation.
export const egyptianMobileDigits = (value: string): string =>
  localPhoneDigits(value, EGYPT_DIAL_CODE, EGYPT_COUNTRY_CODE);

export const isValidEgyptianMobile = (value: string): boolean =>
  /^1[0125]\d{8}$/.test(egyptianMobileDigits(value));

export const egyptianMobileE164 = (value: string): string =>
  `${EGYPT_DIAL_CODE}${egyptianMobileDigits(value)}`;
