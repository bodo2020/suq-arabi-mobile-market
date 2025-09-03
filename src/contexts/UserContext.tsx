
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserContextType = {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (email: string, phone: string, password: string, additionalData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateUser: (data: any) => Promise<any>;
  resetPassword: (username: string) => Promise<any>;
  signInWithPhone: (phone: string) => Promise<any>;
  verifyPhone: (phone: string, code: string) => Promise<any>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Function to sign in with email or phone and password
  const signIn = async (username: string, password: string) => {
    try {
      // Check if the username is an email or phone
      const isEmail = username.includes('@');
      
      if (isEmail) {
        // Sign in with email
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });

        if (error) throw error;
        return { data };
      } else {
        // For phone numbers, no longer convert to email format
        // Instead, check if we need to directly use the phone number
        // or look up the user by phone number from the customers table
        
        // First try direct signin if the user registered with phone
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });
        
        // If direct sign in fails, try looking up the user by phone number
        if (error) {
          // Look up the user by phone number from customers table
          const { data: customerData } = await supabase
            .from('customers')
            .select('user_id, email')
            .eq('phone', username)
            .single();
            
          if (customerData?.email) {
            // Try to sign in with the customer's email
            const signInResult = await supabase.auth.signInWithPassword({
              email: customerData.email,
              password,
            });
            
            if (!signInResult.error) {
              return { data: signInResult.data };
            }
          }
          
          // If all attempts failed, throw the original error
          throw error;
        }
        
        return { data };
      }
    } catch (error) {
      console.error("Error signing in:", error);
      return { error };
    }
  };

  // Function to sign up with both email and phone
  const signUp = async (email: string, phone: string, password: string, additionalData?: any) => {
    try {
      // Store the real phone number without formatting it as an email
      const loginEmail = email || phone;
      
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            ...additionalData,
            email: email,
            phone: phone,
          },
        },
      });

      if (error) throw error;

      // Since we're not requiring email verification, we can immediately sign in the user
      if (data.user && !data.session) {
        const signInResult = await signIn(loginEmail, password);
        return signInResult;
      }

      return { data };
    } catch (error) {
      console.error("Error signing up:", error);
      return { error };
    }
  };

  // Function to sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Function to update user data
  const updateUser = async (data: any) => {
    try {
      const { data: user, error } = await supabase.auth.updateUser({ data });

      if (error) {
        throw error;
      }

      return { user };
    } catch (error) {
      console.error("Error updating user:", error);
      return { error };
    }
  };

  // Function to reset password
  const resetPassword = async (username: string) => {
    try {
      // Check if username is email or phone
      const isEmail = username.includes('@');
      const resetEmail = isEmail ? username : username;
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error("Error resetting password:", error);
      return { error };
    }
  };

  // Function to sign in with phone verification
  const signInWithPhone = async (phone: string) => {
    try {
      // This is a placeholder for actual phone verification logic
      // In a real implementation, this would call a serverless function to send SMS/WhatsApp
      console.log("Sending verification code to phone:", phone);
      
      // For development, we can simulate a code
      const testCode = "123456";
      
      return { 
        data: { 
          code: testCode, // In production, you'd never return this to the client
          message: "Verification code sent successfully" 
        } 
      };
    } catch (error) {
      console.error("Error sending verification code:", error);
      return { error };
    }
  };

  // Function to verify phone code
  const verifyPhone = async (phone: string, code: string) => {
    try {
      // This is a placeholder for actual phone verification logic
      console.log("Verifying code for phone:", phone, "Code:", code);
      
      // In a real implementation, you would verify the code against what was sent
      // Here we'll just assume code "123456" is valid for testing
      if (code !== "123456") {
        throw new Error("Invalid verification code");
      }
      
      return { data: { verified: true } };
    } catch (error) {
      console.error("Error verifying code:", error);
      return { error };
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        authLoading,
        loading,
        signIn,
        signUp,
        signOut,
        updateUser,
        resetPassword,
        signInWithPhone,
        verifyPhone,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
