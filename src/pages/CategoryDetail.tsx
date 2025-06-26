import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Home, Grid, ShoppingCart, User } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import ProductFilters from '@/components/ui/ProductFilters';
import SearchBar from '@/components/ui/SearchBar';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories } from '@/lib/supabase';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();
  const isMobile = useIsMobile();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [currentSort, setCurrentSort] = useState("newest");

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
                    placeholder={`البحث في ${categoryInfo?.name || 'القسم'}...`}
                    readOnly={true}
                    onFocus={handleSearchFocus}
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
                        className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
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
                    className="flex flex-col items-center text-white/80 hover:text-white transition-colors"
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

        <div className="w-full px-4">
          <div className="max-w-md mx-auto md:max-w-4xl">
            <div className="flex items-center mb-4">
              <button onClick={() => navigate(-1)} className="p-2">
                <ArrowRight size={24} />
              </button>
              <h1 className="text-xl font-bold flex-1 text-center">
                {categoryInfo?.name}
              </h1>
              <div className="w-10"></div>
            </div>

            <div className="sticky top-0 z-10 mb-4 bg-white">
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
                  {subcategories.map(subcat => (
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
    </MainLayout>
  );
};

export default CategoryDetail;
