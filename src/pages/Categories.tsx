
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import CategoryItem from '@/components/ui/CategoryItem';
import SearchBar from '@/components/ui/SearchBar';
import { MainCategory, getCategories } from '@/lib/supabase';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    area?: string | null;
    neighborhood?: string | null;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        // Load user location
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);
        const area = localStorage.getItem('userArea');
        const neighborhood = localStorage.getItem('userNeighborhood');
        if (area || neighborhood) {
          setUserLocation({ area, neighborhood });
        }
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

  const handleChangeLocation = () => {
    navigate('/address-manager');
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
        {/* Header Section with Primary Color Background */}
        <div className="bg-primary w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] pt-6 pb-6 mb-3 rounded-b-3xl">
          <div className="max-w-md mx-auto px-4">
            <div className="flex items-start mb-2">
              <div className="flex flex-col items-center ml-3">
                <img src="/lovable-uploads/f2dcd6d9-e684-4c8f-ba39-879321421b5e.png" alt="المعداوي" className="h-16 w-16 mb-1 object-contain" loading="eager" />
                <span className="text-white text-sm font-bold">المعداوي</span>
              </div>
              
              <div className="flex-1">
                <SearchBar 
                  placeholder="البحث في الأقسام..."
                  onFocus={handleSearchFocus} 
                  readOnly 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Section - Outside the colored background */}
        <div className="max-w-md mx-auto px-4 mb-4">
          <div className="flex items-center">
            <MapPin size={16} className="text-primary ml-2" />
            <span className="text-gray-600 text-sm">التوصيل إلى</span>
            <button 
              onClick={handleChangeLocation}
              className="text-primary font-bold text-sm mr-2 underline decoration-2 underline-offset-2"
            >
              {userLocation?.area || userAddress || "اختر عنوانك"}
              {userLocation?.neighborhood && <span className="mr-1">، {userLocation?.neighborhood}</span>}
            </button>
          </div>
        </div>

        {/* Header with back button */}
        <div className="flex items-center mb-6 px-4">
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

        {/* Categories Grid */}
        <div className="px-4">
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
      </div>
    </MainLayout>
  );
};

export default Categories;
