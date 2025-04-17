
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Category, getCategories } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('main');
  const [parentId, setParentId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data as Category[]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Filter categories based on level and parent_id
  const filteredCategories = categories.filter(category => {
    if (activeLevel === 'main') {
      return category.level === 'main';
    } else if (activeLevel === 'sub') {
      return category.parent_id === parentId;
    }
    return false;
  });

  const handleCategoryClick = (category: Category) => {
    // If the category has subcategories, show them instead of navigating
    const hasSubcategories = categories.some(cat => cat.parent_id === category.id);
    
    if (hasSubcategories) {
      setActiveLevel('sub');
      setParentId(category.id);
      return;
    }
  };

  const handleBackToMain = () => {
    setActiveLevel('main');
    setParentId(null);
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center justify-between mb-4">
          {activeLevel === 'sub' && (
            <button 
              onClick={handleBackToMain}
              className="text-primary"
            >
              الرجوع للأقسام الرئيسية
            </button>
          )}
          <h1 className="text-xl font-bold text-center">
            {activeLevel === 'main' ? 'الأقسام الرئيسية' : 'الأقسام الفرعية'}
          </h1>
          <div className="w-24"></div> {/* Spacer for alignment */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {filteredCategories.map((category) => (
              <Link 
                key={category.id}
                to={`/category/${category.id}`}
                className="flex flex-col items-center"
                onClick={(e) => {
                  const hasSubcategories = categories.some(cat => cat.parent_id === category.id);
                  if (hasSubcategories) {
                    e.preventDefault();
                    handleCategoryClick(category);
                  }
                }}
              >
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-lg flex items-center justify-center mb-2">
                  <img 
                    src={category.image_url} 
                    alt={category.name} 
                    className="h-20 w-20 md:h-24 md:w-24 object-contain"
                  />
                </div>
                <h3 className="text-sm text-center line-clamp-2">{category.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
