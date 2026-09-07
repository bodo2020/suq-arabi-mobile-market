
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
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
  const { user, customerId, favoritesLoaded, favoritesVersion } = useFavorites();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const requestVersion = useRef(0);
  const visible = favorites.filter(p => (!availableOnly || p.quantity > 0) && p.name.toLocaleLowerCase('ar').includes(query.trim().toLocaleLowerCase('ar')));
  const currentCustomer = useRef(customerId);
  currentCustomer.current = customerId;

  useEffect(() => {
    requestVersion.current += 1;
    setFavorites([]);
    setError(false);
    if (customerId && favoritesLoaded) {
      fetchFavorites(customerId);
    } else if (favoritesLoaded) {
      // Favorites have loaded (either user has no customerId or no user)
      setFavorites([]);
      setLoading(false);
    }
    return () => { requestVersion.current += 1; };
  }, [user, customerId, favoritesLoaded, favoritesVersion, retry]);

  const fetchFavorites = async (customerId: string) => {
    const version = requestVersion.current;
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
        if (currentCustomer.current === customerId && requestVersion.current === version) setFavorites(productsData as Product[]);
      } else if (currentCustomer.current === customerId && requestVersion.current === version) {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error in fetchFavorites:', error);
      if (requestVersion.current === version) setError(true);
    } finally {
      if (currentCustomer.current === customerId && requestVersion.current === version) setLoading(false);
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
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 rounded-3xl bg-green-50 p-5 sm:p-7">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-primary"><Heart size={25} />حاجات بتحبها</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">كل منتجاتك المفضلة في مكان واحد، جاهزة تضيفها لسلتك.</p>
        </div>
        {user && !loading && !error && favorites.length > 0 && <div className="mb-5 flex flex-wrap items-center gap-3">
          <input type="search" aria-label="البحث في المفضلة" placeholder="دور في المفضلة…" value={query} onChange={e => setQuery(e.target.value)} className="min-h-12 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4" />
          <button aria-pressed={availableOnly} onClick={() => setAvailableOnly(v => !v)} className={`min-h-12 rounded-xl px-4 text-sm ${availableOnly ? 'bg-primary text-white' : 'bg-white border border-gray-200'}`}>المتوفر فقط</button>
          <p role="status" className="w-full text-sm text-gray-500">{visible.length} من {favorites.length} منتج</p>
        </div>}

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
        ) : error ? (
          <div role="alert" className="rounded-3xl bg-white p-8 text-center"><h2 className="text-lg font-bold">تعذّر تحميل المفضلة</h2><p className="my-3 text-gray-500">راجع اتصالك وحاول تاني.</p><Button onClick={() => setRetry(v => v + 1)}>إعادة المحاولة</Button></div>
        ) : favorites.length > 0 && visible.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center"><h2 className="text-lg font-bold">مفيش منتجات مطابقة</h2><p className="my-3 text-gray-500">جرّب كلمة تانية أو اعرض كل المفضلة.</p><Button variant="outline" onClick={() => { setQuery(''); setAvailableOnly(false); }}>عرض الكل</Button></div>
        ) : favorites.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
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

