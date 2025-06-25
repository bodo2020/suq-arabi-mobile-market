
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import CategoryItem from '@/components/ui/CategoryItem';
import SearchBar from '@/components/ui/SearchBar';
import { MainCategory, getCategories } from '@/lib/supabase';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-4 py-4">
        {/* Header */}
        <div className="flex items-center mb-6">
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

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar 
            placeholder="البحث في الأقسام..."
            onFocus={handleSearchFocus} 
            readOnly 
          />
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
    </MainLayout>
  );
};

export default Categories;
