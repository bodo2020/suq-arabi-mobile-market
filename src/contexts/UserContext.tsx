
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type User = {
  id: string;
  email: string;
};

interface UserContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  verifyPhone: (phone: string, code: string) => Promise<{ error: any }>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  verifyPhone: async () => ({ error: null }),
});

export const UserProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (data.session?.user) {
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
        });
      }
      
      setLoading(false);
    };
    
    checkUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };
  
  const formatPhoneNumber = (phoneNumber: string) => {
    // Remove leading zero if present
    const cleanPhone = phoneNumber.startsWith('0') ? phoneNumber.substring(1) : phoneNumber;
    // Add country code
    return `+2${cleanPhone}`;
  };
  
  const verifyPhone = async (phone: string, code: string) => {
    try {
      // Format phone number with +2 prefix (for Egypt)
      const formattedPhone = formatPhoneNumber(phone);
      console.log("Verifying phone:", formattedPhone);
      
      const result = await supabase.functions.invoke('phone-verify', {
        body: { action: 'verify', phone: formattedPhone, code }
      });
      
      if (!result.data?.success) {
        return { error: new Error(result.data?.message || "Verification failed") };
      }
      
      // If user is logged in, update their phone number in the database
      if (user) {
        // Store the local phone format in the database
        const { error: updateError } = await supabase
          .from('customers')
          .update({ phone: phone })
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Error updating phone number:', updateError);
          return { error: updateError };
        }
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error verifying phone:', error);
      return { error };
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, signUp, signOut, verifyPhone }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
