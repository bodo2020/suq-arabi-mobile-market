import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SearchBar from '@/components/ui/SearchBar';
import { getCategories, getProducts, getStoreInfo, supabase, MainCategory } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import { processImageBackground } from '@/utils/imageUtils';
import { Skeleton } from "@/components/ui/skeleton";
import AddressDisplay from '@/components/ui/AddressDisplay';
import { useQuery } from '@tanstack/react-query';
import BannerSection from '@/components/home/BannerSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import ProductCollectionsSection from '@/components/home/ProductCollectionsSection';

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
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  const {
    data: productCollections = [],
    isLoading: collectionsLoading
  } = useQuery({
    queryKey: ['productCollections'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('product_collections')
          .select('*')
          .eq('active', true)
          .order('position');
        
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error in query function:', err);
        throw err;
      }
    }
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
        const savedAddress = localStorage.getItem('userAddress');
        if (savedAddress) setUserAddress(savedAddress);
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

  const handleMainCategoryClick = (category: MainCategory) => {
    navigate(`/category/${category.id}`);
  };

  const availableProducts = products.filter(product => product.quantity > 0);
  const featuredProducts = availableProducts.slice(0, isMobile ? 4 : 10);

  const carouselOptions = {
    align: "start" as const,
    dragFree: true,
    containScroll: "trimSnaps" as const,
    slidesToScroll: 1,
  };

  if (categoriesLoading || productsLoading || collectionsLoading) {
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

  return (
    <MainLayout>
      <div className="py-4">
        {storeInfo && (
          <div className="flex flex-col items-center mb-4">
            <img src="/lovable-uploads/1ff0c021-3af6-413b-b495-2629be0861b0.png" alt={storeInfo.name} className="h-16 w-16 mb-1" />
            <span className="text-xl font-bold text-primary">ماركت المعداوي</span>
          </div>
        )}

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

        <AddressDisplay 
          address={userAddress || ''} 
          areaName={userLocation?.area || undefined} 
          neighborhoodName={userLocation?.neighborhood || undefined} 
          onEdit={handleChangeLocation} 
          showAddressSelector={true} 
        />

        <BannerSection banners={banners} />
        
        <CategoriesSection 
          categories={categories} 
          isMobile={isMobile} 
          onCategoryClick={handleMainCategoryClick}
        />

        <ProductCollectionsSection 
          collections={productCollections}
          products={products}
          carouselOptions={carouselOptions}
          featuredProducts={featuredProducts}
        />
      </div>
    </MainLayout>
  );
};

export default Index;
