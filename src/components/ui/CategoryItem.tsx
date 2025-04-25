
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
      className={
        `category-item flex items-center justify-center relative group 
        rounded-lg bg-green-50 p-2
        ${isActive ? 'ring-2 ring-primary' : ''}`
      }
      style={{minWidth: '180px', minHeight: '180px'}}
    >
      <div className="h-full w-full rounded-lg flex items-center justify-center">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-full w-full object-contain rounded-lg"
        />
      </div>
    </Link>
  );
};

export default CategoryItem;
