
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import FavoriteProductCard from '@/components/ui/FavoriteProductCard';
import ProductCardSkeleton from '@/components/ui/ProductCardSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const Favorites = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, customerId, favoritesLoaded } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    if (customerId && favoritesLoaded) {
      fetchFavorites(customerId);
    } else if (favoritesLoaded) {
      // Favorites have loaded (either user has no customerId or no user)
      setLoading(false);
    }
  }, [user, customerId, favoritesLoaded]);

  const fetchFavorites = async (customerId: string) => {
    try {
      setLoading(true);
      console.log('Fetching favorites for customer:', customerId);
      
      // First get the favorite product IDs
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('customer_id', customerId);

      if (favoritesError) {
        console.error('Error fetching favorites:', favoritesError);
        throw favoritesError;
      }

      console.log('Retrieved favorites data:', favoritesData?.length || 0);

      if (favoritesData && favoritesData.length > 0) {
        // Get the product details for each favorite
        const productIds = favoritesData.map(fav => fav.product_id);
        
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) {
          console.error('Error fetching products for favorites:', productsError);
          throw productsError;
        }

        console.log('Retrieved products for favorites:', productsData?.length || 0);
        setFavorites(productsData as Product[]);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error in fetchFavorites:', error);
      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تحميل المفضلة",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <MainLayout>
      <TopNavBar 
        hideLogo={true}
        hideSearch={true}
        hideCart={true}
        pageTitle="المفضلة"
      />
      <div className={`py-4 px-4 md:px-6 ${!isMobile ? 'mt-24' : 'mt-6'}`}>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(8)].map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">تسجيل الدخول مطلوب</h3>
            <p className="text-sm text-gray-500 mb-6">لعرض منتجاتك المفضلة، يرجى تسجيل الدخول أو إنشاء حساب جديد</p>
            <Button 
              onClick={() => navigate('/phone-login')}
              className="min-w-32"
            >
              تسجيل الدخول
            </Button>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {favorites.map((product) => (
              <FavoriteProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">المفضلة فارغة</h3>
            <p className="text-sm text-gray-500 mb-6">لم تقم بإضافة أي منتجات للمفضلة حتى الآن</p>
            <Button
              onClick={() => navigate('/')}
              className="min-w-32"
            >
              <ShoppingBag size={16} className="ml-2" />
              تسوق الآن
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Favorites;
