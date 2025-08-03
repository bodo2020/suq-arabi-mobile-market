
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import SubcategoryItem from '@/components/ui/SubcategoryItem';
import { MainCategory, Subcategory, getCategories, getSubcategories } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [categoriesData, subcategoriesData] = await Promise.all([
          getCategories(),
          getSubcategories(id)
        ]);
        
        const categoryData = categoriesData.find(cat => cat.id === id);
        if (categoryData) {
          setCategoryInfo(categoryData);
          setSubcategories(subcategoriesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubcategoryClick = (subcategoryId: string) => {
    navigate(`/category/${id}/subcategory/${subcategoryId}`);
  };

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={categoryInfo?.name || 'القسم'}
          showBackButton={true}
          onBack={() => navigate(-1)}
        />
        <div className={`flex justify-center items-center h-40 ${!isMobile ? 'mt-24' : ''}`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={categoryInfo?.name || 'القسم'}
          showBackButton={true}
          onBack={() => navigate(-1)}
        />

        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              {/* Subcategories Grid */}
              {subcategories.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
                  {subcategories.map(subcat => (
                    <SubcategoryItem
                      key={subcat.id}
                      subcategory={subcat}
                      isSelected={false}
                      onClick={handleSubcategoryClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  لا توجد أقسام فرعية في هذا القسم
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CategoryDetail;
