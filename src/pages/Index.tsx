import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import CategoryItem from '@/components/ui/CategoryItem';
import ProductCard from '@/components/ui/ProductCard';
import Banner from '@/components/ui/Banner';
import { getCategories, getProducts, getStoreInfo, supabase, MainCategory, Product } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { processImageBackground } from '@/utils/imageUtils';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext, 
  CarouselPrevious
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import LocationDisplay from "@/components/ui/LocationDisplay";

const Index = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{area?: string; neighborhood?: string;} | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchBackground, setSearchBackground] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, productsData, storeInfoData, bannersData] = await Promise.all([
          getCategories(),
          getProducts(),
          getStoreInfo(),
          supabase.from('banners').select('*').eq('active', true).order('position')
        ]);
        setCategories(categoriesData);
        setProducts(productsData as Product[]);
        setStoreInfo(storeInfoData);
        if (bannersData.data) setBanners(bannersData.data);

        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);

        const area = localStorage.getItem('userArea');
        const neighborhood = localStorage.getItem('userNeighborhood');
        if (area || neighborhood) setUserLocation({area, neighborhood});
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length > 1) {
      bannerIntervalRef.current = setInterval(() => {
        setActiveBanner(prev => (prev + 1) % banners.length);
      }, 5000);
    }
    
    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current);
      }
    };
  }, [banners.length]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setProcessingImage(true);
      const backgroundUrl = await processImageBackground(file);
      if (backgroundUrl) setSearchBackground(backgroundUrl);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFocusSearchBar = () => {
    navigate('/search');
  };

  const visibleCategories = isMobile ? categories.slice(0, 3) : categories.slice(0, 6);
  const featuredProducts = products.slice(0, isMobile ? 4 : 10);

  if (loading) {
    return (
      <MainLayout>
        <div className="py-4">
          <div className="flex justify-center mb-4">
            <Skeleton className="h-12 w-32 rounded" />
          </div>
          <div className="mb-4">
            <Skeleton className="h-12 w-full rounded-lg mb-3" />
          </div>
          <div className="mb-4">
            <Skeleton className="h-40 w-full rounded-lg mb-3" />
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-36 mb-2" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => 
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              )}
            </div>
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-40 mb-2" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => 
                <Skeleton key={i} className="h-56 w-full rounded-lg" />
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="py-4">
        {storeInfo && <div className="flex justify-center mb-4">
            <img src={storeInfo.logo_url} alt={storeInfo.name} className="h-12 object-contain" />
          </div>}

        <div className="relative mb-4">
          <SearchBar 
            backgroundImage={searchBackground} 
            onFocus={handleFocusSearchBar}
            readOnly
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-2">
            <input id="bgImageUpload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={processingImage} />
          </div>
        </div>

        {banners.length > 0 && (
          <div className="mb-6 relative">
            <Carousel className="w-full" opts={{ loop: true }} setApi={(api) => {
              if (api && banners.length > 1) {
                api.scrollTo(activeBanner);
              }
            }}>
              <CarouselContent>
                {banners.map((banner, index) => (
                  <CarouselItem key={banner.id}>
                    <Banner banner={banner} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {banners.length > 1 && (
                <div className="flex justify-center mt-2">
                  {banners.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 mx-1 rounded-full ${activeBanner === index ? 'bg-primary' : 'bg-gray-300'}`}
                      onClick={() => {
                        setActiveBanner(index);
                        if (bannerIntervalRef.current) {
                          clearInterval(bannerIntervalRef.current);
                          bannerIntervalRef.current = setInterval(() => {
                            setActiveBanner(prev => (prev + 1) % banners.length);
                          }, 5000);
                        }
                      }}
                      aria-label={`شريحة ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </Carousel>
          </div>
        )}

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

        <LocationDisplay area={userLocation?.area} neighborhood={userLocation?.neighborhood} />

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
    </MainLayout>
  );
};

export default Index;
