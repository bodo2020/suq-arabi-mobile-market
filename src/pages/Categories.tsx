import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { MainCategory, Subcategory, getCategories, getSubcategories, Product, supabase } from '@/lib/supabase';
import CategoryScrollArea from '@/components/ui/CategoryScrollArea';
import CategoryItem from '@/components/ui/CategoryItem';
import { useToast } from "@/hooks/use-toast";

const Categories = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      
      if (categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0]);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الأقسام",
        variant: "destructive",
      });
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    try {
      const subcategoriesData = await getSubcategories(categoryId);
      setSubcategories(subcategoriesData);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
    }
  };

  const fetchStoreInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      setStoreInfo(data);
    } catch (error) {
      console.error("Error fetching store info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStoreInfo();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubcategories(selectedCategory.id);
    }
  }, [selectedCategory]);

  const handleCategoryClick = (category: MainCategory) => {
    setSelectedCategory(category);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="container pb-8">
        <h1 className="text-2xl font-bold mb-4">الأقسام</h1>
        
        <div className="mb-4">
          <CategoryScrollArea>
            {categories.map((category) => (
              <div 
                key={category.id} 
                onClick={() => handleCategoryClick(category)}
                className={`cursor-pointer px-2 ${selectedCategory?.id === category.id ? 'scale-105' : 'opacity-75'}`}
              >
                <CategoryItem 
                  category={category} 
                  isActive={selectedCategory?.id === category.id}
                />
              </div>
            ))}
          </CategoryScrollArea>
        </div>

        {selectedCategory && (
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-3">
              {selectedCategory.name}
            </h2>
            {subcategories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {subcategories.map((subcategory) => (
                  <Link 
                    to={`/category/${subcategory.id}`} 
                    key={subcategory.id}
                    className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-all"
                  >
                    <div className="aspect-square relative mb-2">
                      <img 
                        src={subcategory.image_url || '/placeholder.svg'} 
                        alt={subcategory.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <h3 className="text-center font-medium text-sm">{subcategory.name}</h3>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد أقسام فرعية في هذا القسم
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
