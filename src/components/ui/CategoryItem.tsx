
import React from 'react';
import { Link } from 'react-router-dom';
import { Category } from '@/lib/supabase';

interface CategoryItemProps {
  category: Category;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  return (
    <Link 
      to={`/category/${category.id}`} 
      className="category-item"
    >
      <div className="h-16 w-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-2">
        <img 
          src={category.image_url} 
          alt={category.name} 
          className="h-10 w-10 object-contain"
        />
      </div>
      <span className="text-xs text-center line-clamp-1">{category.name}</span>
    </Link>
  );
};

export default CategoryItem;
