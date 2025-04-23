
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// This hook will sync cart state with Supabase/localStorage and user
// To be inside the CartProvider for effect
export function cartSupabaseSync(items: CartItem[], setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  // Since this module is imported and used in CartProvider, we can use hooks inside it
  const { toast } = useToast();
  const isInitializedRef = useRef(false);
  const needsSyncRef = useRef(false);
  const customerIdRef = useRef<string | null>(null);

  // User authentication hooks and state
  useEffect(() => {
    let user: any = null;
    let isLoading = true;
    let authListener: any = null;

    async function getCustomerId(userId: string): Promise<string | null> {
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
    }

    async function updateCartForUser(sessionUser: any) {
      user = sessionUser;
      isLoading = true;
      
      if (user) {
        const customerId = await getCustomerId(user.id);
        customerIdRef.current = customerId;
        
        if (!customerId) {
          console.log('No customer profile found for user. Items will be stored in localStorage only.');
          toast({
            title: "تنبيه",
            description: "لم نتمكن من ربط حسابك بملف تعريف العميل. ستُحفظ العناصر محليًا فقط.",
            variant: "destructive",
          });
        }
      } else {
        customerIdRef.current = null;
      }
      
      fetchCartItems(user, setItems, toast).finally(() => { 
        isLoading = false; 
        isInitializedRef.current = true; 
      });
    }

    // Auth change logic
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        updateCartForUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        updateCartForUser(null);
      }
    });
    authListener = listener;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateCartForUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [setItems, toast]);

  // Sync cart to persistence (Supabase/localStorage)
  useEffect(() => {
    // Only sync if initialized and not in initial SSR/hydration
    if (!isInitializedRef.current && !needsSyncRef.current) return;

    let user: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      user = session?.user || null;
      syncCartPersistence(user, items, toast, customerIdRef.current).then(() => {
        if (needsSyncRef.current) needsSyncRef.current = false;
      });
    });
  }, [items, toast, setItems]);
}

async function fetchCartItems(user: any, setItems: React.Dispatch<React.SetStateAction<CartItem[]>>, toast: any) {
  if (user) {
    try {
      // Fetch from Supabase
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        toast && toast({
          title: "خطأ في تحميل السلة",
          description: "حدث خطأ أثناء تحميل عناصر السلة",
          variant: "destructive",
        });
        // Fallback to localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            setItems(JSON.parse(savedCart));
          } catch {
            localStorage.removeItem('cart');
            setItems([]);
          }
        } else {
          setItems([]);
        }
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
            return {
              product: product,
              quantity: cartItem.quantity
            };
          }).filter(Boolean) as CartItem[];
          setItems(cartItems);
        }
      } else {
        // No items for user; check localStorage for migration
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            const localItems = JSON.parse(savedCart);
            if (localItems.length > 0) {
              setItems(localItems);
              // Mark for sync (via the effect)
            } else {
              setItems([]);
            }
          } catch {
            localStorage.removeItem('cart');
            setItems([]);
          }
        } else {
          setItems([]);
        }
      }
    } catch (error) {
      console.error('Error in fetchCartItems:', error);
      setItems([]);
    }
  } else {
    // Not logged in; get from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem('cart');
        setItems([]);
      }
    } else {
      setItems([]);
    }
  }
}

async function syncCartPersistence(user: any, items: CartItem[], toast: any, customerId: string | null) {
  // Always store in localStorage as a fallback
  localStorage.setItem('cart', JSON.stringify(items));
  
  // If not logged in or no customer profile, just use localStorage
  if (!user || !customerId) {
    return;
  }
  
  try {
    // Clear old cart
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error clearing cart items:', deleteError);
      toast && toast({
        title: "خطأ في حفظ السلة",
        description: "حدث خطأ أثناء حذف العناصر القديمة",
        variant: "destructive",
      });
      return;
    }
    
    if (items.length > 0) {
      const cartItemsToInsert = items.map(item => ({
        user_id: user.id,
        product_id: item.product.id,
        quantity: item.quantity
      }));
      
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(cartItemsToInsert);
        
      if (insertError) {
        console.error('Error inserting cart items:', insertError);
        toast && toast({
          title: "خطأ في حفظ السلة",
          description: "تعذر حفظ العناصر في قاعدة البيانات، تم الحفظ محليًا فقط",
          variant: "destructive",
        });
      } else {
        console.log('Cart items successfully synced to Supabase');
      }
    }
  } catch (error) {
    console.error('Error in syncCartPersistence:', error);
    toast && toast({
      title: "خطأ في حفظ السلة",
      description: "حدث خطأ غير متوقع أثناء حفظ السلة",
      variant: "destructive",
    });
  }
}
