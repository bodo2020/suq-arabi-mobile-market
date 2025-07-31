
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import FavoriteProductCard from '@/components/ui/FavoriteProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, customerId } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    if (customerId) {
      fetchFavorites(customerId);
    } else if (user) {
      // If we have a user but no customerId, there might be an issue with the customer record
      setLoading(false);
    } else {
      // No user is logged in
      setLoading(false);
    }
  }, [user, customerId]);

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
      <div className="py-4 px-4 md:px-6">
        <div className="flex items-center mb-6">
          <button
            onClick={handleBack}
            className="p-2 focus:outline-none"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">المفضلة</h1>
          <div className="w-10"></div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user || !customerId ? (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
