import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import BrandText from '@/components/brand/BrandText';

/** Shared look for every home section card (categories, collections, rails). */
export const HOME_SECTION_CARD =
  'rounded-[28px] border border-[#dcefe4] bg-white bg-[linear-gradient(180deg,#f1faf4_0px,#ffffff_96px)] p-4 shadow-[0_6px_20px_rgba(0,89,49,0.05)] sm:p-5';

type HomeSectionHeaderProps = {
  title?: string | null;
  subtitle?: string | null;
  href?: string;
  hrefLabel?: string;
};

/** Brand section title: green heading with a gold accent bar and a mint "see all" pill. */
export default function HomeSectionHeader({ title, subtitle, href, hrefLabel = 'عرض الكل' }: HomeSectionHeaderProps) {
  if (!title && !subtitle && !href) return null;
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        {title && (
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#FFC120] to-[#cf9700]" />
            <h2 className="truncate text-[19px] font-black leading-7 text-[#005931]"><BrandText>{title}</BrandText></h2>
          </div>
        )}
        {subtitle && <p className="mt-0.5 pr-3.5 text-xs font-medium leading-5 text-slate-500"><BrandText>{subtitle}</BrandText></p>}
      </div>
      {href && (
        <Link
          to={href}
          className="flex min-h-9 shrink-0 items-center gap-0.5 rounded-full bg-[#eaf7ef] px-3 text-xs font-extrabold text-[#005931] ring-1 ring-[#cfe9da] transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]"
        >
          {hrefLabel}
          <ChevronLeft size={15} strokeWidth={2.4} />
        </Link>
      )}
    </div>
  );
}
