
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);

        const customerId = await getCustomerId(session.user.id);
        setCustomerId(customerId);

        if (customerId) {
          loadFavorites(customerId);
        } else {
          setIsLoading(false);
          console.log('No customer record found for user. Unable to load favorites.');
          toast({
            title: "تنبيه",
            description: "لم نتمكن من العثور على سجل العميل. المفضلة لن تكون متزامنة عبر الأجهزة.",
            variant: "destructive",
          });
        }
      } else {
        setUser(null);
        setCustomerId(null);
        setFavorites({});
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);

        const customerId = await getCustomerId(session.user.id);
        setCustomerId(customerId);

        if (customerId) {
          loadFavorites(customerId);
        } else {
          setIsLoading(false);
          console.log('No customer record found for user. Unable to load favorites.');
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const getCustomerId = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching customer ID:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Exception in getCustomerId:', error);
      return null;
    }
  };

  const loadFavorites = async (customerId: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error loading favorites:', error);
        setIsLoading(false);
        return;
      }

      const favMap: Record<string, boolean> = {};
      if (data) {
        data.forEach(item => {
          favMap[item.product_id] = true;
        });
      }

      setFavorites(favMap);
    } catch (error) {
      console.error('Error in loadFavorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFavorite = (productId: string): boolean => {
    return !!favorites[productId];
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast({
        title: "تسجيل الدخول مطلوب",
        description: "الرجاء تسجيل الدخول لإضافة منتجات للمفضلة",
        variant: "destructive",
      });
      return;
    }

    if (!customerId) {
      toast({
        title: "خطأ في سجل العميل",
        description: "لم نتمكن من العثور على بيانات العميل الخاصة بك",
        variant: "destructive",
      });

      try {
        const localFavorites = localStorage.getItem('favorites') ?
          JSON.parse(localStorage.getItem('favorites') || '[]') : [];

        const isCurrentlyFavorite = isFavorite(productId);

        if (isCurrentlyFavorite) {
          const updatedFavorites = localFavorites.filter((id: string) => id !== productId);
          localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        } else {
          localFavorites.push(productId);
          localStorage.setItem('favorites', JSON.stringify(localFavorites));
        }

        setFavorites(prev => ({
          ...prev,
          [productId]: !isCurrentlyFavorite
        }));

        toast({
          title: isCurrentlyFavorite ? "تمت الإزالة" : "تمت الإضافة",
          description: isCurrentlyFavorite ? "تم إزالة المنتج من المفضلة (محليًا فقط)" : "تم إضافة المنتج إلى المفضلة (محليًا فقط)",
        });
      } catch (error) {
        console.error('Error storing favorites locally:', error);
      }

      return;
    }

    const isCurrentlyFavorite = isFavorite(productId);

    // Update UI optimistically
    setFavorites(prev => ({
      ...prev,
      [productId]: !isCurrentlyFavorite
    }));

    try {
      if (isCurrentlyFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('customer_id', customerId)
          .eq('product_id', productId);

        if (error) {
          console.error('Error removing from favorites:', error);
          throw error;
        }

        toast({
          title: "تمت الإزالة",
          description: "تم إزالة المنتج من المفضلة",
        });
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            customer_id: customerId,
            product_id: productId
          });

        if (error) {
          console.error('Error adding to favorites:', error);
          throw error;
        }

        toast({
          title: "تمت الإضافة",
          description: "تم إضافة المنتج إلى المفضلة",
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);

      // Revert UI state on error
      setFavorites(prev => ({
        ...prev,
        [productId]: isCurrentlyFavorite
      }));

      toast({
        title: "حدث خطأ",
        description: "لم نتمكن من تحديث المفضلة",
        variant: "destructive",
      });
    }
  };

  return {
    isLoading,
    isFavorite,
    toggleFavorite,
    user,
    customerId
  };
}
