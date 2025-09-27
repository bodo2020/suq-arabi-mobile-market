import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductFilters from '@/components/ui/ProductFilters';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories, supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/contexts/UserContext';

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

const SubcategoryDetail = () => {
  const { categoryId, subcategoryId } = useParams<{ categoryId: string, subcategoryId: string }>();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { user } = useUser();
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [subcategoryInfo, setSubcategoryInfo] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSort, setCurrentSort] = useState("newest");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId || !subcategoryId) return;
      setLoading(true);
      try {
        const [categoriesData, subcategoriesData] = await Promise.all([
          getCategories(),
          getSubcategories(categoryId)
        ]);
        
        const categoryData = categoriesData.find(cat => cat.id === categoryId);
        const subcategoryData = subcategoriesData.find(subcat => subcat.id === subcategoryId);
        
        if (categoryData && subcategoryData) {
          setCategoryInfo(categoryData);
          setSubcategoryInfo(subcategoryData);
          
          const productsData = await getProducts(categoryId, false);
          // Filter by subcategory and availability
          const availableSubcategoryProducts = productsData.filter(product => 
            product.subcategory_id === subcategoryId && 
            product.quantity && 
            product.quantity > 0
          );
          
          setAllProducts(availableSubcategoryProducts);
          setProducts(filterAndSortProducts(availableSubcategoryProducts, currentSort, selectedCompany));
          
          // Fetch companies used in this subcategory
          const uniqueCompanyIds = [...new Set(availableSubcategoryProducts
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
  }, [categoryId, subcategoryId]);

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
      <div className="container px-0 py-0">
        <TopNavBar 
          hideLogo={true}
          hideSearch={true}
          pageTitle={subcategoryInfo?.name || 'القسم الفرعي'}
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
                {products.map((product) => (
                  <div key={product.id} className="flex-shrink-0">
                    <ProductCard key={product.id} product={product} />
                  </div>
                ))}
              </div>

              {products.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  {selectedCompany !== "all" 
                    ? "لا توجد منتجات متوفرة لهذه الشركة في هذا القسم الفرعي"
                    : "لا توجد منتجات متوفرة في هذا القسم الفرعي"
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

export default SubcategoryDetail;