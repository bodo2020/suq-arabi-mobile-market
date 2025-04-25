
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  onClick?: (category: MainCategory) => void;
  isActive?: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onClick, isActive }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(category);
    }
  };

  return (
    <Link 
      to={`/category/${category.id}`}
      onClick={handleClick}
      className={`
        category-item flex items-center justify-center relative 
        rounded-2xl bg-[#F2FCE2] p-3
        ${isActive ? 'ring-2 ring-primary' : ''}
      `}
      style={{aspectRatio: '1'}}
    >
      <div className="h-full w-full rounded-2xl flex items-center justify-center p-2">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-full w-full object-contain"
        />
      </div>
    </Link>
  );
};

export default CategoryItem;
