import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { customerRpc } from '@/lib/customerPersistence';
import { loadMyAddresses, loadMyCustomer } from '@/lib/customerProfileCache';

const pending = new Set<string>();
const favoriteKey = (productId: string, variantId?: string | null) =>
  variantId ? `variant:${variantId}` : `product:${productId}`;

export function useFavorites() {
  const { user, authLoading } = useUser();
  const client = useQueryClient();
  const queryKey = ['customer-favorites', user?.id];
  const query = useQuery({
    queryKey,
    enabled: !!user && !authLoading,
    queryFn: async () => {
      const customer = await loadMyCustomer(user!.id);
      if (!customer) return { customerId: null, favorites: {} as Record<string, boolean> };
      const { data, error } = await supabase.from('favorites')
        .select('product_id,variant_id')
        .eq('customer_id', customer.id);
      if (error) throw error;
      return {
        customerId: customer.id,
        favorites: Object.fromEntries(
          (data || []).map(row => [favoriteKey(row.product_id, row.variant_id), true]),
        ),
      };
    },
  });

  useEffect(() => {
    const ready = () => { void client.invalidateQueries({ queryKey: ['customer-favorites', user?.id] }); };
    window.addEventListener('customer-profile-ready', ready);
    return () => window.removeEventListener('customer-profile-ready', ready);
  }, [client, user?.id]);

  const toggleFavorite = async (productId: string, variantId?: string | null) => {
    if (!user || !query.data?.customerId || query.isError) {
      toast({
        title: !user ? 'تسجيل الدخول مطلوب' : 'المفضلة غير جاهزة',
        description: !user
          ? 'سجّل دخولك لحفظ المنتجات المفضلة.'
          : 'كمّل اسمك في الحساب، أو أعد المحاولة إذا تعذر تحميل البيانات.',
      });
      return;
    }

    const key = favoriteKey(productId, variantId);
    const lock = `${user.id}:${key}`;
    if (pending.has(lock)) return;
    pending.add(lock);

    const previous = !!query.data.favorites[key];
    await client.cancelQueries({ queryKey });
    const update = (value: boolean) => client.setQueryData(queryKey, (old: typeof query.data) => old
      ? { ...old, favorites: { ...old.favorites, [key]: value } }
      : old);
    update(!previous);

    try {
      const { error } = await customerRpc('set_customer_favorite_unit', {
        p_product_id: productId,
        p_variant_id: variantId || null,
        p_favorite: !previous,
      });
      if (error) throw error;
    } catch {
      update(previous);
      toast({
        title: 'تعذر تحديث المفضلة',
        description: 'راجع اتصالك ثم أعد المحاولة.',
        variant: 'destructive',
      });
    } finally {
      pending.delete(lock);
      void client.invalidateQueries({ queryKey });
    }
  };

  return {
    user,
    customerId: user ? query.data?.customerId || null : null,
    isLoading: authLoading || (!!user && query.isPending),
    favoritesLoaded: !authLoading && (!user || !query.isPending),
    favoritesVersion: query.dataUpdatedAt,
    isFavorite: (productId: string, variantId?: string | null) =>
      !!user && !!query.data?.favorites[favoriteKey(productId, variantId)],
    toggleFavorite,
  };
}