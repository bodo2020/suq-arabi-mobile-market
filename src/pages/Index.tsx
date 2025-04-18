import React, { useEffect, useState } from 'react';
import { ChevronLeft, Search, Barcode } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import CategoryItem from '@/components/ui/CategoryItem';
import ProductCard from '@/components/ui/ProductCard';
import Banner from '@/components/ui/Banner';
import { getCategories, getProducts, getStoreInfo, supabase, MainCategory, Product } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all required data in parallel
        const [categoriesData, productsData, storeInfoData, bannersData] = await Promise.all([
          getCategories(), 
          getProducts(), 
          getStoreInfo(), 
          supabase.from('banners').select('*').eq('active', true).order('position')
        ]);

        setCategories(categoriesData);
        setProducts(productsData as Product[]);
        setStoreInfo(storeInfoData);
        if (bannersData.data) {
          setBanners(bannersData.data);
        }

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
  const visibleCategories = isMobile ? categories.slice(0, 3) : categories.slice(0, 6);

  // For our featured products, we'll show the first few products
  const featuredProducts = products.slice(0, isMobile ? 4 : 10);
  
  return <MainLayout>
      <div className="py-4">
        {/* Store Logo and Name */}
        {storeInfo && <div className="flex justify-center mb-4">
            <img src={storeInfo.logo_url} alt={storeInfo.name} className="h-12 object-contain" />
          </div>}

        {/* Search Bar with Barcode Button */}
        <div className="relative mb-4">
          <SearchBar />
          <button className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-gray-100 rounded-full">
            <Barcode size={20} className="text-gray-500" />
          </button>
        </div>

        {/* User Address - only show if address exists */}
        {userAddress && <div className="bg-white rounded-lg shadow-sm p-3 mb-4 flex justify-between items-center">
            <Link to="/account/address" className="text-primary">
              تغيير
            </Link>
            <div className="flex items-center">
              <div className="flex flex-col items-end mr-2">
                <span className="text-sm text-gray-500">التوصيل إلى</span>
                <span className="text-sm font-semibold line-clamp-1">{userAddress}</span>
              </div>
              
            </div>
          </div>}

        {/* Banners Section */}
        {banners.length > 0 && <div className="mb-6">
            <div className="flex overflow-x-auto space-x-2 space-x-reverse pb-2 -mx-4 px-4">
              {banners.map(banner => <div key={banner.id} className="flex-shrink-0 w-full md:w-1/2">
                  <Banner banner={banner} />
                </div>)}
            </div>
          </div>}

        {/* Categories Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <Link to="/categories" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
            <h2 className="text-lg font-bold">الأقسام</h2>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {visibleCategories.map(category => <CategoryItem key={category.id} category={category} />)}
            {categories.length > (isMobile ? 3 : 6) && <Link to="/categories" className="category-item flex flex-col items-center">
                <div className="h-20 w-20 md:h-24 md:w-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <ChevronLeft size={24} />
                </div>
                <span className="text-xs md:text-sm text-center">عرض الكل</span>
              </Link>}
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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {featuredProducts.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </div>
    </MainLayout>;
};

export default Index;
