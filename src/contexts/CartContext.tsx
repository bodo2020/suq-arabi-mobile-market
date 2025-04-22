import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '@/lib/supabase';
import { supabase } from '@/integrations/supabase/client';

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

  useEffect(() => {
    if (user) {
      const fetchCartItems = async () => {
        const { data, error } = await supabase
          .from('cart_items')
          .select('*, product_id')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching cart items:', error);
          return;
        }

        if (data) {
          const productIds = data.map(item => item.product_id);

          if (productIds.length > 0) {
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
        }
      };

      fetchCartItems();
    } else {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (error) {
          console.error('Failed to parse cart from localStorage:', error);
        }
      } else {
        setItems([]);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart', JSON.stringify(items));
    } else {
      const syncCartToSupabase = async () => {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', user.id);
        if (items.length > 0) {
          const cartItemsToInsert = items.map(item => ({
            user_id: user.id,
            product_id: item.product.id,
            quantity: item.quantity
          }));
          await supabase
            .from('cart_items')
            .insert(cartItemsToInsert);
        }
      };
      syncCartToSupabase();
    }
  }, [items, user]);

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
