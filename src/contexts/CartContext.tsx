
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);
  const { toast } = useToast();

  // Auth state changes listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN') {
        setUser(session?.user || null);
        setIsLoading(true); // Trigger cart reload when user signs in
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(true); // Also reload when user signs out
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      setUser(session?.user || null);
      setIsLoading(true); // Initialize loading
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load cart items based on user status
  useEffect(() => {
    const fetchCartItems = async () => {
      if (!isLoading) return;
      
      console.log('Fetching cart items, user:', user?.id);
      try {
        if (user) {
          // If user is logged in, fetch from Supabase
          console.log('Fetching cart from Supabase for user:', user.id);
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
            setIsLoading(false);
            setIsInitialized(true);
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
              setIsLoading(false);
              setIsInitialized(true);
              return;
            }

            if (productsData) {
              const cartItems: CartItem[] = cartData.map(cartItem => {
                const product = productsData.find(prod => prod.id === cartItem.product_id);
                if (!product) return null;
                return {
                  product: product as Product,
                  quantity: cartItem.quantity
                };
              }).filter(Boolean) as CartItem[];
              
              console.log('Setting cart items from DB:', cartItems.length);
              setItems(cartItems);
            }
          } else {
            // Check local storage for items to migrate
            const savedCart = localStorage.getItem('cart');
            if (savedCart) {
              try {
                const localItems = JSON.parse(savedCart);
                if (localItems.length > 0) {
                  console.log('Migrating local cart to user account:', localItems.length);
                  setItems(localItems);
                  setNeedsSync(true); // Mark for immediate sync to Supabase
                } else {
                  setItems([]);
                }
              } catch (error) {
                console.error('Failed to parse cart from localStorage:', error);
                localStorage.removeItem('cart');
                setItems([]);
              }
            } else {
              setItems([]);
            }
          }
        } else {
          // If user is not logged in, load from localStorage
          console.log('Loading cart from localStorage');
          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            try {
              setItems(JSON.parse(savedCart));
            } catch (error) {
              console.error('Failed to parse cart from localStorage:', error);
              localStorage.removeItem('cart');
              setItems([]);
            }
          } else {
            setItems([]);
          }
        }
      } catch (error) {
        console.error('Error in cart loading:', error);
        setItems([]);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    fetchCartItems();
  }, [user, isLoading, toast]);

  // Sync cart with localStorage (for non-logged in users) or Supabase (for logged in users)
  useEffect(() => {
    if (!isInitialized && !needsSync) return;
    
    const syncCart = async () => {
      console.log('Syncing cart, user:', user?.id, 'items:', items.length);
      
      if (!user) {
        // For non-logged in users, save to localStorage
        localStorage.setItem('cart', JSON.stringify(items));
        return;
      }
      
      // For logged in users, sync with Supabase
      try {
        // Delete existing cart items for this user
        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error clearing cart items:', deleteError);
          return;
        }

        if (items.length > 0) {
          // Insert new cart items
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
              description: "حدث خطأ أثناء حفظ عناصر السلة",
              variant: "destructive",
            });
          } else {
            console.log('Cart synced successfully with Supabase');
            if (needsSync) {
              setNeedsSync(false);
            }
          }
        } else {
          console.log('No items to sync with Supabase');
        }
      } catch (error) {
        console.error('Error syncing cart with Supabase:', error);
      }
    };

    syncCart();
  }, [items, user, isInitialized, needsSync, toast]);

  const addToCart = (product: Product) => {
    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(item => item.product.id === product.id);

      if (existingItemIndex > -1) {
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        return updatedItems;
      } else {
        return [...currentItems, { product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(currentItems =>
      currentItems.filter(item => item.product.id !== productId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => {
      const price = item.product.offer_price || item.product.price;
      return total + (price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};
