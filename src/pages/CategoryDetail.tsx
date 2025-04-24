
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import CategoryItem from '@/components/ui/CategoryItem';
import { 
  MainCategory,
  Subcategory,
  Product, 
  getProducts, 
  getCategories,
  getSubcategories,
} from '@/lib/supabase';

interface CategoryInfo {
  id: string;
  name: string;
  image_url?: string;
  description?: string;
}

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryType, setCategoryType] = useState<'main' | 'sub'>('main');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [mainCategoryName, setMainCategoryName] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        setLoading(true);
        
        const [categoriesData, subcategoriesData] = await Promise.all([
          getCategories(),
          getSubcategories()
        ]);
        
        // Check if it's a main category
        let categoryData = categoriesData.find(cat => cat.id === id);
        if (categoryData) {
          setCategoryInfo({
            id: categoryData.id,
            name: categoryData.name,
            image_url: categoryData.image_url,
            description: categoryData.description
          });
          setMainCategoryName(categoryData.name);
          setCategoryType('main');
          
          // Get subcategories for this main category
          const categorySubcategories = subcategoriesData.filter(subcat => subcat.category_id === id);
          setSubcategories(categorySubcategories);
          
          // Fetch all products for this category
          const productsData = await getProducts(id);
          setAllProducts(productsData as Product[]);
          setProducts(productsData as Product[]);
          
        } else {
          // Check if it's a subcategory
          const subcategoryData = subcategoriesData.find(subcat => subcat.id === id);
          if (subcategoryData) {
            setCategoryInfo({
              id: subcategoryData.id,
              name: subcategoryData.name,
              image_url: subcategoryData.image_url,
              description: subcategoryData.description
            });
            setCategoryType('sub');
            
            // Find main category name
            const mainCat = categoriesData.find(cat => cat.id === subcategoryData.category_id);
            if (mainCat) {
              setMainCategoryName(mainCat.name);
            }
            
            // Fetch all products for this subcategory
            const productsData = await getProducts(id);
            setAllProducts(productsData as Product[]);
            setProducts(productsData as Product[]);
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

  const handleBack = () => {
    navigate(-1);
  };

  const handleSubcategorySelect = (subcatId: string | null) => {
    setSelectedSubcategory(subcatId);
    
    if (!subcatId) {
      // "All Products" was selected
      setProducts(allProducts);
    } else {
      // Filter products by subcategory
      const filtered = allProducts.filter(product => product.subcategory_id === subcatId);
      setProducts(filtered);
    }
  };

  return (
    <MainLayout>
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {loading ? 'جاري التحميل...' : categoryInfo?.name}
          </h1>
          <div className="w-10"></div>
        </div>

        {/* Show subcategories as grid if main category */}
        {!loading && categoryType === 'main' && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {subcategories.map(subcat => (
              <CategoryItem
                key={subcat.id}
                category={subcat}
                onClick={() => navigate(`/category/${subcat.id}`)}
              />
            ))}
          </div>
        )}

        {/* Products Grid */}
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
            <p className="text-sm text-gray-400">لا توجد منتجات في هذا القسم حالياً</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CategoryDetail;
