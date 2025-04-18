
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  return (
    <Link 
      to={`/category/${category.id}`} 
      className="category-item flex flex-col items-center"
    >
      <div className="h-20 w-20 md:h-24 md:w-24 rounded-lg flex items-center justify-center mb-2">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-20 w-20 md:h-24 md:w-24 object-contain"
        />
      </div>
      <span className="text-xs md:text-sm text-center line-clamp-1">{category.name}</span>
    </Link>
  );
};

export default CategoryItem;
