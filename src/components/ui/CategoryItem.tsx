import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  hideTitle?: boolean;
  onClick?: (category: MainCategory) => void;
  variant?: 'default' | 'modern';
}

const CategoryItem = ({ category, hideTitle = false, onClick, variant = 'default' }: CategoryItemProps) => {
  const handleClick = (event: React.MouseEvent) => {
    if (!onClick) return;
    event.preventDefault();
    onClick(category);
  };

  if (variant === 'default') {
    return (
      <Link
        to={`/category/${category.id}`}
        className="group flex w-full flex-col items-center justify-center rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={handleClick}
        aria-label={`تصفح قسم ${category.name}`}
      >
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-green-50 ring-1 ring-green-100 transition-transform group-hover:-translate-y-0.5">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
          ) : (
            <span className="text-2xl">{category.name.charAt(0)}</span>
          )}
        </div>
        {!hideTitle && <span className="mt-2 line-clamp-2 text-center text-xs font-semibold leading-5 text-gray-800 sm:text-sm">{category.name}</span>}
      </Link>
    );
  }

  return (
    <Link
      to={`/category/${category.id}`}
      onClick={handleClick}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-emerald-100/80 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(0,89,49,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={`تصفح قسم ${category.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f0faf5]">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 text-3xl font-black text-[#005931]">
            {category.name.charAt(0)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {!hideTitle && (
        <div className="flex min-h-[52px] items-center gap-1.5 px-1 pt-2.5">
          <span className="line-clamp-2 min-w-0 flex-1 text-right text-[13px] font-bold leading-5 text-slate-900 sm:text-sm">{category.name}</span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[#005931] transition-transform group-hover:-translate-x-0.5">
            <ChevronLeft size={15} strokeWidth={2.3} />
          </span>
        </div>
      )}
    </Link>
  );
};

export default React.memo(CategoryItem);
