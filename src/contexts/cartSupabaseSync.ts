import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/contexts/cartTypes';
import { toast } from '@/hooks/use-toast';

export function useCartSync(items: CartItem[], setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  const isInitializedRef = useRef(false);
  const needsSyncRef = useRef(false);
  const customerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let user: any = null;
    let isLoading = true;
    let authListener: any = null;

    async function checkCustomerId(userId: string): Promise<string | null> {
      try {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (customerError) {
          console.error('Error checking customer record:', customerError);
          return null;
        }

        return customerData?.id || null;
      } catch (error) {
        console.error('Exception checking customer record:', error);
        return null;
      }
    }

    async function updateCartForUser(sessionUser: any) {
      user = sessionUser;
      isLoading = true;

      if (user) {
        const customerId = await checkCustomerId(user.id);
        customerIdRef.current = customerId;

        if (!customerId) {
          console.log('No customer record found.');
          toast({
            title: "تنبيه",
            description: "لم نتمكن من ربط حسابك بملف العميل.",
            variant: "destructive",
          });
        }
      } else {
        customerIdRef.current = null;
      }

      fetchCartItems(user, customerIdRef.current, setItems).finally(() => {
        isLoading = false;
        isInitializedRef.current = true;
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        updateCartForUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        updateCartForUser(null);
        setItems([]);
      }
    });
    authListener = listener;

    supabase.auth.getSession().then(({ data: { session } }) => {
      updateCartForUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [setItems]);

  useEffect(() => {
    if (!isInitializedRef.current && !needsSyncRef.current) return;

    let user: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      user = session?.user || null;
      syncCartPersistence(user, items, customerIdRef.current).then(() => {
        if (needsSyncRef.current) needsSyncRef.current = false;
      });
    });
  }, [items]);

  return null;
}

async function fetchCartItems(user: any, customerId: string | null, setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  if (user && customerId) {
    try {
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*, metadata')
        .eq('customer_id', customerId);

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        toast({
          title: "خطأ في تحميل السلة",
          description: "حدث خطأ أثناء تحميل عناصر السلة",
          variant: "destructive",
        });
        setItems([]);
        return;
      }

      if (cartData && cartData.length > 0) {
        const productIds = cartData.map(item => item.product_id);
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          setItems([]);
          return;
        }

        if (productsData) {
          const cartItems: CartItem[] = cartData.map(cartItem => {
            const product = productsData.find(prod => prod.id === cartItem.product_id);
            if (!product) return null;
            
            // Extract additional properties from the saved JSON metadata
            const metadata = cartItem.metadata || {};
            const is_bulk = !!metadata.is_bulk;
            const unit_of_measure = metadata.unit_of_measure || null;
            
            return {
              product: product,
              quantity: cartItem.quantity,
              is_bulk,
              unit_of_measure
            };
          }).filter(Boolean) as CartItem[];
          
          setItems(cartItems);
        }
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error in fetchCartItems:', error);
      setItems([]);
    }
  } else {
    setItems([]);
  }
}

async function syncCartPersistence(user: any, items: CartItem[], customerId: string | null) {
  if (!user || !customerId) {
    return;
  }

  try {
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customerId);

    if (deleteError) {
      console.error('Error clearing cart items:', deleteError);
      toast({
        title: "خطأ في حفظ السلة",
        description: "حدث خطأ أثناء حذف العناصر القديمة",
        variant: "destructive",
      });
      return;
    }

    if (items.length > 0) {
      const cartItemsToInsert = items.map(item => ({
        customer_id: customerId,
        product_id: item.product.id,
        quantity: item.quantity,
        // Store additional properties as metadata
        metadata: {
          is_bulk: item.is_bulk || false,
          unit_of_measure: item.unit_of_measure || null
        }
      }));

      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(cartItemsToInsert);

      if (insertError) {
        console.error('Error inserting cart items:', insertError);
        toast({
          title: "خطأ في حفظ السلة",
          description: "تعذر حفظ العناصر في قاعدة البيانات",
          variant: "destructive",
        });
      } else {
        console.log('Cart items successfully synced to Supabase');
      }
    }
  } catch (error) {
    console.error('Error in syncCartPersistence:', error);
    toast({
      title: "خطأ في حفظ السلة",
      description: "حدث خطأ غير متوقع أثناء حفظ السلة",
      variant: "destructive",
    });
  }
}
