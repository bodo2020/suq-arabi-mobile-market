import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { MainCategory, Subcategory, Subsubcategory, getCategories, getSubcategories, getSubsubcategories } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronLeft } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useNavigate } from 'react-router-dom';
import CategoryItem from '@/components/ui/CategoryItem';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subsubcategories, setSubsubcategories] = useState<Subsubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel<'main' | 'sub' | 'subsub'>('main');
  const [activeCategoryId, setActiveCategoryId<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId<string | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [storeInfo, setStoreInfo<any>(null);
  const [showSubsubAsChips, setShowSubsubAsChips<boolean>(false);

  // <<--- HANDLE MAIN, SUB AND SUBSUB AS TILES/CHIPS --->
  const handleMainCategoryClick = (id: string) => {
    setActiveCategoryId(id);
    setActiveLevel('sub');
    setShowSubsubAsChips(false);
  };

  const handleSubCategoryClick = (id: string) => {
    setActiveSubcategoryId(id);
    setActiveLevel('subsub');
    setShowSubsubAsChips(true);
  };

  const handleCategoryBack = () => {
    if (activeLevel === 'subsub') {
      setActiveLevel('sub');
      setActiveSubcategoryId(null);
      setShowSubsubAsChips(false);
    } else if (activeLevel === 'sub') {
      setActiveLevel('main');
      setActiveCategoryId(null);
    }
  };

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
    async function fetchStoreInfo() {
      try {
        const { getStoreInfo } = await import('@/lib/supabase');
        const data = await getStoreInfo();
        setStoreInfo(data);
      } catch (e) {
        setStoreInfo(null);
      }
    }
    fetchStoreInfo();
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

  // استخدم CategoryItem في كل المستويات للأقسام والباقي chips
  return <MainLayout>
    <div className="py-4">
      {storeInfo && <div className="flex justify-center mb-4">
            <img src={storeInfo.logo_url} alt={storeInfo.name} className="h-12 object-contain" />
        </div>}
      <div className="relative mb-4">
        <SearchBar
          onFocus={()=>navigate('/search')}
          readOnly
        />
      </div>
      <div className="flex items-center mb-3">
        {activeLevel !== 'main' && (
          <button onClick={handleCategoryBack} className="pr-2 py-0.5 text-primary underline text-sm">رجوع</button>
        )}
        <h2 className="text-lg font-bold mr-2">{getTitle()}</h2>
      </div>

      {(activeLevel === 'main') && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map(cat => (
            <CategoryItem
              key={cat.id}
              category={cat}
              onClick={() => handleMainCategoryClick(cat.id)}
            />
          ))}
        </div>
      )}

      {(activeLevel === 'sub') && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {subcategories.map(subcat => (
            <CategoryItem
              key={subcat.id}
              category={subcat}
              onClick={() => handleSubCategoryClick(subcat.id)}
            />
          ))}
        </div>
      )}

      {(activeLevel === 'subsub') && (
        <div className="mb-4 overflow-x-auto hide-scrollbar">
          <div className="flex space-x-2 space-x-reverse pb-2">
            {subsubcategories.map(subsubcat => (
              <button
                key={subsubcat.id}
                className="whitespace-nowrap px-4 py-2 rounded-full bg-primary text-white text-sm font-bold border border-primary hover:bg-primary/80 transition"
              >
                {subsubcat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeLevel !== 'main' && getDisplayItems().length === 0 && (
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
  </MainLayout>;
};

export default Categories;
