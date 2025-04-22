
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/ui/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const Favorites = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed in favorites:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN') {
        setUser(session?.user);
        // Explicitly fetch favorites when user signs in
        if (session?.user) {
          fetchFavorites(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setFavorites([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check in favorites:', session?.user?.id);
      setUser(session?.user || null);
      
      // If user is logged in, fetch favorites
      if (session?.user) {
        fetchFavorites(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchFavorites = async (userId: string) => {
    try {
      setLoading(true);
      console.log('Fetching favorites for user:', userId);
      
      // First get the favorite product IDs
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', userId);

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
      <div className="py-4">
        {/* Header with back button */}
        <div className="flex items-center mb-4">
          <button
            onClick={handleBack}
            className="p-2"
            aria-label="الرجوع"
          >
            <ArrowRight size={24} />
          </button>
          <h1 className="text-xl font-bold flex-1 text-center">المفضلة</h1>
          <div className="w-10"></div> {/* Spacer for alignment */}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
              <path d="M12 6v2"></path>
              <path d="M12 16v.01"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">يرجى تسجيل الدخول</h3>
            <p className="text-sm text-gray-400 mb-4">تحتاج إلى تسجيل الدخول للوصول إلى المفضلة</p>
            <button 
              onClick={() => navigate('/account')}
              className="bg-primary text-white px-4 py-2 rounded-md"
            >
              الذهاب لتسجيل الدخول
            </button>
          </div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mb-4">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-500 mb-1">المفضلة فارغة</h3>
            <p className="text-sm text-gray-400 mb-4">لم تقم بإضافة أي منتجات للمفضلة</p>
            <button 
              onClick={() => navigate('/')}
              className="bg-primary text-white px-4 py-2 rounded-md"
            >
              استعرض المنتجات
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Favorites;
