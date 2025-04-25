
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { MainCategory, getCategories } from '@/lib/supabase';
import CategoryItem from '@/components/ui/CategoryItem';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { useToast } from "@/hooks/use-toast";
import SearchBar from '@/components/ui/SearchBar';

const Categories = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الأقسام",
        variant: "destructive",
      });
    },
  });

  const handleSearchFocus = () => {
    navigate('/search');
  };

  return (
    <MainLayout>
      <div>
        <h1 className="text-2xl font-bold text-center mb-4">الأقسام</h1>
        <div className="mb-4">
          <SearchBar readOnly onFocus={handleSearchFocus} />
        </div>
        <div className="grid grid-cols-3 gap-3 px-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <CategorySkeleton key={index} />
            ))
          ) : (
            categories.map((category) => (
              <CategoryItem 
                key={category.id} 
                category={category}
              />
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Categories;
