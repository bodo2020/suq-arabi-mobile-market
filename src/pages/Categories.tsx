
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Home, Grid, ShoppingCart, User } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import CategoryItem from '@/components/ui/CategoryItem';
import SearchBar from '@/components/ui/SearchBar';
import { MainCategory, getCategories } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();
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
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container px-0 py-0">
        {/* Header Section with Primary Color Background - Full Screen Width */}
        <div className="bg-primary w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] pt-6 pb-6 mb-6 rounded-b-3xl">
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              <div className="flex items-center mb-2 gap-3">
                <div className="flex flex-col items-center">
                  <img 
                    src="/lovable-uploads/f2dcd6d9-e684-4c8f-ba39-879321421b5e.png" 
                    alt="المعداوي" 
                    className="h-16 w-16 mb-1 object-contain" 
                    loading="eager" 
                  />
                  <span className="text-white text-sm font-bold">المعداوي</span>
                </div>
                
                {/* Search Bar with Desktop Navigation */}
                <div className="flex-1 relative">
                  <SearchBar 
                    placeholder="البحث في الأقسام..."
                    onFocus={handleSearchFocus} 
                    readOnly 
                  />
                  
                  {/* Desktop Navigation - Inside Search Area */}
                  {!isMobile && (
                    <div className="absolute left-20 top-1/2 transform -translate-y-1/2 flex gap-6">
                      <button
                        onClick={() => navigate('/')}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                      >
                        <Home size={20} />
                        <span className="text-xs mt-1">الرئيسية</span>
                      </button>

                      <button
                        onClick={() => navigate('/categories')}
                        className="flex flex-col items-center text-white transition-colors"
                      >
                        <Grid size={20} />
                        <span className="text-xs mt-1">الأقسام</span>
                      </button>

                      <button
                        onClick={() => navigate('/cart')}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-colors relative"
                      >
                        <ShoppingCart size={20} />
                        <span className="text-xs mt-1">السلة</span>
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-2 bg-white text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => navigate('/account')}
                        className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                      >
                        <User size={20} />
                        <span className="text-xs mt-1">الحساب</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Navigation - Below Search Bar */}
              {isMobile && (
                <div className="flex justify-center gap-8 mt-4">
                  <button
                    onClick={() => navigate('/')}
                    className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                  >
                    <Home size={24} />
                    <span className="text-xs mt-1">الرئيسية</span>
                  </button>

                  <button
                    onClick={() => navigate('/categories')}
                    className="flex flex-col items-center text-white transition-colors"
                  >
                    <Grid size={24} />
                    <span className="text-xs mt-1">الأقسام</span>
                  </button>

                  <button
                    onClick={() => navigate('/cart')}
                    className="flex flex-col items-center text-white/80 hover:text-white transition-colors relative"
                  >
                    <ShoppingCart size={24} />
                    <span className="text-xs mt-1">السلة</span>
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-white text-primary text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => navigate('/account')}
                    className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
                  >
                    <User size={24} />
                    <span className="text-xs mt-1">الحساب</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Header with back button */}
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

        {/* Categories Grid */}
        <div className="w-full px-4">
          <div className="max-w-md mx-auto md:max-w-4xl">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
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
    </MainLayout>
  );
};

export default Categories;
