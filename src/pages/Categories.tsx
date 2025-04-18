
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Category, 
  Subcategory, 
  Subsubcategory, 
  getCategories, 
  getSubcategories, 
  getSubsubcategories 
} from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft } from 'lucide-react';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subsubcategories, setSubsubcategories] = useState<Subsubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<'main' | 'sub' | 'subsub'>('main');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Fetch main categories on initial load
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

  // Fetch subcategories when a main category is selected
  useEffect(() => {
    if (activeCategoryId && activeLevel === 'sub') {
      const fetchSubcategories = async () => {
        setLoading(true);
        try {
          const data = await getSubcategories(activeCategoryId);
          setSubcategories(data as Subcategory[]);
        } catch (error) {
          console.error('Error fetching subcategories:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSubcategories();
    }
  }, [activeCategoryId, activeLevel]);

  // Fetch subsubcategories when a subcategory is selected
  useEffect(() => {
    if (activeSubcategoryId && activeLevel === 'subsub') {
      const fetchSubsubcategories = async () => {
        setLoading(true);
        try {
          const data = await getSubsubcategories(activeSubcategoryId);
          setSubsubcategories(data as Subsubcategory[]);
        } catch (error) {
          console.error('Error fetching subsubcategories:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchSubsubcategories();
    }
  }, [activeSubcategoryId, activeLevel]);

  // Get the correct items to display based on current level
  const getDisplayItems = () => {
    switch (activeLevel) {
      case 'main':
        return categories;
      case 'sub':
        return subcategories;
      case 'subsub':
        return subsubcategories;
      default:
        return [];
    }
  };

  const handleCategoryClick = (id: string) => {
    // Check if this category has subcategories
    if (activeLevel === 'main') {
      setActiveCategoryId(id);
      setActiveLevel('sub');
    } else if (activeLevel === 'sub') {
      setActiveSubcategoryId(id);
      setActiveLevel('subsub');
    }
  };

  const handleBackClick = () => {
    if (activeLevel === 'subsub') {
      setActiveLevel('sub');
      setActiveSubcategoryId(null);
    } else if (activeLevel === 'sub') {
      setActiveLevel('main');
      setActiveCategoryId(null);
    }
  };

  // Get title based on current level
  const getTitle = () => {
    switch (activeLevel) {
      case 'main':
        return 'الأقسام الرئيسية';
      case 'sub':
        return 'الأقسام الفرعية';
      case 'subsub':
        return 'الأقسام التفصيلية';
      default:
        return 'الأقسام';
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center justify-between mb-4">
          {activeLevel !== 'main' && (
            <button 
              onClick={handleBackClick}
              className="text-primary"
            >
              الرجوع للخلف
            </button>
          )}
          <h1 className="text-xl font-bold text-center">
            {getTitle()}
          </h1>
          <div className="w-24"></div> {/* Spacer for alignment */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {getDisplayItems().map((item) => (
              <div 
                key={item.id}
                className="flex flex-col items-center cursor-pointer"
                onClick={() => handleCategoryClick(item.id)}
              >
                <div className="h-20 w-20 md:h-24 md:w-24 rounded-lg flex items-center justify-center mb-2">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="h-20 w-20 md:h-24 md:w-24 object-contain"
                  />
                </div>
                <h3 className="text-sm text-center line-clamp-2">{item.name}</h3>
              </div>
            ))}

            {/* Show "No items" message when no subcategories or subsubcategories are found */}
            {(activeLevel !== 'main' && getDisplayItems().length === 0) && (
              <div className="col-span-full flex flex-col items-center justify-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7"></path>
                  <path d="M14 14v4"></path>
                  <path d="M10 14v4"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد أقسام</h3>
                <p className="text-sm text-gray-400">لا توجد أقسام فرعية في هذا القسم حالياً</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
