
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import ProductFilters from '@/components/ui/ProductFilters';
import { Product, Company, getProductsByCompany, getCompanyById } from '@/lib/supabase';

const sortOptions = [
  { label: "الأحدث", value: "newest" },
  { label: "السعر: من الأقل للأعلى", value: "price_asc" },
  { label: "السعر: من الأعلى للأقل", value: "price_desc" },
  { label: "أبجدياً: أ-ي", value: "name_asc" },
  { label: "أبجدياً: ي-أ", value: "name_desc" },
];

const CompanyProducts = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSort, setCurrentSort] = useState("newest");
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        
        const [companyData, productsData] = await Promise.all([
          getCompanyById(id),
          getProductsByCompany(id)
        ]);
        
        setCompany(companyData as Company);
        setAllProducts(productsData as Product[]);
        setProducts(sortProducts(productsData as Product[], currentSort));
      } catch (error) {
        console.error('Error fetching company products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

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
    setProducts(sortProducts(allProducts, value));
  };

  // منع انتشار الحدث عند النقر على أي جزء من ProductFilters
  const handleFiltersClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <MainLayout>
      <div className="py-4">
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {loading ? 'جاري التحميل...' : company ? company.name : 'الشركة'}
          </h1>
          <div className="w-10"></div>
        </div>

        {!loading && (
          <div onClick={handleFiltersClick}>
            <ProductFilters
              onSortChange={handleSortChange}
              sortOptions={sortOptions}
              currentSort={currentSort}
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <rect width="20" height="16" x="2" y="4" rx="2"></rect>
              <path d="m22 7-7.1 3.78c-.57.3-1.23.3-1.8 0L6 7"></path>
              <path d="M14 14v4"></path>
              <path d="M10 14v4"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">لا توجد منتجات</h3>
            <p className="text-sm text-gray-400">لا توجد منتجات لهذه الشركة حالياً</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CompanyProducts;
