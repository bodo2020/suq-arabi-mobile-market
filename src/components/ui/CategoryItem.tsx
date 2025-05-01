
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
    <div className="flex flex-col items-center">
      <Link 
        to={`/category/${category.id}`}
        onClick={handleClick}
        className={`
          category-item relative 
          rounded-2xl bg-[#F2FCE2] w-full
          ${isActive ? 'ring-2 ring-primary' : ''}
        `}
        style={{aspectRatio: '1'}}
      >
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="w-full h-full object-cover rounded-2xl"
        />
      </Link>
      <span className="text-sm text-center mt-1">{category.name}</span>
    </div>
  );
};

export default CategoryItem;
