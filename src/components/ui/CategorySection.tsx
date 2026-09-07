
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { MainCategory } from '@/lib/supabase';
import CategoryItem from './CategoryItem';
import CategorySkeleton from './CategorySkeleton';

interface CategorySectionProps {
  title: string;
  categories: MainCategory[];
  loading?: boolean;
  error?: boolean;
  hideTitle?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  title,
  categories,
  loading = false,
  error = false,
  hideTitle = false,
}) => {
  const navigate = useNavigate();

  const handleSeeMore = () => {
    navigate('/categories');
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          onClick={handleSeeMore}
          className="flex items-center text-primary text-sm"
          aria-label="عرض المزيد"
        >
          <span className="ml-1">عرض المزيد</span>
          <ChevronLeft size={16} />
        </button>
      </div>

      {error ? (
        <div className="text-center py-4 text-sm text-red-500">
          حدث خطأ أثناء تحميل الأقسام
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <CategorySkeleton key={index} />
              ))
            : categories.map((category) => (
                <CategoryItem 
                  key={category.id} 
                  category={category}
                  hideTitle={hideTitle}
                />
              ))}
        </div>
      )}
    </div>
  );
};

export default CategorySection;

