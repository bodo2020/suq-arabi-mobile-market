import type { HTMLAttributes } from 'react';

// Brand lettering approved for display. Preserve each tatweel (U+0640):
// 6 after س, 1 after ب, and 2 after م. There is no space between the halves.
const FIRST_HALF = 'ســــــوبـر';
const SECOND_HALF = 'مــاركو';
export const SUPER_MARKO_WORDMARK = FIRST_HALF + SECOND_HALF;
export const SUPER_MARKO_ACCESSIBLE_NAME = 'سوبر ماركو';

type BrandWordmarkProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'>;

/** Shared visual wordmark; keep this component consistent across app screens. */
export default function BrandWordmark({ className = '', ...props }: BrandWordmarkProps) {
  return (
    <span
      {...props}
      className={`brand-name ${className}`.trim()}
      dir="rtl"
      role="img"
      aria-label={SUPER_MARKO_ACCESSIBLE_NAME}
    >
      <span aria-hidden="true" className="brand-name__super">{FIRST_HALF}</span>
      <span aria-hidden="true" className="brand-name__marko">{SECOND_HALF}</span>
    </span>
  );
}
