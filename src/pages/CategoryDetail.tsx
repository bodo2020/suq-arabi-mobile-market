
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { 
  MainCategory,
  Subcategory, 
  Subsubcategory, 
  Product, 
  getProducts, 
  getCategories,
  getSubcategories,
  getSubsubcategories
} from '@/lib/supabase';

// Create a common interface that can represent any type of category
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
  const [categoryType, setCategoryType] = useState<'main' | 'sub' | 'subsub'>('main');
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subsubcategories, setSubsubcategories] = useState<Subsubcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedSubsubcategory, setSelectedSubsubcategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        setLoading(true);
        
        // Try to find the category in each level
        const [categoriesData, subcategoriesData, subsubcategoriesData] = await Promise.all([
          getCategories(),
          getSubcategories(),
          getSubsubcategories()
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
            
            // Get subsubcategories for this subcategory
            const subcategorySubsubcategories = subsubcategoriesData.filter(
              subsubcat => subsubcat.subcategory_id === id
            );
            setSubsubcategories(subcategorySubsubcategories);
            
            // Fetch all products for this subcategory
            const productsData = await getProducts(id);
            setAllProducts(productsData as Product[]);
            setProducts(productsData as Product[]);
            
          } else {
            // Check if it's a subsubcategory
            const subsubcategoryData = subsubcategoriesData.find(subsubcat => subsubcat.id === id);
            if (subsubcategoryData) {
              setCategoryInfo({
                id: subsubcategoryData.id,
                name: subsubcategoryData.name,
                image_url: subsubcategoryData.image_url,
                description: subsubcategoryData.description
              });
              setCategoryType('subsub');
              
              // Fetch all products for this subsubcategory
              const productsData = await getProducts(id);
              setAllProducts(productsData as Product[]);
              setProducts(productsData as Product[]);
            } else {
              throw new Error('Category not found');
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

  const handleBack = () => {
    navigate(-1);
  };

  const handleSubcategorySelect = (subcatId: string | null) => {
    setSelectedSubcategory(subcatId);
    setSelectedSubsubcategory(null);
    
    if (!subcatId) {
      // "All Products" was selected
      setProducts(allProducts);
    } else {
      // Filter products by subcategory
      const filtered = allProducts.filter(product => product.subcategory_id === subcatId);
      setProducts(filtered);
    }
  };

  const handleSubsubcategorySelect = (subsubcatId: string | null) => {
    setSelectedSubsubcategory(subsubcatId);
    
    if (!subsubcatId) {
      // If "All Products" was selected in subsubcategory filter
      if (selectedSubcategory) {
        // Still filter by the selected subcategory
        const filtered = allProducts.filter(product => product.subcategory_id === selectedSubcategory);
        setProducts(filtered);
      } else {
        // Show all products
        setProducts(allProducts);
      }
    } else {
      // Filter products by subsubcategory
      const filtered = allProducts.filter(product => product.subsubcategory_id === subsubcatId);
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
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        {/* Subcategories as horizontal ships/chips */}
        {!loading && subcategories.length > 0 && (
          <div className="mb-4 overflow-x-auto hide-scrollbar">
            <div className="flex space-x-2 space-x-reverse pb-2">
              <button
                onClick={() => handleSubcategorySelect(null)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                  selectedSubcategory === null 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                كل المنتجات
              </button>
              {subcategories.map(subcat => (
                <button
                  key={subcat.id}
                  onClick={() => handleSubcategorySelect(subcat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                    selectedSubcategory === subcat.id 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subsubcategories as horizontal ships/chips */}
        {!loading && (categoryType === 'sub' || selectedSubcategory) && subsubcategories.length > 0 && (
          <div className="mb-4 overflow-x-auto hide-scrollbar">
            <div className="flex space-x-2 space-x-reverse pb-2">
              <button
                onClick={() => handleSubsubcategorySelect(null)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                  selectedSubsubcategory === null 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                كل المنتجات
              </button>
              {subsubcategories.map(subsubcat => (
                <button
                  key={subsubcat.id}
                  onClick={() => handleSubsubcategorySelect(subsubcat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                    selectedSubsubcategory === subsubcat.id 
                      ? 'bg-primary text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {subsubcat.name}
                </button>
              ))}
            </div>
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
            <p className="text-sm text-gray-400">لا توجد منتجات في هذا القسم حالياً</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CategoryDetail;
