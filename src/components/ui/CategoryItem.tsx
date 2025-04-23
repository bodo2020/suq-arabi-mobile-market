
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

  // كبر المربع، وأضف إمكانية تمييز العنصر النشط
  return (
    <Link 
      to={onClick ? "#" : `/category/${category.id}`} 
      onClick={handleClick}
      className={
        `category-item flex flex-col items-center relative group
        ${isActive ? 'ring-2 ring-primary' : ''}`
      }
      style={{minWidth: '120px', minHeight: '120px'}}
    >
      <div className="h-28 w-28 md:h-32 md:w-32 rounded-lg flex items-center justify-center mb-2 bg-white group-hover:shadow-lg transition-shadow">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-24 w-24 md:h-28 md:w-28 object-contain"
        />
      </div>
      <span className="text-sm md:text-base text-center line-clamp-1 font-semibold">{category.name}</span>
    </Link>
  );
};

export default CategoryItem;
