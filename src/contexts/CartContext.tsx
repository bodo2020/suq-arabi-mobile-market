
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
  const { toast } = useToast();

  // Auth state changes listener
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load cart items based on user status
  useEffect(() => {
    const fetchCartItems = async () => {
      setIsLoading(true);
      try {
        if (user) {
          // If user is logged in, fetch from Supabase
          const { data, error } = await supabase
            .from('cart_items')
            .select('*, product_id')
            .eq('user_id', user.id);

          if (error) {
            console.error('Error fetching cart items:', error);
            toast({
              title: "خطأ في تحميل السلة",
              description: "حدث خطأ أثناء تحميل عناصر السلة",
              variant: "destructive",
            });
            return;
          }

          if (data && data.length > 0) {
            const productIds = data.map(item => item.product_id);

            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select('*')
              .in('id', productIds);

            if (productsError) {
              console.error('Error fetching products:', productsError);
              return;
            }

            if (productsData) {
              const cartItems: CartItem[] = data.map(cartItem => {
                const product = productsData.find(prod => prod.id === cartItem.product_id);
                return {
                  product: product as Product,
                  quantity: cartItem.quantity
                };
              });
              setItems(cartItems);
            }
          } else {
            setItems([]);
          }
        } else {
          // If user is not logged in, load from localStorage
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartItems();
  }, [user, toast]);

  // Sync cart with localStorage (for non-logged in users) or Supabase (for logged in users)
  useEffect(() => {
    if (isLoading) return;

    const syncCart = async () => {
      if (!user) {
        // For non-logged in users, save to localStorage
        localStorage.setItem('cart', JSON.stringify(items));
      } else {
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
            }
          }
        } catch (error) {
          console.error('Error syncing cart with Supabase:', error);
        }
      }
    };

    syncCart();
  }, [items, user, isLoading]);

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
