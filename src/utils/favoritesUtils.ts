
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

export const toggleFavorite = async (productId: string, userId: string | undefined) => {
  if (!userId) {
    toast("لم يتم تسجيل الدخول: يرجى تسجيل الدخول لإضافة المنتجات إلى المفضلة");
    return false;
  }

  try {
    // Check if product is already in favorites
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking favorite status:', checkError);
      throw checkError;
    }

    if (existingFavorite) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (deleteError) {
        console.error('Error removing from favorites:', deleteError);
        throw deleteError;
      }

      toast("تمت الإزالة: تمت إزالة المنتج من المفضلة");
      return false;
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          product_id: productId
        });

      if (insertError) {
        console.error('Error adding to favorites:', insertError);
        throw insertError;
      }

      toast("تمت الإضافة: تمت إضافة المنتج إلى المفضلة");
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    toast("حدث خطأ: حدث خطأ أثناء تحديث المفضلة");
    return null;
  }
};

export const checkIsFavorite = async (productId: string, userId: string | undefined) => {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

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
