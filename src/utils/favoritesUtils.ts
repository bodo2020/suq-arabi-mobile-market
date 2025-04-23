
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const toggleFavorite = async (productId: string, customerId: string | undefined | null) => {
  if (!customerId) {
    toast({
      title: "لم يتم تسجيل الدخول",
      description: "يرجى تسجيل الدخول لإضافة المنتجات إلى المفضلة",
      variant: "destructive",
    });
    return false;
  }

  try {
    // Check if product is already in favorites for customer
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking favorite status:', checkError);
      throw checkError;
    }

    if (existingFavorite) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('customer_id', customerId)
        .eq('product_id', productId);

      if (deleteError) {
        console.error('Error removing from favorites:', deleteError);
        throw deleteError;
      }

      toast({
        title: "تمت الإزالة",
        description: "تمت إزالة المنتج من المفضلة",
      });
      return false;
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          customer_id: customerId,
          product_id: productId
        });

      if (insertError) {
        console.error('Error adding to favorites:', insertError);
        throw insertError;
      }

      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة المنتج إلى المفضلة",
      });
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    toast({
      title: "حدث خطأ",
      description: "حدث خطأ أثناء تحديث المفضلة",
      variant: "destructive",
    });
    return null;
  }
};

export const checkIsFavorite = async (productId: string, customerId: string | undefined | null) => {
  if (!customerId) return false;

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking favorite status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};
