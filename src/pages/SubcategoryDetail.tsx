import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import NextCategoryPrompt from '@/components/sections/NextCategoryPrompt';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import ProductFilters from '@/components/ui/ProductFilters';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories, supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

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

  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [subcategoryInfo, setSubcategoryInfo] = useState<Subcategory | null>(null);
  const [nextSection, setNextSection] = useState<{ name: string; path: string } | null>(null);
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
          const nextSubIndex = subcategoriesData.findIndex(section => section.id === subcategoryId) + 1;
          const followingSubcategory = nextSubIndex > 0 ? subcategoriesData[nextSubIndex] : null;
          const followingCategoryIndex = categoriesData.findIndex(section => section.id === categoryId) + 1;
          const followingCategory = followingCategoryIndex > 0 ? categoriesData[followingCategoryIndex] : null;
          setNextSection(followingSubcategory
            ? { name: followingSubcategory.name, path: `/category/${categoryId}/subcategory/${followingSubcategory.id}` }
            : followingCategory
              ? { name: followingCategory.name, path: `/category/${followingCategory.id}` }
              : null);

          const productsData = await getProducts(categoryId, false);
          const availableSubcategoryProducts = productsData.filter(product =>
            product.subcategory_id === subcategoryId && product.quantity && product.quantity > 0
          );

          setAllProducts(availableSubcategoryProducts);
          setProducts(filterAndSortProducts(availableSubcategoryProducts, currentSort, selectedCompany));

          const uniqueCompanyIds = [...new Set(availableSubcategoryProducts
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
  }, [categoryId, subcategoryId]);

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
      <div className="container px-0 py-0">
        <TopNavBar hideLogo hideSearch pageTitle={subcategoryInfo?.name || categoryInfo?.name || 'القسم الفرعي'} showBackButton onBack={() => navigate(-1)} />

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

              <div data-category-product-sections data-next-category-path={nextSection?.path} data-next-category-name={nextSection?.name}>
              <div ref={productsRef} className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6">
                {products.map(product => <ProductCard key={product.id} product={product} />)}
              </div>

              {nextSection && <NextCategoryPrompt name={nextSection.name} onNext={() => navigate(nextSection.path)} />}
              </div>

              {products.length === 0 && !loading && (
                <div className="py-8 text-center text-gray-500">
                  {selectedCompany !== "all"
                    ? "لا توجد منتجات متوفرة لهذه الشركة في هذا القسم الفرعي"
                    : "لا توجد منتجات متوفرة في هذا القسم الفرعي"}
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
