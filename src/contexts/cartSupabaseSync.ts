
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

// Sync cart state with Supabase/localStorage based on customer_id,
// NOT user_id anymore
export function useCartSync(items: CartItem[], setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  const isInitializedRef = useRef(false);
  const needsSyncRef = useRef(false);
  const customerIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isLoading = true;
    let authListener: any = null;

    async function getCustomerId(userId: string): Promise<string | null> {
      // تحقق من وجود customer مباشر للمستخدم الحالي
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading customer:', error);
        return null;
      }
      return customer?.id || null;
    }

    async function updateCartForUser(sessionUser: any) {
      isLoading = true;
      if (sessionUser) {
        // حاول قراءة customer_id المرتبط بالمستخدم
        const customerId = await getCustomerId(sessionUser.id);
        customerIdRef.current = customerId;

        if (!customerId) {
          toast({
            title: "تنبيه",
            description: "لم نتمكن من ربط حسابك بملف العميل. ستُحفظ العناصر محليًا فقط.",
            variant: "destructive",
          });
        }
      } else {
        customerIdRef.current = null;
      }

      // جلب السلة بناء على customer_id
      fetchCartItems(customerIdRef.current, setItems).finally(() => {
        isLoading = false;
        isInitializedRef.current = true;
      });
    }

    // الاستماع لتغيرات جلسة المستخدم واسترجاع customer
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        updateCartForUser(session?.user || null);
      } else if (event === 'SIGNED_OUT') {
        updateCartForUser(null);
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

  // Sync cart to Supabase/localStorage
  useEffect(() => {
    if (!isInitializedRef.current && !needsSyncRef.current) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncCartPersistence(customerIdRef.current, items).then(() => {
        if (needsSyncRef.current) needsSyncRef.current = false;
      });
    });
  }, [items]);

  return null;
}

// جلب السلة حسب customer_id وليس user_id
async function fetchCartItems(customerId: string | null, setItems: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  if (customerId) {
    try {
      const { data: cartData, error: cartErr } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', customerId); // نستخدم customerId بدلاً من user_id (هو الآن يمثل customer id)

      if (cartErr) {
        console.error('Error fetching cart items:', cartErr);
        toast({
          title: "خطأ في تحميل السلة",
          description: "حدث خطأ أثناء تحميل عناصر السلة",
          variant: "destructive",
        });
        // fallback to localStorage
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
        const { data: productsData, error: productsErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        if (productsErr) {
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
        // لم يوجد أي عنصر: اعتمد على localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          try {
            const localItems = JSON.parse(savedCart);
            if (localItems.length > 0) {
              setItems(localItems);
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
      setItems([]);
    }
  } else {
    // غير مرتبط بعميل: استخدم localStorage
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

// الحفظ في Supabase حسب customer_id دائمًا
async function syncCartPersistence(customerId: string | null, items: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(items));

  // إذا لم يوجد customerId، لا تحفظ في Supabase
  if (!customerId) {
    return;
  }

  try {
    // حذف السلة القديمة المرتبطة بالعميل
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', customerId);

    if (deleteError) {
      toast({
        title: "خطأ في حفظ السلة",
        description: "حدث خطأ أثناء حذف العناصر القديمة",
        variant: "destructive",
      });
      return;
    }

    if (items.length > 0) {
      const cartItemsToInsert = items.map(item => ({
        user_id: customerId, // الآن هو customerId
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(cartItemsToInsert);

      if (insertError) {
        toast({
          title: "خطأ في حفظ السلة",
          description: "تعذر حفظ العناصر في قاعدة البيانات، تم الحفظ محليًا فقط",
          variant: "destructive",
        });
      }
    }
  } catch {
    toast({
      title: "خطأ في حفظ السلة",
      description: "حدث خطأ غير متوقع أثناء حفظ السلة",
      variant: "destructive",
    });
  }
}
