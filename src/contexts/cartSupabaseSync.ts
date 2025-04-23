
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

// This hook will sync cart state with Supabase/localStorage and user
export function useCartSync(items: CartItem[], setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  const isInitializedRef = useRef(false);
  const needsSyncRef = useRef(false);
  const customerIdRef = useRef<string | null>(null);

  // User authentication hooks and state
  useEffect(() => {
    let user: any = null;
    let isLoading = true;
    let authListener: any = null;

    async function checkCustomerId(userId: string): Promise<string | null> {
      try {
        // Check if the user has a customer record
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
          console.log('No customer record found. Items will be stored in localStorage only.');
          toast({
            title: "تنبيه",
            description: "لم نتمكن من ربط حسابك بملف العميل. ستُحفظ العناصر محليًا فقط.",
            variant: "destructive",
          });
        }
      } else {
        customerIdRef.current = null;
      }
      
      fetchCartItems(user, setItems).finally(() => { 
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
  }, [setItems]);

  // Sync cart to persistence (Supabase/localStorage)
  useEffect(() => {
    // Only sync if initialized and not in initial SSR/hydration
    if (!isInitializedRef.current && !needsSyncRef.current) return;

    let user: any;
    supabase.auth.getSession().then(({ data: { session } }) => {
      user = session?.user || null;
      syncCartPersistence(user, items, customerIdRef.current).then(() => {
        if (needsSyncRef.current) needsSyncRef.current = false;
      });
    });
  }, [items]);

  return null; // This hook doesn't render anything
}

async function fetchCartItems(user: any, setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  if (user) {
    try {
      // Fetch from Supabase
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id);

      if (cartError) {
        console.error('Error fetching cart items:', cartError);
        toast({
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

async function syncCartPersistence(user: any, items: CartItem[], customerId: string | null) {
  // Always store in localStorage as a fallback
  localStorage.setItem('cart', JSON.stringify(items));
  
  // If not logged in or no customer record exists, just use localStorage
  if (!user || !customerId) {
    return;
  }
  
  try {
    // Check if the user has a customer record
    if (!customerId) {
      // If no customer record, don't try to sync with Supabase
      console.log('No customer record found, skipping Supabase sync');
      toast({
        title: "تعذر حفظ السلة",
        description: "لا يمكن حفظ السلة في قاعدة البيانات، تم الحفظ محليًا فقط",
        variant: "destructive",
      });
      return;
    }
    
    // Clear old cart
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

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
        user_id: user.id,
        product_id: item.product.id,
        quantity: item.quantity
      }));
      
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(cartItemsToInsert);
        
      if (insertError) {
        console.error('Error inserting cart items:', insertError);
        toast({
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
    toast({
      title: "خطأ في حفظ السلة",
      description: "حدث خطأ غير متوقع أثناء حفظ السلة",
      variant: "destructive",
    });
  }
}
