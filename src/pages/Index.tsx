
import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import CategoryItem from '@/components/ui/CategoryItem';
import ProductCard from '@/components/ui/ProductCard';
import { getCategories, getProducts, getStoreInfo, Category, Product } from '@/lib/supabase';

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel
        const [categoriesData, productsData, storeInfoData] = await Promise.all([
          getCategories(),
          getProducts(),
          getStoreInfo()
        ]);
        
        setCategories(categoriesData as Category[]);
        setProducts(productsData as Product[]);
        setStoreInfo(storeInfoData);
        
        // Check for saved address
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) {
          setUserAddress(savedAddress);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate how many categories to show based on screen size
  // For mobile, we'll show 3 categories initially
  const visibleCategories = categories.slice(0, 3);

  // For our featured products, we'll show the first few products
  const featuredProducts = products.slice(0, 4);

  return (
    <MainLayout>
      <div className="py-4">
        {/* Store Logo and Name */}
        {storeInfo && (
          <div className="flex justify-center mb-4">
            <img 
              src={storeInfo.logo} 
              alt={storeInfo.name} 
              className="h-12 object-contain"
            />
          </div>
        )}

        {/* Search Bar */}
        <SearchBar />

        {/* User Address */}
        {userAddress ? (
          <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center">
            <Link to="/account/address" className="text-primary">
              تغيير
            </Link>
            <div className="flex items-center">
              <div className="flex flex-col items-end mr-2">
                <span className="text-sm text-gray-500">التوصيل إلى</span>
                <span className="text-sm font-semibold line-clamp-1">{userAddress}</span>
              </div>
              <div className="bg-primary bg-opacity-10 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <Link to="/account/address" className="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center">
            <span className="text-primary">إضافة</span>
            <div className="flex items-center">
              <span className="text-sm font-semibold ml-2">أضف عنوانك للتوصيل</span>
              <div className="bg-primary bg-opacity-10 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          </Link>
        )}

        {/* Categories Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <Link to="/categories" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
            <h2 className="text-lg font-bold">الأقسام</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {visibleCategories.map((category) => (
              <CategoryItem key={category.id} category={category} />
            ))}
            {categories.length > 3 && (
              <Link 
                to="/categories" 
                className="category-item"
              >
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                  <ChevronLeft size={20} />
                </div>
                <span className="text-xs text-center">عرض الكل</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Featured Products */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <Link to="/products" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
            <h2 className="text-lg font-bold">منتجات مميزة</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
