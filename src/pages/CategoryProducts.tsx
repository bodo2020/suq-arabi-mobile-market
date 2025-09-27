import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductFilters from '@/components/ui/ProductFilters';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories, supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';
import { getProductListWithVariants } from '@/utils/productUtils';

const sortOptions = [
  { label: "الأحدث", value: "newest" },
  { label: "السعر: من الأقل للأعلى", value: "price_asc" },
  { label: "السعر: من الأعلى للأقل", value: "price_desc" },
  { label: "أبجدياً: أ-ي", value: "name_asc" },
  { label: "أبجدياً: ي-أ", value: "name_desc" },
  { label: "حسب الشركة", value: "company" },
];

interface Company {
  id: string;
  name: string;
}

const CategoryProducts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useUser();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSort, setCurrentSort] = useState("newest");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

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
          
          // Fetch products and filter out unavailable ones
          const productsData = await getProducts(id, false);
          const availableProducts = productsData.filter(product => product.quantity && product.quantity > 0);
          
          setAllProducts(availableProducts);
          setProducts(filterAndSortProducts(availableProducts, currentSort, selectedCompany));
          
          // Fetch companies used in this category
          const uniqueCompanyIds = [...new Set(availableProducts
            .map(p => p.company_id)
            .filter(id => id !== null))] as string[];
          
          if (uniqueCompanyIds.length > 0) {
            const { data: companiesData } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', uniqueCompanyIds);
            
            if (companiesData) {
              setCompanies(companiesData);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Update products when sort or company filter changes
  useEffect(() => {
    setProducts(filterAndSortProducts(allProducts, currentSort, selectedCompany));
  }, [currentSort, selectedCompany, allProducts]);

  const filterAndSortProducts = (productsToFilter: Product[], sortType: string, companyFilter: string) => {
    // Filter by company first
    let filteredProducts = [...productsToFilter];
    if (companyFilter !== "all") {
      filteredProducts = filteredProducts.filter(product => product.company_id === companyFilter);
    }

    // Then sort
    return sortProducts(filteredProducts, sortType);
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
      case "company":
        return sortedProducts.sort((a, b) => {
          const companyA = companies.find(c => c.id === a.company_id)?.name || 'غير محدد';
          const companyB = companies.find(c => c.id === b.company_id)?.name || 'غير محدد';
          return companyA.localeCompare(companyB);
        });
      case "newest":
      default:
        return sortedProducts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  };

  const handleSortChange = (value: string) => {
    setCurrentSort(value);
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompany(value);
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
          pageTitle="تحميل..."
          showBackButton={true}
          onBack={() => navigate(-1)}
        />
        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-4">
            <div className="max-w-md mx-auto md:max-w-4xl">
              <div className="sticky top-0 z-10 mb-4 bg-white">
                <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(12)].map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
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
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onCompanyChange={handleCompanyChange}
                  />
                </div>
              </div>

              <div ref={productsRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {getProductListWithVariants(products).map((product) => (
                  <div key={product.variantKey} className="flex-shrink-0">
                    <ProductCard key={product.variantKey} product={product} />
                  </div>
                ))}
              </div>

              {products.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  {selectedCompany !== "all" 
                    ? "لا توجد منتجات متوفرة لهذه الشركة في هذا القسم"
                    : "لا توجد منتجات متوفرة في هذا القسم"
                  }
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