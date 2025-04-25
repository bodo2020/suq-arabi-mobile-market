
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
  onClick?: (category: MainCategory) => void;
  isActive?: boolean;
  hideLabel?: boolean;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, onClick, isActive, hideLabel }) => {
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
      className={
        `category-item flex flex-col items-center relative group pr-0 p-1
        ${isActive ? 'ring-2 ring-primary' : ''}`
      }
      style={{minWidth: '140px', minHeight: hideLabel ? '140px' : '170px'}}
    >
      <div className="h-full w-full rounded-lg flex items-center justify-center bg-white group-hover:shadow-lg transition-shadow">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-full w-full object-cover rounded-lg"
        />
      </div>
      {!hideLabel && <span className="text-sm md:text-base text-center line-clamp-1 font-semibold mt-2">{category.name}</span>}
    </Link>
  );
};

export default CategoryItem;
