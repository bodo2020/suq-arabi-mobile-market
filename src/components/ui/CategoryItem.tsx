
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  hideTitle?: boolean;
  onClick?: (category: MainCategory) => void;
}

const CategoryItem = ({
  category,
  hideTitle = false,
  onClick
}: CategoryItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(category);
    }
  };

  return (
    <Link to={`/category/${category.id}`} className="group flex w-full flex-col items-center justify-center rounded-2xl p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={handleClick}>
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-green-50 ring-1 ring-green-100 transition-transform group-hover:-translate-y-0.5">
        {category.image_url ? (
          <img src={category.image_url} alt={category.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <span className="text-2xl">{category.name.charAt(0)}</span>
        )}
      </div>
      
      {!hideTitle && (
        <span className="mt-2 line-clamp-2 text-center text-xs font-semibold leading-5 text-gray-800 sm:text-sm">{category.name}</span>
      )}
    </Link>
  );
};

export default CategoryItem;

