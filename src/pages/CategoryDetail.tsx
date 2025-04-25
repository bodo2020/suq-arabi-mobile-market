
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { MainCategory, Subcategory, Product, getProducts, getCategories, getSubcategories } from '@/lib/supabase';
import { ScrollArea } from "@/components/ui/scroll-area";

const CategoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const productsRef = useRef<HTMLDivElement>(null);
  
  const [categoryInfo, setCategoryInfo] = useState<MainCategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

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

  const handleSubcategorySelect = async (subcatId: string | null) => {
    setSelectedSubcategory(subcatId);
    
    if (!subcatId) {
      setProducts(allProducts);
    } else {
      const subcategoryProducts = await getProducts(subcatId, true);
      setProducts(subcategoryProducts);
    }

    // Smooth scroll to products after data is loaded
    if (productsRef.current) {
      setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
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
        <div className="flex items-center mb-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">
            {categoryInfo?.name}
          </h1>
          <div className="w-10"></div>
        </div>

        <div className="sticky top-0 bg-white z-10 mb-4 px-3">
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleSubcategorySelect(null)}
                className={`px-4 py-2 rounded-full text-sm ${
                  selectedSubcategory === null 
                    ? 'bg-[#90ff86] text-[#005931]' 
                    : 'bg-[#e4edea] text-[#005931]'
                }`}
              >
                جميع المنتجات
              </button>
              {subcategories.map(subcat => (
                <button
                  key={subcat.id}
                  onClick={() => handleSubcategorySelect(subcat.id)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                    selectedSubcategory === subcat.id 
                      ? 'bg-[#90ff86] text-[#005931]' 
                      : 'bg-[#e4edea] text-[#005931]'
                  }`}
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div ref={productsRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 px-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            لا توجد منتجات في هذا القسم
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default CategoryDetail;
