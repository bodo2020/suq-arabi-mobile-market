import React from 'react';
import { Link } from 'react-router-dom';
import BrandMark from '@/components/brand/BrandMark';
import BrandWordmark from '@/components/brand/BrandWordmark';

type HeaderBrandProps = {
  compact?: boolean;
  iconOnly?: boolean;
  category?: boolean;
  className?: string;
};

/** The same approved Super Marko artwork on every customer header. */
export default function HeaderBrand({ compact = false, iconOnly = false, category = false, className = '' }: HeaderBrandProps) {
  return (
    <Link
      to="/"
      aria-label="سوبر ماركو — الرئيسية"
      className={`inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931] ${className}`}
    >
      <BrandMark
        variant="mark"
        className={compact ? 'h-[29px] w-[22px]' : 'h-[35px] w-[27px] sm:h-[39px] sm:w-[29px]'}
      />
      {!iconOnly && <BrandWordmark className={compact ? 'brand-name--header' : category ? 'brand-name--home brand-name--categories' : 'brand-name--home'} />}
    </Link>
  );
}
