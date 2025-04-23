
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

  // لتتبع المستوى والاختيار الحالي
  const [activeLevel, setActiveLevel] = useState<'main' | 'sub' | 'subsub'>('main');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [storeInfo, setStoreInfo] = useState<any>(null);

  // لما تضغط على main category يعرض الصفحة التالية للأقسام الفرعية
  const handleMainCategoryClick = (cat: MainCategory) => {
    setActiveCategoryId(cat.id);
    setActiveCategoryName(cat.name);
    setActiveLevel('sub');
    setActiveSubcategoryId(null);
    setSubsubcategories([]);
  };

  // لما تضغط على subcategory تظهر الشيبس بالأعلى
  const handleSubCategoryClick = (subcat: Subcategory) => {
    setActiveSubcategoryId(subcat.id);
    setActiveLevel('subsub');
  };

  // رجوع من subsub إلى sub أو من sub إلى main
  const handleCategoryBack = () => {
    if (activeLevel === 'subsub') {
      setActiveLevel('sub');
      setActiveSubcategoryId(null);
    } else if (activeLevel === 'sub') {
      setActiveLevel('main');
      setActiveCategoryId(null);
      setActiveCategoryName(null);
      setSubcategories([]);
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

  // احضار الأقسام الفرعية عند اختيار main
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

  // احضار الأقسام التفصيلية عند اختيار sub
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

  // التايتل حسب المستوى
  const getTitle = () => {
    switch (activeLevel) {
      case 'main':
        return 'الأقسام الرئيسية';
      case 'sub':
        return `أقسام ${activeCategoryName || ''}`;
      case 'subsub':
        return 'الأقسام التفصيلية';
      default:
        return 'الأقسام';
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        {storeInfo && (
          <div className="flex justify-center mb-4">
            <img src={storeInfo.logo_url} alt={storeInfo.name} className="h-12 object-contain" />
          </div>
        )}

        <div className="relative mb-4">
          <SearchBar
            onFocus={() => navigate('/search')}
            readOnly
          />
        </div>

        <div className="flex items-center mb-3">
          {activeLevel !== 'main' && (
            <button onClick={handleCategoryBack} className="pr-2 py-0.5 text-primary underline text-sm">رجوع</button>
          )}
          <h2 className="text-lg font-bold mr-2">{getTitle()}</h2>
        </div>

        {/* الأقسام الرئيسية */}
        {activeLevel === 'main' && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map(cat => (
              <CategoryItem
                key={cat.id}
                category={cat}
                onClick={() => handleMainCategoryClick(cat)}
              />
            ))}
          </div>
        )}

        {/* الأقسام الفرعية */}
        {activeLevel === 'sub' && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {subcategories.length > 0 ? (
              subcategories.map(subcat => (
                <CategoryItem
                  key={subcat.id}
                  category={{
                    ...subcat,
                    // لإظهـار اسم القسم الرئيسي بدل الفرعي
                    name: activeCategoryName || subcat.name,
                  }}
                  onClick={() => handleSubCategoryClick(subcat)}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7"></path>
                  <path d="M14 14v4"></path>
                  <path d="M10 14v4"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد أقسام فرعية</h3>
                <p className="text-sm text-gray-400">لا توجد أقسام فرعية في هذا القسم حالياً</p>
              </div>
            )}
          </div>
        )}

        {/* الشيبس للأقسام التفصيلية + أول واحدة جميع المنتجات */}
        {activeLevel === 'subsub' && (
          <div className="mb-4 overflow-x-auto hide-scrollbar">
            <div className="flex space-x-2 space-x-reverse pb-2">
              {/* chip لجميع المنتجات */}
              <button
                className="whitespace-nowrap px-4 py-2 rounded-full bg-primary text-white text-sm font-bold border border-primary hover:bg-primary/80 transition"
                onClick={() => {
                  // هنا يمكن عمل نفيجيت لصفحة تعرض كل المنتجات في هذا القسم الفرعي
                  navigate(`/category/${activeSubcategoryId}`);
                }}
              >
                جميع المنتجات
              </button>
              {subsubcategories.length > 0 ? subsubcategories.map(subsubcat => (
                <button
                  key={subsubcat.id}
                  className="whitespace-nowrap px-4 py-2 rounded-full bg-primary text-white text-sm font-bold border border-primary hover:bg-primary/80 transition"
                  // كل chip ممكن تعطيه حدث حسب الحاجة مثلاً نفيجيت إلى فلترة بهذا القسم التفصيلي
                  onClick={() => {
                    navigate(`/category/${subsubcat.id}`);
                  }}
                >
                  {/* يظهر دوماً اسم القسم الرئيسي في كل الشيبس */}
                  {activeCategoryName}
                </button>
              )) : (
                <button
                  className="whitespace-nowrap px-4 py-2 rounded-full bg-slate-200 text-gray-600 text-sm font-bold border border-gray-400 ml-2 cursor-not-allowed"
                  disabled
                >
                  لا توجد أقسام تفصيلية
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;

