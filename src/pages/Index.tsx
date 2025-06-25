import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import CategoryItem from '@/components/ui/CategoryItem';
import LocationSelector from '@/components/ui/LocationSelector';
import { getCategories, getStoreInfo, supabase, MainCategory } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { processImageBackground } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import AddressDisplay from '@/components/ui/AddressDisplay';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';

// Lazy load components that aren't immediately visible
const ProductCollectionsSection = lazy(() => import('@/components/sections/ProductCollectionsSection'));
const BannersContainer = lazy(() => import('@/components/ui/BannersContainer'));

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
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useUser();
  
  // Optimize queries with proper caching strategy
  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false
  });

  // Show only essential categories on initial load
  const visibleCategories = categories.slice(0, 12);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if user has selected a location before
        const locationSelected = localStorage.getItem('locationSelected');
        if (!locationSelected) {
          setShowLocationSelector(true);
          return;
        }

        // Fetch critical data first
        const storeInfoData = await getStoreInfo();
        setStoreInfo(storeInfoData);
        
        // Fetch user location data from localStorage
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);
        
        const area = localStorage.getItem('userArea');
        const neighborhood = localStorage.getItem('userNeighborhood');
        if (area || neighborhood) {
          setUserLocation({ area, neighborhood });
        }
        
        // Then fetch banner data which is less critical
        const bannersData = await supabase.from('banners')
          .select('*')
          .eq('active', true)
          .order('position');
          
        if (bannersData.data) setBanners(bannersData.data);
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

  const handleLocationSelected = async (location: any) => {
    setShowLocationSelector(false);
    setUserLocation({
      area: location.area,
      neighborhood: location.neighborhood
    });
    
    // Fetch the rest of the data after location is selected
    try {
      const storeInfoData = await getStoreInfo();
      setStoreInfo(storeInfoData);
      
      const bannersData = await supabase.from('banners')
        .select('*')
        .eq('active', true)
        .order('position');
        
      if (bannersData.data) setBanners(bannersData.data);
    } catch (error) {
      console.error('Error fetching data after location selection:', error);
    }
  };

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
    navigate('/account/addresses');
  };

  const handleMainCategoryClick = (cat: MainCategory) => {
    navigate(`/category/${cat.id}`);
  };

  // Show location selector if user hasn't selected location
  if (showLocationSelector) {
    return <LocationSelector onLocationSelected={handleLocationSelected} />;
  }

  // Loading skeleton for better user experience
  if (categoriesLoading) {
    return (
      <MainLayout>
        <div className="py-4">
          <div className="flex justify-center mb-4">
            <Skeleton className="h-12 w-32 rounded" />
          </div>
          <div className="mb-4">
            <Skeleton className="h-12 w-full rounded-lg mb-3" />
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-36 mb-2" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const addressSection = (
    <div className="mb-4">
      <AddressDisplay 
        address={userAddress || ''} 
        areaName={userLocation?.area || undefined} 
        neighborhoodName={userLocation?.neighborhood || undefined} 
        onEdit={handleChangeLocation}
        showAddressSelector={true}
      />
    </div>
  );

  return (
    <MainLayout>
      <div className="mb-16 pb-16">
        <div className="flex flex-col items-center mb-6 pt-4">
          <img 
            src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png" 
            alt={storeInfo?.name} 
            className="h-16 w-16 mb-1"
            loading="eager" 
          />
          <span className="text-xl font-bold text-primary">ماركت المعداوي</span>
        </div>

        <div className="relative mb-2">
          <SearchBar 
            backgroundImage={searchBackground} 
            onFocus={handleFocusSearchBar} 
            readOnly 
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-2">
            <input 
              id="bgImageUpload" 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
              disabled={processingImage} 
            />
          </div>
        </div>

        {addressSection}

        {/* Lazy load banners */}
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg mb-6" />}>
          {banners.length > 0 && (
            <div className="mb-6 relative">
              <BannersContainer banners={banners} />
            </div>
          )}
        </Suspense>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold">الأقسام</h2>
            <Link to="/categories" className="flex items-center text-primary text-sm">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {visibleCategories.map(category => (
              <CategoryItem 
                key={category.id} 
                category={category} 
                onClick={handleMainCategoryClick} 
              />
            ))}
            {categories.length > 12 && (
              <Link to="/categories" className="category-item flex flex-col items-center">
                <div 
                  className="h-24 w-full bg-gray-100 rounded-2xl flex items-center justify-center" 
                  style={{aspectRatio: '1'}}
                >
                  <ChevronLeft size={24} />
                </div>
                <span className="text-sm text-center mt-1">عرض الكل</span>
              </Link>
            )}
          </div>
        </div>
        
        {/* Lazy load product collections */}
        <Suspense fallback={
          <div className="space-y-6">
            <Skeleton className="h-8 w-40 mb-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-lg" />)}
            </div>
          </div>
        }>
          <ProductCollectionsSection />
        </Suspense>
      </div>
    </MainLayout>
  );
};

export default Index;
