
import React, { useEffect, useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { MainCategory, Subcategory, getCategories, getSubcategories, getProducts, Product } from '@/lib/supabase';
import { ChevronLeft } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useNavigate } from 'react-router-dom';
import CategoryItem from '@/components/ui/CategoryItem';
import ProductCard from '@/components/ui/ProductCard';
import CategoryScrollArea, { CategoryScrollAreaRef } from '@/components/ui/CategoryScrollArea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<'main' | 'sub'>('main');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [subcategoryProducts, setSubcategoryProducts] = useState<{ [key: string]: Product[] }>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const scrollAreaRef = useRef<CategoryScrollAreaRef>(null);

  const isMobile = window.innerWidth <= 768;
  const navigate = useNavigate();

  // Handle main category click to show subcategories
  const handleMainCategoryClick = (cat: MainCategory) => {
    setActiveCategoryId(cat.id);
    setActiveCategoryName(cat.name);
    setActiveLevel('sub');
    loadSubcategoriesAndProducts(cat.id);
  };

  // Back button handler
  const handleCategoryBack = () => {
    setActiveLevel('main');
    setActiveCategoryId(null);
    setActiveCategoryName(null);
    setSubcategories([]);
    setSubcategoryProducts({});
    setAllProducts([]);
    setActiveSubcategoryId(null);
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcatId: string) => {
    setActiveSubcategoryId(subcatId);
    
    // Scroll to the subcategory's products section
    setTimeout(() => {
      scrollAreaRef.current?.scrollToSection(`subcategory-${subcatId}`);
    }, 100);
  };

  // Load subcategories and their products
  const loadSubcategoriesAndProducts = async (categoryId: string) => {
    setLoading(true);
    try {
      // Get subcategories for the selected main category
      const subcatsData = await getSubcategories(categoryId);
      setSubcategories(subcatsData as Subcategory[]);
      
      // Get all products for the main category
      const productsData = await getProducts(categoryId, false);
      setAllProducts(productsData as Product[]);
      
      // Organize products by subcategory
      const productsBySubcategory: { [key: string]: Product[] } = {};
      
      // First initialize all subcategories with empty arrays
      for (const subcat of subcatsData) {
        productsBySubcategory[subcat.id] = [];
      }
      
      // Then populate with products
      for (const subcat of subcatsData) {
        // Get products specific to this subcategory
        const subcatProducts = await getProducts(subcat.id, true);
        productsBySubcategory[subcat.id] = subcatProducts as Product[];
      }
      
      setSubcategoryProducts(productsBySubcategory);
      
      // Set the first subcategory as active if available
      if (subcatsData.length > 0 && !activeSubcategoryId) {
        setActiveSubcategoryId(subcatsData[0].id);
      }
    } catch (error) {
      console.error('Error loading subcategories and products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load main categories on initial render
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

  // Load store info
  useEffect(() => {
    async function fetchStoreInfo() {
      try {
        const data = await getStoreInfo();
        setStoreInfo(data);
      } catch (e) {
        setStoreInfo(null);
      }
    }
    fetchStoreInfo();
  }, []);

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

        {activeLevel === 'main' ? (
          <>
            <div className="flex items-center mb-3">
              <h2 className="text-lg font-bold mr-2">الأقسام الرئيسية</h2>
            </div>
            
            {/* Main categories grid without names */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              {categories.map(cat => (
                <CategoryItem
                  key={cat.id}
                  category={cat}
                  onClick={handleMainCategoryClick}
                  hideLabel={true}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center mb-3">
              <button onClick={handleCategoryBack} className="pr-1 py-0.5 text-primary flex items-center">
                <ChevronLeft size={20} className="ml-1" />
                <span className="text-sm font-medium">رجوع</span>
              </button>
              <h2 className="text-lg font-bold mr-2">{activeCategoryName}</h2>
            </div>
            
            {/* Subcategories as horizontal chips */}
            <div className="sticky top-0 z-10 bg-white pb-2">
              <div className="mb-4 overflow-x-auto hide-scrollbar">
                <div className="flex space-x-2 space-x-reverse pb-2">
                  {subcategories.map(subcat => (
                    <Badge
                      key={subcat.id}
                      variant={activeSubcategoryId === subcat.id ? "default" : "outline"}
                      className="py-2 px-4 cursor-pointer whitespace-nowrap"
                      onClick={() => handleSubcategorySelect(subcat.id)}
                    >
                      {subcat.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Products by subcategory with scrolling */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <CategoryScrollArea ref={scrollAreaRef}>
                {subcategories.map(subcat => (
                  <div 
                    key={subcat.id} 
                    id={`subcategory-${subcat.id}`}
                    className="mb-8"
                  >
                    <h3 className="font-bold text-base mb-3">{subcat.name}</h3>
                    
                    {subcategoryProducts[subcat.id]?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {subcategoryProducts[subcat.id].map(product => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <Card className="p-6 text-center">
                        <p className="text-gray-500">لا توجد منتجات في هذا القسم</p>
                      </Card>
                    )}
                  </div>
                ))}
              </CategoryScrollArea>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
