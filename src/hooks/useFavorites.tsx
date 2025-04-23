
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user, customer ID, and favorites
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        
        // Try to get customer ID
        const customerId = await getCustomerId(session.user.id);
        setCustomerId(customerId);
        
        loadFavorites(session.user.id);
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
        
        // Try to get customer ID
        const customerId = await getCustomerId(session.user.id);
        setCustomerId(customerId);
        
        loadFavorites(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Helper function to get customer ID from user ID
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

  const loadFavorites = async (userId: string) => {
    try {
      setIsLoading(true);
      
      console.log('Fetching favorites for user:', userId);
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error loading favorites:', error);
        setIsLoading(false);
        return;
      }

      const favMap: Record<string, boolean> = {};
      if (data) {
        console.log('Retrieved favorites data:', data.length);
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
      toast("تسجيل الدخول مطلوب: الرجاء تسجيل الدخول لإضافة منتجات للمفضلة");
      return;
    }

    const isCurrentlyFavorite = isFavorite(productId);
    
    // Optimistic update
    setFavorites(prev => ({
      ...prev,
      [productId]: !isCurrentlyFavorite
    }));

    try {
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        if (error) {
          console.error('Error removing from favorites:', error);
          throw error;
        }
        
        toast("تمت الإزالة: تم إزالة المنتج من المفضلة");
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          });

        if (error) {
          console.error('Error adding to favorites:', error);
          throw error;
        }
        
        toast("تمت الإضافة: تم إضافة المنتج إلى المفضلة");
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      
      // Revert optimistic update on error
      setFavorites(prev => ({
        ...prev,
        [productId]: isCurrentlyFavorite
      }));
      
      toast("حدث خطأ: لم نتمكن من تحديث المفضلة");
    }
  };

  return {
    isLoading,
    isFavorite,
    toggleFavorite,
    user
  };
}
