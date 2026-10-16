import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  hideTitle?: boolean;
  onClick?: (category: MainCategory) => void;
  variant?: 'default' | 'modern' | 'home';
}

const CategoryItem = ({ category, hideTitle = false, onClick, variant = 'default' }: CategoryItemProps) => {
  const handleClick = (event: React.MouseEvent) => {
    if (!onClick) return;
    event.preventDefault();
    onClick(category);
  };

  if (variant === 'home') {
    return (
      <Link
        to={`/category/${category.id}`}
        onClick={handleClick}
        className="group flex min-w-0 flex-col items-center rounded-2xl border border-transparent bg-[#f6f8f7] p-2 transition-colors hover:border-[#c8e0d2] hover:bg-[#fff5d3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`تصفح قسم ${category.name}`}
      >
        <div className="flex aspect-square w-full max-w-[104px] items-center justify-center overflow-hidden rounded-xl bg-white">
          {category.image_url ? (
            <img src={category.image_url} alt="" className="h-full w-full object-contain motion-safe:transition-transform motion-safe:group-hover:scale-105" loading="lazy" decoding="async" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} />
          ) : (
            <span aria-hidden="true" className="text-3xl font-black text-[#005931]">{category.name.charAt(0)}</span>
          )}
        </div>
        {!hideTitle && <span className="mt-2 w-full break-words text-center text-xs font-bold leading-5 text-[#005931] sm:text-sm">{category.name}</span>}
      </Link>
    );
  }

  if (variant === 'default') {
    return (
      <Link
        to={`/category/${category.id}`}
        className="group flex w-full flex-col items-center justify-center rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        onClick={handleClick}
        aria-label={`تصفح قسم ${category.name}`}
      >
        <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-[#f3f8f4] ring-1 ring-[#d8ebdf] transition-transform group-hover:-translate-y-0.5">
          {category.image_url ? (
            <img src={category.image_url} alt={category.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
          ) : (
            <span className="text-2xl">{category.name.charAt(0)}</span>
          )}
        </div>
        {!hideTitle && <span className="mt-2 line-clamp-2 text-center text-xs font-bold leading-5 text-[#005931] sm:text-sm">{category.name}</span>}
      </Link>
    );
  }

  return (
    <Link
      to={`/category/${category.id}`}
      onClick={handleClick}
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-[#d8ebdf] bg-white p-2 shadow-[0_8px_24px_rgba(0,89,49,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9acbb2] hover:shadow-[0_14px_34px_rgba(0,89,49,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      aria-label={`تصفح قسم ${category.name}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[18px] bg-[#f3f8f4]">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#eaf6ee] to-[#fff5d3] text-3xl font-black text-[#005931]">
            {category.name.charAt(0)}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
      </div>

      {!hideTitle && (
        <div className="flex min-h-[52px] items-center gap-1.5 px-1 pt-2.5">
          <span className="line-clamp-2 min-w-0 flex-1 text-right text-[13px] font-bold leading-5 text-slate-900 sm:text-sm">{category.name}</span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fff5d3] text-[#005931] transition-transform group-hover:-translate-x-0.5">
            <ChevronLeft size={15} strokeWidth={2.3} />
          </span>
        </div>
      )}
    </Link>
  );
};

export default React.memo(CategoryItem);
