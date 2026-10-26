import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import NextCategoryPrompt from '@/components/sections/NextCategoryPrompt';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductFilters from '@/components/ui/ProductFilters';
import ProductListStructuredData from '@/components/seo/ProductListStructuredData';
import BreadcrumbStructuredData from '@/components/seo/BreadcrumbStructuredData';
import SEOHead from '@/components/seo/SEOHead';
import { MainCategory, Product, getProducts, getCategories, supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
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

  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [nextCategory, setNextCategory] = useState<MainCategory | null>(null);
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
        const categoriesData = await getCategories();
        const categoryData = categoriesData.find(cat => cat.id === id);
        const nextIndex = categoriesData.findIndex(cat => cat.id === id) + 1;
        setNextCategory(nextIndex > 0 && nextIndex < categoriesData.length ? categoriesData[nextIndex] : null);
        if (categoryData) {
          setCategoryInfo(categoryData);
          const productsData = await getProducts(id, false);
          const availableProducts = productsData.filter(product => product.quantity && product.quantity > 0);

          setAllProducts(availableProducts);
          setProducts(filterAndSortProducts(availableProducts, currentSort, selectedCompany));

          const uniqueCompanyIds = [...new Set(availableProducts
            .map(p => p.company_id)
            .filter(companyId => companyId !== null))] as string[];

          if (uniqueCompanyIds.length > 0) {
            const { data: companiesData } = await supabase
              .from('companies')
              .select('id, name')
              .in('id', uniqueCompanyIds);

            if (companiesData) setCompanies(companiesData);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  useEffect(() => {
    setProducts(filterAndSortProducts(allProducts, currentSort, selectedCompany));
  }, [currentSort, selectedCompany, allProducts]);

  const filterAndSortProducts = (productsToFilter: Product[], sortType: string, companyFilter: string) => {
    let filteredProducts = [...productsToFilter];
    if (companyFilter !== "all") {
      filteredProducts = filteredProducts.filter(product => product.company_id === companyFilter);
    }
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
        return sortedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const handleFiltersClick = (event: React.MouseEvent) => event.stopPropagation();

  if (loading) {
    return (
      <MainLayout>
        <TopNavBar hideLogo hideSearch pageTitle="تحميل..." showBackButton onBack={() => navigate(-1)} />
        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-3 sm:px-4">
            <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
              <div className="sticky top-0 z-10 mb-4 bg-white">
                <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
                {[...Array(12)].map((_, index) => <ProductCardSkeleton key={index} />)}
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
        <ProductListStructuredData products={products} listName={`منتجات ${categoryInfo?.name || "القسم"}`} />
      )}

      <BreadcrumbStructuredData
        items={[
          { name: "الرئيسية", url: "/" },
          { name: "الأقسام", url: "/categories" },
          { name: categoryInfo?.name || "القسم", url: `/category/${id}` }
        ]}
      />

      <div className="container px-0 py-0">
        <TopNavBar hideLogo hideSearch pageTitle={`منتجات ${categoryInfo?.name}`} showBackButton onBack={() => navigate(-1)} />

        <div className={`${!isMobile ? 'mt-24' : ''}`}>
          <div className="w-full px-3 sm:px-4">
            <div className="mx-auto max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
              <div className="sticky top-0 z-10 mb-3 bg-white sm:mb-4">
                <div onClick={handleFiltersClick}>
                  <ProductFilters
                    onSortChange={setCurrentSort}
                    sortOptions={sortOptions}
                    currentSort={currentSort}
                    companies={companies}
                    selectedCompany={selectedCompany}
                    onCompanyChange={setSelectedCompany}
                  />
                </div>
              </div>

              <div
                data-category-product-sections
                data-next-category-path={nextCategory ? `/category/${nextCategory.id}` : undefined}
                data-next-category-name={nextCategory?.name}
              >
              <div ref={productsRef} className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
                {getProductListWithVariants(products).map(product => (
                  <ProductCard key={product.variantKey} product={product} />
                ))}
              </div>

              {nextCategory && <NextCategoryPrompt name={nextCategory.name} onNext={() => navigate(`/category/${nextCategory.id}`)} />}
              </div>

              {products.length === 0 && !loading && (
                <div className="py-8 text-center text-gray-500">
                  {selectedCompany !== "all"
                    ? "لا توجد منتجات متوفرة لهذه الشركة في هذا القسم"
                    : "لا توجد منتجات متوفرة في هذا القسم"}
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
