import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  MainCategory, 
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
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subsubcategories, setSubsubcategories] = useState<Subsubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<'main' | 'sub' | 'subsub'>('main');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="bg-green-800 rounded-lg flex items-center justify-center" style={{ width: 48, height: 48 }}>
              <img
                src="/lovable-uploads/92e98f46-a146-43ea-9d99-ceef3b90bfd7.png"
                alt="Logo"
                className="w-8 h-8"
              />
            </div>
          </div>
          <div className="w-full max-w-md">
            <div className="hide-scrollbar">
              <form
                className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-100 relative bg-cover bg-center"
                style={{ backgroundImage: "" }}
                onSubmit={e => {e.preventDefault()}}
              >
                <img src="/lovable-uploads/92e98f46-a146-43ea-9d99-ceef3b90bfd7.png" className="w-5 h-5" alt="barcode" />
                <input
                  type="text"
                  value=""
                  placeholder="البحث عن منتجات..."
                  readOnly
                  className="flex-1 outline-none text-right text-sm placeholder:text-gray-400 bg-gray-50 cursor-pointer"
                />
                <span className="p-2">
                  <svg viewBox="0 0 24 24" width="20" height="20" className="text-gray-400"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99a1 1 0 0 0 1.32.08l.08-.08a1 1 0 0 0 0-1.42l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z"/></svg>
                </span>
              </form>
            </div>
          </div>
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
