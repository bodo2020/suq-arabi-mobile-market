
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type User = {
  id: string;
  email: string;
  phone?: string;
};

interface UserContextType {
  user: User | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: any }>;
  signUp: (phone: string, password: string, userData: object) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

export const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
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
          phone: data.session.user.phone || '',
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
            phone: session.user.phone || '',
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

  const signIn = async (phone: string, password: string) => {
    // First try to identify if this is an email or phone number
    const isEmail = phone.includes('@');
    
    let result;
    if (isEmail) {
      // If it's an email, use email login
      result = await supabase.auth.signInWithPassword({ 
        email: phone, 
        password 
      });
    } else {
      // If it's a phone number, format it properly and use phone login
      // Make sure phone starts with +
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      result = await supabase.auth.signInWithPassword({ 
        phone: formattedPhone, 
        password 
      });
    }
    
    return { error: result.error };
  };

  const signUp = async (phone: string, password: string, userData: object) => {
    // First try to identify if this is an email or phone number
    const isEmail = phone.includes('@');
    
    let result;
    if (isEmail) {
      // If it's an email, use email signup
      result = await supabase.auth.signUp({
        email: phone,
        password,
        options: { data: userData }
      });
    } else {
      // If it's a phone number, format it properly and use phone signup
      // Make sure phone starts with +
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      result = await supabase.auth.signUp({
        phone: formattedPhone,
        password,
        options: { data: userData }
      });
    }
    
    return { error: result.error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
