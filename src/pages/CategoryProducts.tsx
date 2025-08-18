import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductFilters from '@/components/ui/ProductFilters';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
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

const CategoryProducts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useUser();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSort, setCurrentSort] = useState("newest");

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [categoriesData] = await Promise.all([
          getCategories()
        ]);
        
        const categoryData = categoriesData.find(cat => cat.id === id);
        if (categoryData) {
          setCategoryInfo(categoryData);
          
          const productsData = await getProducts(id, false);
          setProducts(sortProducts(productsData, currentSort));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentSort]);

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

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={categoryInfo?.name || 'منتجات القسم'}
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
      <SEOHead 
        title={`منتجات ${categoryInfo?.name || "القسم"} - متجرك الإلكتروني`}
        description={`تسوق من مجموعة ${categoryInfo?.name || "منتجات القسم"} بأفضل الأسعار مع توصيل مجاني`}
        type="product.group"
      />
      
      {products.length > 0 && (
        <ProductListStructuredData 
          products={products} 
          listName={`منتجات ${categoryInfo?.name || "القسم"}`} 
        />
      )}
      
      <BreadcrumbStructuredData 
        items={[
          { name: "الرئيسية", url: "/" },
          { name: "الأقسام", url: "/categories" },
          { name: categoryInfo?.name || "القسم", url: `/category/${id}` }
        ]}
      />
      
      <div className="container px-0 py-0">
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={`منتجات ${categoryInfo?.name}`}
          showBackButton={true}
          onBack={() => navigate(-1)}
        />

        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              <div className="sticky top-0 z-10 mb-4 bg-white">
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

export default CategoryProducts;