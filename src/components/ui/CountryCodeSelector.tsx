import React from 'react';

export interface Country {
  name: string;
  code: string;
  dialCode: string;
  flag: string;
}

interface CountryCodeSelectorProps {
  value: Country;
  onChange: (country: Country) => void;
  className?: string;
}

// Compatibility component: Egypt is the sole supported customer-auth country
// in this launch. No country dropdown is exposed until international support ships.
export const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({ className = '' }) => (
  <span
    className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-[#d6e6dc] bg-[#f2f8f4] px-3 font-bold text-[#005931] ${className}`}
    aria-label="مصر، مفتاح الدولة ثابت +20"
    dir="ltr"
  >
    <span aria-hidden="true">🇪🇬</span>
    <bdi dir="ltr">+20</bdi>
  </span>
);

export default CountryCodeSelector;
