import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, MapPin, User } from 'lucide-react';
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const Index = () => {
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ area?: string; neighborhood?: string; } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchBackground, setSearchBackground] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeMainCategory, setActiveMainCategory] = useState<MainCategory | null>(null);
  const [categorySubcategories, setCategorySubcategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(false);

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
        if (area || neighborhood) setUserLocation({ area, neighborhood });
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

  const handleChangeLocation = () => {
    setPopoverOpen(false);
    navigate('/account/address');
  };

  const visibleCategories = isMobile ? categories.slice(0, 3) : categories.slice(0, 6);
  
  const availableProducts = products.filter(product => product.quantity > 0);
  const featuredProducts = availableProducts.slice(0, isMobile ? 4 : 10);

  const handleMainCategoryClick = async (cat: MainCategory) => {
    setActiveMainCategory(cat);
    setCatLoading(true);
    try {
      const { getSubcategories } = await import('@/lib/supabase');
      const subcats = await getSubcategories(cat.id);
      setCategorySubcategories(subcats || []);
    } finally {
      setCatLoading(false);
    }
  };

  const handleBackToMainCategories = () => {
    setActiveMainCategory(null);
    setCategorySubcategories([]);
  };

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

        <div className="relative mb-2">
          <SearchBar
            backgroundImage={searchBackground}
            onFocus={handleFocusSearchBar}
            readOnly
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-2">
            <input id="bgImageUpload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={processingImage} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="flex items-center text-gray-600 text-sm font-semibold">
            <MapPin size={20} className="ml-1 text-primary" /> 
            توصيل إلى
          </span>
          <span className="text-sm font-bold truncate max-w-xs">
            {userLocation?.area || ''}{userLocation?.area && userLocation?.neighborhood && '، '}
            {userLocation?.neighborhood || ''}
          </span>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="text-primary underline text-xs mr-auto"
                type="button"
                aria-label="تغيير الموقع"
              >
                تغيير الموقع
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-w-xs">
              <div className="flex flex-col items-start">
                <span className="mb-2 text-sm">حدد موقع التوصيل الخاص بك</span>
                <button
                  onClick={handleChangeLocation}
                  className="w-full text-sm text-primary p-2 rounded bg-gray-100 hover:bg-primary/10 mb-1"
                >
                  الذهاب للعناوين
                </button>
              </div>
            </PopoverContent>
          </Popover>
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

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">الأقسام</h2>
            <Link to="/categories" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          <div>
            {activeMainCategory ? (
              <div>
                <div className="flex items-center mb-2">
                  <button
                    onClick={handleBackToMainCategories}
                    className="text-sm text-primary underline mr-2"
                  >
                    كل الأقسام
                  </button>
                  <span className="font-bold">{activeMainCategory.name}</span>
                </div>
                {catLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-28 w-28 md:h-32 md:w-32 bg-gray-200 animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {categorySubcategories.length > 0 ? categorySubcategories.map(subcat =>
                      <CategoryItem
                        key={subcat.id}
                        category={subcat}
                      />
                    ) : (
                      <div className="col-span-full text-gray-500 py-10 text-center">
                        لا توجد أقسام فرعية
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {visibleCategories.map(category => (
                  <CategoryItem
                    key={category.id}
                    category={category}
                    onClick={handleMainCategoryClick}
                  />
                ))}
                {categories.length > (isMobile ? 3 : 6) && (
                  <Link to="/categories" className="category-item flex flex-col items-center">
                    <div className="h-28 w-28 md:h-32 md:w-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                      <ChevronLeft size={24} />
                    </div>
                    <span className="text-sm md:text-base text-center">عرض الكل</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">منتجات مميزة</h2>
            <Link to="/products" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {featuredProducts.map(product => 
              <ProductCard key={product.id} product={product} hideIfUnavailable={true} />
            )}
            {featuredProducts.length === 0 && (
              <div className="col-span-full py-8 text-center">
                <p className="text-gray-500">لا توجد منتجات متوفرة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
