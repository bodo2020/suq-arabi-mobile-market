
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductFilters from '@/components/ui/ProductFilters';
import ModernLocationSelector from '@/components/ui/ModernLocationSelector';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';

const sortOptions = [
  { label: "الأحدث", value: "newest" },
  { label: "السعر: من الأقل للأعلى", value: "price_asc" },
  { label: "السعر: من الأعلى للأقل", value: "price_desc" },
  { label: "أبجدياً: أ-ي", value: "name_asc" },
  { label: "أبجدياً: ي-أ", value: "name_desc" },
];

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useUser();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentSort, setCurrentSort] = useState("newest");
  const [subcategoriesWithProducts, setSubcategoriesWithProducts] = useState<Subcategory[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);

  // Check if user has location selected
  useEffect(() => {
    const checkLocationStatus = () => {
      const hasLocation = localStorage.getItem('locationSelected') === 'true' || 
                         localStorage.getItem('userArea');
      
      if (!hasLocation) {
        setShowLocationSelector(true);
      }
    };

    checkLocationStatus();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id || products.length > 0) return;
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
          
          const productsData = await getProducts(id, false);
          setAllProducts(productsData);
          setProducts(productsData);

          // Filter subcategories that have products
          const subcategoriesWithProductsFiltered = subcategoriesData.filter(subcat => 
            productsData.some(product => product.subcategory_id === subcat.id)
          );
          setSubcategoriesWithProducts(subcategoriesWithProductsFiltered);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, products.length]);

  const handleSubcategorySelect = (subcatId: string | null) => {
    setSelectedSubcategory(subcatId);
    
    if (!subcatId) {
      setProducts(sortProducts(allProducts, currentSort));
    } else {
      const subcategoryProducts = allProducts.filter(
        product => product.subcategory_id === subcatId
      );
      setProducts(sortProducts(subcategoryProducts, currentSort));
    }

    if (productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const sortProducts = (productsToSort: Product[], sortType: string) => {
    const sortedProducts = [...productsToSort];
    switch (sortType) {
      case "price_asc":
        return sortedProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price_desc":
        return sortedProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "name_asc":
        return sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
      case "name_desc":
        return sortedProducts.sort((a, b) => b.name.localeCompare(a.name));
      case "newest":
      default:
        return sortedProducts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  const handleSortChange = (value: string) => {
    setCurrentSort(value);
    setProducts(sortProducts(products, value));
  };

  const handleFiltersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleLocationSelected = (location: any) => {
    setShowLocationSelector(false);
  };

  if (showLocationSelector) {
    return (
      <MainLayout>
        <ModernLocationSelector onLocationSelected={handleLocationSelected} />
      </MainLayout>
    );
  }

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
        {/* Top Navigation Bar with back button */}
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={categoryInfo?.name || 'القسم'}
          showBackButton={true}
          onBack={() => navigate(-1)}
        />

        {/* Main Content with proper spacing */}
        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              <div className="sticky top-0 z-10 mb-4 bg-white">
                {/* Only show subcategories filter if there are subcategories with products */}
                {subcategoriesWithProducts.length > 0 && (
                  <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 p-2 whitespace-nowrap min-w-max" onClick={handleFiltersClick}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSubcategorySelect(null);
                        }}
                        className={`px-4 py-2 rounded-full text-sm ${
                          selectedSubcategory === null 
                            ? 'bg-[#d3ffb3] text-[#005931]' 
                            : 'bg-transparent border border-[#005931] text-[#005931]'
                        }`}
                      >
                        جميع المنتجات
                      </button>
                      {subcategoriesWithProducts.map(subcat => (
                        <button
                          key={subcat.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubcategorySelect(subcat.id);
                          }}
                          className={`px-4 py-2 rounded-full text-sm ${
                            selectedSubcategory === subcat.id 
                              ? 'bg-[#d3ffb3] text-[#005931]' 
                              : 'bg-transparent border border-[#005931] text-[#005931]'
                          }`}
                        >
                          {subcat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div onClick={handleFiltersClick}>
                  <ProductFilters
                    onSortChange={handleSortChange}
                    sortOptions={sortOptions}
                    currentSort={currentSort}
                  />
                </div>
              </div>

              <div ref={productsRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {products.map((product) => (
                  <div key={product.id} className="flex-shrink-0">
                    <ProductCard key={product.id} product={product} />
                  </div>
                ))}
              </div>

              {products.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  لا توجد منتجات في هذا القسم
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
