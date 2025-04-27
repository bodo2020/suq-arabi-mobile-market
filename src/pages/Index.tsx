import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, MapPin, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import CategoryItem from '@/components/ui/CategoryItem';
import ProductCard from '@/components/ui/ProductCard';
import Banner from '@/components/ui/Banner';
import { getCategories, getProducts, getStoreInfo, supabase, MainCategory, Product } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { processImageBackground } from '@/utils/imageUtils';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import LocationDisplay from "@/components/ui/LocationDisplay";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useQuery } from '@tanstack/react-query';
import AddressDisplay from '@/components/ui/AddressDisplay';

const Index = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    area?: string | null;
    neighborhood?: string | null;
  } | null>(null);
  const [searchBackground, setSearchBackground] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
  const {
    data: products = [],
    isLoading: productsLoading
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeInfoData = await getStoreInfo();
        const bannersData = await supabase.from('banners').select('*').eq('active', true).order('position');
        setStoreInfo(storeInfoData);
        if (bannersData.data) setBanners(bannersData.data);
        
        // Get address info from localStorage
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);
        
        // Get area and neighborhood names directly from localStorage
        const area = localStorage.getItem('userArea');
        const neighborhood = localStorage.getItem('userNeighborhood');
        if (area || neighborhood) {
          setUserLocation({
            area,
            neighborhood
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
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
    navigate('/account/addresses');
  };

  const visibleCategories = isMobile ? categories.slice(0, 3) : categories.slice(0, 6);
  const availableProducts = products.filter(product => product.quantity > 0);
  const featuredProducts = availableProducts.slice(0, isMobile ? 4 : 10);

  const handleMainCategoryClick = (cat: MainCategory) => {
    navigate(`/category/${cat.id}`);
  };

  const addressSection = <div className="mb-4">
      <AddressDisplay 
        address={userAddress || ''} 
        areaName={userLocation?.area || undefined} 
        neighborhoodName={userLocation?.neighborhood || undefined}
        onEdit={handleChangeLocation} 
        showAddressSelector={true} 
      />
    </div>;

  if (categoriesLoading || productsLoading) {
    return <MainLayout>
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
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-40 mb-2" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-lg" />)}
            </div>
          </div>
        </div>
      </MainLayout>;
  }

  return <MainLayout>
      <div className="py-4">
        {storeInfo && <div className="flex flex-col items-center mb-4">
          <img src="/lovable-uploads/1ff0c021-3af6-413b-b495-2629be0861b0.png" alt={storeInfo.name} className="h-16 w-16 mb-1" />
          <span className="text-xl font-bold text-primary">ماركت المعداوي</span>
        </div>}

        <div className="relative mb-2">
          <SearchBar backgroundImage={searchBackground} onFocus={handleFocusSearchBar} readOnly />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-2">
            <input id="bgImageUpload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={processingImage} />
          </div>
        </div>

        {addressSection}

        {banners.length > 0 && <div className="mb-6 relative">
            <Carousel className="w-full" opts={{
          loop: true
        }} setApi={api => {
          if (api && banners.length > 1) {
            api.scrollTo(activeBanner);
          }
        }}>
              <CarouselContent>
                {banners.map((banner, index) => <CarouselItem key={banner.id}>
                    <Banner banner={banner} />
                  </CarouselItem>)}
              </CarouselContent>
              
              {banners.length > 1 && <div className="flex justify-center mt-2">
                  {banners.map((_, index) => <button key={index} className={`w-2 h-2 mx-1 rounded-full ${activeBanner === index ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => {
              setActiveBanner(index);
              if (bannerIntervalRef.current) {
                clearInterval(bannerIntervalRef.current);
                bannerIntervalRef.current = setInterval(() => {
                  setActiveBanner(prev => (prev + 1) % banners.length);
                }, 5000);
              }
            }} aria-label={`شريحة ${index + 1}`} />)}
                </div>}
            </Carousel>
          </div>}

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">الأقسام</h2>
            <Link to="/categories" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {visibleCategories.map(category => <CategoryItem key={category.id} category={category} onClick={handleMainCategoryClick} />)}
            {categories.length > (isMobile ? 3 : 6) && <Link to="/categories" className="category-item flex flex-col items-center">
                <div className="h-28 w-28 md:h-32 md:w-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                  <ChevronLeft size={24} />
                </div>
                <span className="text-sm md:text-base text-center">عرض الكل</span>
              </Link>}
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
            {featuredProducts.map(product => <ProductCard key={product.id} product={product} hideIfUnavailable={true} showBulkQuantity={true} />)}
            {featuredProducts.length === 0 && <div className="col-span-full py-8 text-center">
                <p className="text-gray-500">لا توجد منتجات متوفرة حالياً</p>
              </div>}
          </div>
        </div>
      </div>
    </MainLayout>;
};

export default Index;
