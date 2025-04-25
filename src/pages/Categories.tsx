import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { MainCategory, Subcategory, getCategories, getSubcategories, Product, supabase } from '@/lib/supabase';
import CategoryScrollArea from '@/components/ui/CategoryScrollArea';
import CategoryItem from '@/components/ui/CategoryItem';
import { useToast } from "@/hooks/use-toast";
import SearchBar from '@/components/ui/SearchBar';

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
    } finally {
      setLoading(false);
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
    if (!categories.length) {
      fetchCategories();
      fetchStoreInfo();
    }
  }, [categories.length]);

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
      <div>
        <h1 className="text-2xl font-bold text-center mb-4">الأقسام</h1>
        <div className="mb-4">
          <SearchBar />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <CategoryItem 
              key={category.id} 
              category={category}
              hideLabel={true}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Categories;
