
import React from 'react';
import { Link } from 'react-router-dom';
import { MainCategory } from '@/lib/supabase';

interface CategoryItemProps {
  category: MainCategory;
}

// جعل الصورة أكبر واسم القسم أوضح
const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  return (
    <Link 
      to={`/category/${category.id}`} 
      className="category-item flex flex-col items-center"
    >
      <div className="h-24 w-24 md:h-32 md:w-32 rounded-lg flex items-center justify-center mb-2">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-24 w-24 md:h-32 md:w-32 object-contain"
        />
      </div>
      <span className="text-sm md:text-base text-center font-semibold line-clamp-1">{category.name}</span>
    </Link>
  );
};

export default CategoryItem;
