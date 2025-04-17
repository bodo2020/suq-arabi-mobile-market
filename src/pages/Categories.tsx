
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Category, getCategories } from '@/lib/supabase';
import { Link } from 'react-router-dom';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data as Category[]);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <MainLayout>
      <div className="py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-center">الأقسام</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map((category) => (
              <Link 
                key={category.id}
                to={`/category/${category.id}`}
                className="bg-white rounded-lg shadow-sm p-3 flex flex-col items-center"
              >
                <div className="h-16 w-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mb-2">
                  <img 
                    src={category.image_url} 
                    alt={category.name} 
                    className="h-10 w-10 object-contain"
                  />
                </div>
                <h3 className="text-sm text-center line-clamp-2">{category.name}</h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Categories;
