
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
        `category-item flex flex-col items-center relative group
        ${isActive ? 'ring-2 ring-primary' : ''}`
      }
      style={{minWidth: '120px', minHeight: hideLabel ? '90px' : '120px'}}
    >
      <div className="h-24 w-24 md:h-28 md:w-28 rounded-lg flex items-center justify-center bg-white group-hover:shadow-lg transition-shadow">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-20 w-20 md:h-24 md:w-24 object-contain"
        />
      </div>
      {!hideLabel && <span className="text-sm md:text-base text-center line-clamp-1 font-semibold mt-2">{category.name}</span>}
    </Link>
  );
};

export default CategoryItem;
