
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/lib/supabase';

interface UserContextType {
  user: User | null;
  customer: Customer | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
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
                  weight_option: item.weight_option || null,
                  price: item.price
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
                address_text: locationData.address,
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
              .from('customer_favorites')
              .delete()
              .eq('user_id', userId);

            // Insert guest favorites
            for (const productId of favorites) {
              await supabase
                .from('customer_favorites')
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
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
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
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (mounted) {
          setUser(user);
          
          if (user) {
            await fetchCustomer(user.id);
            // Migrate guest data when user logs in
            await migrateGuestData(user.id);
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
    loading,
    signOut,
    refreshUser,
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
