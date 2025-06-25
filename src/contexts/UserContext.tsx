
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/supabase';

interface UserContextType {
  user: User | null;
  customer: Customer | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  verifyPhone: (phone: string, code: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderInternalProps {
  children: React.ReactNode;
}

const UserProviderInternal: React.FC<UserProviderInternalProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Guest data migration function - moved here to avoid circular dependency
  const migrateGuestData = async (userId: string) => {
    try {
      console.log('Starting guest data migration for user:', userId);
      
      // Get guest data from localStorage
      const guestCartData = localStorage.getItem('guestCart');
      const guestLocationData = localStorage.getItem('guestLocationData');
      const guestFavorites = localStorage.getItem('guestFavorites');
      
      // Migrate cart data
      if (guestCartData) {
        try {
          const cartItems = JSON.parse(guestCartData);
          if (Array.isArray(cartItems) && cartItems.length > 0) {
            console.log('Migrating cart items:', cartItems.length);
            
            // Clear existing cart items for this user
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', userId);

            // Insert guest cart items
            for (const item of cartItems) {
              await supabase
                .from('cart_items')
                .insert({
                  user_id: userId,
                  product_id: item.product_id,
                  quantity: item.quantity,
                  metadata: item.weight_option ? { weight_option: item.weight_option, price: item.price } : null
                });
            }
            
            // Clear guest cart from localStorage
            localStorage.removeItem('guestCart');
            console.log('Cart migration completed');
          }
        } catch (error) {
          console.error('Error migrating cart data:', error);
        }
      }

      // Migrate location data
      if (guestLocationData) {
        try {
          const locationData = JSON.parse(guestLocationData);
          console.log('Migrating location data:', locationData);
          
          // Save location to user's addresses
          if (locationData.coordinates && locationData.address) {
            await supabase
              .from('customer_addresses')
              .insert({
                user_id: userId,
                latitude: locationData.coordinates.lat,
                longitude: locationData.coordinates.lng,
                address: locationData.address,
                is_default: true
              });
          }
          
          // Clear guest location from localStorage
          localStorage.removeItem('guestLocationData');
          localStorage.removeItem('selectedLat');
          localStorage.removeItem('selectedLng');
          localStorage.removeItem('selectedAddress');
          console.log('Location migration completed');
        } catch (error) {
          console.error('Error migrating location data:', error);
        }
      }

      // Migrate favorites
      if (guestFavorites) {
        try {
          const favorites = JSON.parse(guestFavorites);
          if (Array.isArray(favorites) && favorites.length > 0) {
            console.log('Migrating favorites:', favorites.length);
            
            // Clear existing favorites for this user
            await supabase
              .from('favorites')
              .delete()
              .eq('user_id', userId);

            // Insert guest favorites
            for (const productId of favorites) {
              await supabase
                .from('favorites')
                .insert({
                  user_id: userId,
                  product_id: productId
                });
            }
            
            // Clear guest favorites from localStorage
            localStorage.removeItem('guestFavorites');
            console.log('Favorites migration completed');
          }
        } catch (error) {
          console.error('Error migrating favorites data:', error);
        }
      }

      console.log('Guest data migration completed successfully');
    } catch (error) {
      console.error('Error during guest data migration:', error);
    }
  };

  const fetchCustomer = async (userId: string) => {
    try {
      const { data: customerData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer:', error);
        return;
      }

      if (customerData) {
        setCustomer(customerData);
      }
    } catch (error) {
      console.error('Error in fetchCustomer:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      setUser(user);
      setSession(session);
      
      if (user) {
        await fetchCustomer(user.id);
      } else {
        setCustomer(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCustomer(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    return { error };
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    return { error };
  };

  const verifyPhone = async (phone: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms'
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  };

  useEffect(() => {
    let mounted = true;

    const getInitialUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            await fetchCustomer(session.user.id);
            // Migrate guest data when user logs in
            await migrateGuestData(session.user.id);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial user:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth state changed:', event, session?.user?.id);
        
        setSession(session);
        if (session?.user) {
          setUser(session.user);
          await fetchCustomer(session.user.id);
          
          // Migrate guest data when user signs in
          if (event === 'SIGNED_IN') {
            await migrateGuestData(session.user.id);
          }
        } else {
          setUser(null);
          setCustomer(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    customer,
    session,
    loading,
    signOut,
    refreshUser,
    signIn,
    signUp,
    signInWithPhone,
    verifyPhone,
    resetPassword,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UserProviderInternal>
      {children}
    </UserProviderInternal>
  );
};
