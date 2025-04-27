
import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import CategoryItem from '@/components/ui/CategoryItem';
import { MainCategory } from '@/lib/supabase';

interface CategoriesSectionProps {
  categories: MainCategory[];
  isMobile: boolean;
  onCategoryClick: (category: MainCategory) => void;
}

const CategoriesSection: React.FC<CategoriesSectionProps> = ({
  categories,
  isMobile,
  onCategoryClick,
}) => {
  const visibleCategories = isMobile ? categories.slice(0, 3) : categories.slice(0, 6);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">الأقسام</h2>
        <Link to="/categories" className="flex items-center text-primary text-sm">
          عرض الكل
          <ChevronLeft size={16} />
        </Link>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {visibleCategories.map(category => (
          <CategoryItem 
            key={category.id} 
            category={category} 
            onClick={onCategoryClick} 
          />
        ))}
        {categories.length > (isMobile ? 3 : 6) && (
          <Link to="/categories" className="category-item flex flex-col items-center">
            <div className="h-28 w-28 md:h-32 md:w-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
              <ChevronLeft size={24} />
            </div>
            <span className="text-sm md:text-base text-center">عرض الكل</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default CategoriesSection;
