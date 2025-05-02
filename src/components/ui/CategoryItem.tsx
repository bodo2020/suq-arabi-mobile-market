
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  hideTitle?: boolean;
}

const CategoryItem = ({ category, hideTitle = false }: CategoryItemProps) => {
  return (
    <Link 
      to={`/category/${category.id}`}
      className="flex flex-col items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100"
    >
      <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={category.name}
            className="h-12 w-12 md:h-16 md:w-16 object-contain"
          />
        ) : (
          <span className="text-2xl">{category.name.charAt(0)}</span>
        )}
      </div>
      
      {!hideTitle && (
        <span className="mt-2 text-xs text-center line-clamp-2">{category.name}</span>
      )}
    </Link>
  );
};

export default CategoryItem;
