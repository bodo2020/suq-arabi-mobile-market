
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
    <Link to={`/category/${category.id}`} className="flex flex-col items-center justify-center rounded-lg p-1 transition-colors hover:bg-gray-100 w-full" onClick={handleClick}>
      <div className="w-full aspect-square bg-primary/10 flex items-center justify-center overflow-hidden rounded-lg">
        {category.image_url ? (
          <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-2xl">{category.name.charAt(0)}</span>
        )}
      </div>
      
      {!hideTitle && (
        <span className="text-sm text-center mt-1">{category.name}</span>
      )}
    </Link>
  );
};

export default CategoryItem;

