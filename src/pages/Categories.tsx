
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import { MainCategory, getCategories } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (category: MainCategory) => {
    navigate(`/category/${category.id}`);
  };

  const handleSearchFocus = () => {
    navigate('/search');
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar searchPlaceholder="البحث في الأقسام..." onSearchFocus={handleSearchFocus} />
        <div className={`flex justify-center items-center h-40 ${!isMobile ? 'mt-32' : ''}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        {/* Top Navigation Bar */}
        <TopNavBar 
          searchPlaceholder="البحث في الأقسام..."
          onSearchFocus={handleSearchFocus}
          hideLogo={true}
          pageTitle="جميع الأقسام"
        />

        {/* Main Content with proper spacing */}
        <div className={`${!isMobile ? 'mt-24' : 'mt-6'}`}>
          {/* Header with back button - only show on desktop */}
          {!isMobile && (
            <div className="w-full px-4 mb-6">
              <div className="max-w-md mx-auto md:max-w-4xl">
                <div className="flex items-center">
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="الرجوع"
                  >
                    <ArrowRight size={24} className="text-primary" />
                  </button>
                  <h1 className="text-xl font-bold flex-1 text-center text-primary">جميع الأقسام</h1>
                  <div className="w-10"></div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Grid */}
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {categories.map(category => (
                  <CategoryItem 
                    key={category.id} 
                    category={category} 
                    onClick={handleCategoryClick}
                  />
                ))}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لا توجد أقسام متاحة حاليًا
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Categories;
