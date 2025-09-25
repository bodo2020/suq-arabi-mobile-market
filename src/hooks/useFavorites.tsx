
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      // Use setTimeout to avoid deadlock with supabase calls in callback
      setTimeout(async () => {
        if (session?.user && mounted) {
          setUser(session.user);
          await handleUserSession(session.user);
        } else if (mounted) {
          setUser(null);
          setCustomerId(null);
          setFavorites({});
          setFavoritesLoaded(true);
          setIsLoading(false);
        }
      }, 0);
    });

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && mounted) {
        setUser(session.user);
        await handleUserSession(session.user);
      } else if (mounted) {
        setIsLoading(false);
        setFavoritesLoaded(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (user: any) => {
    try {
      const customerId = await getOrCreateCustomerId(user.id, user.user_metadata);
      setCustomerId(customerId);
      
      if (customerId) {
        await loadFavorites(customerId);
      } else {
        setIsLoading(false);
        setFavoritesLoaded(true);
      }
    } catch (error) {
      console.error('Error handling user session:', error);
      setIsLoading(false);
      setFavoritesLoaded(true);
    }
  };

  const getOrCreateCustomerId = async (userId: string, userMetadata: any): Promise<string | null> => {
    try {
      // First try to get existing customer
      let { data: customerData, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer ID:', error);
        return null;
      }

      // If customer exists, return their ID
      if (customerData) {
        return customerData.id;
      }

      // If no customer exists, create one
      console.log('Creating new customer record for user:', userId);
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          user_id: userId,
          first_name: userMetadata?.first_name || '',
          last_name: userMetadata?.last_name || '',
          name: userMetadata?.name || `${userMetadata?.first_name || ''} ${userMetadata?.last_name || ''}`.trim(),
          phone: userMetadata?.phone || '',
          email: userMetadata?.email || '',
          address: userMetadata?.address || ''
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating customer record:', createError);
        return null;
      }

      return newCustomer?.id || null;
    } catch (error) {
      console.error('Exception in getOrCreateCustomerId:', error);
      return null;
    }
  };

  const loadFavorites = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error loading favorites:', error);
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
      setFavoritesLoaded(true);
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
    customerId,
    favoritesLoaded
  };
}
