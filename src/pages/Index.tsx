
import React, { useEffect, useState, useRef, Suspense, lazy } from 'react';
import { ChevronLeft, MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import { getCategories, getStoreInfo, supabase, MainCategory } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { processImageBackground } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/contexts/UserContext';

const ProductCollectionsSection = lazy(() => import('@/components/sections/ProductCollectionsSection'));
const BannersContainer = lazy(() => import('@/components/ui/BannersContainer'));

const Index = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    governorate?: string | null;
    city?: string | null;
    area?: string | null;
    neighborhood?: string | null;
  } | null>(null);
  const [searchBackground, setSearchBackground] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useUser();

  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const visibleCategories = categories.slice(0, 12);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storeInfoData = await getStoreInfo();
        setStoreInfo(storeInfoData);
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);
        const governorate = localStorage.getItem('userGovernorate');
        const city = localStorage.getItem('userCity');
        const area = localStorage.getItem('userArea');
        const neighborhood = localStorage.getItem('userNeighborhood');
        if (governorate || city || area || neighborhood) {
          setUserLocation({
            governorate,
            city,
            area,
            neighborhood
          });
        }
        const bannersData = await supabase.from('banners').select('*').eq('active', true).order('position');
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
    navigate('/address-manager');
  };

  const handleMainCategoryClick = (cat: MainCategory) => {
    navigate(`/category/${cat.id}`);
  };

  if (categoriesLoading) {
    return (
      <MainLayout>
        <TopNavBar />
        <div className={`py-4 ${!isMobile ? 'mt-32' : ''}`}>
          <div className="flex justify-center mb-4">
            <Skeleton className="h-12 w-32 rounded" />
          </div>
          <div className="mb-4">
            <Skeleton className="h-12 w-full rounded-lg mb-3" />
          </div>
          <div className="mb-6">
            <Skeleton className="h-8 w-36 mb-2" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="mb-16 pb-16">
          {/* Top Navigation Bar */}
          <TopNavBar 
            onSearchFocus={handleFocusSearchBar}
            searchProps={{ backgroundImage: searchBackground }}
          />

          {/* Main Content with proper spacing */}
          <div className={`${!isMobile ? 'mt-32' : ''}`}>
            {/* Address Section */}
            <div className="w-full px-4 mb-4">
              <div className="max-w-md mx-auto md:max-w-4xl">
                <div className="flex items-center">
                  <MapPin size={16} className="text-primary ml-2" />
                  <span className="text-gray-600 text-sm">التوصيل إلى</span>
                  <button 
                    onClick={handleChangeLocation}
                    className="text-primary font-bold text-sm mr-2 underline decoration-2 underline-offset-2"
                  >
                    {userLocation?.area || userAddress || "اختر عنوانك"}
                    {userLocation?.neighborhood && <span className="mr-1">، {userLocation?.neighborhood}</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="max-w-md mx-auto px-4 md:max-w-4xl">
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
                
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-1">
                  {visibleCategories.map(category => (
                    <CategoryItem key={category.id} category={category} onClick={handleMainCategoryClick} />
                  ))}
                  {categories.length > 12 && (
                    <Link to="/categories" className="category-item flex flex-col items-center">
                      <div className="h-24 w-full bg-gray-100 rounded-2xl flex items-center justify-center" style={{ aspectRatio: '1' }}>
                        <ChevronLeft size={24} />
                      </div>
                      <span className="text-sm text-center mt-1">عرض الكل</span>
                    </Link>
                  )}
                </div>
              </div>
              
              <Suspense fallback={
                <div className="space-y-6">
                  <Skeleton className="h-8 w-40 mb-2" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-44 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              }>
                <ProductCollectionsSection />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
