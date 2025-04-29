
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserContextType = {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  loading: boolean; // Added this property to match what's used in Account.tsx
  signIn: (email: string, password?: string) => Promise<any>;
  signUp: (email: string, password?: string, additionalData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateUser: (data: any) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
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
  const [loading, setLoading] = useState(true); // Added this state for consistency with Account.tsx

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setLoading(false); // Update loading state once session is fetched
    };

    getSession();

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setLoading(false); // Update loading state on auth change
    });
  }, []);

  // Function to sign in with email and password
  const signIn = async (email: string, password?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data };
    } catch (error) {
      console.error("Error signing in:", error);
      return { error };
    }
  };

  // Function to sign up with email and password
  const signUp = async (email: string, password?: string, additionalData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: additionalData,
        },
      });

      if (error) {
        throw error;
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
  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw error;
      }

      return { data };
    } catch (error) {
      console.error("Error resetting password:", error);
      return { error };
    }
  };

  // Function to sign in with Google
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) {
        throw error;
      }

      return { data };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      return { error };
    }
  };

  const signInWithPhone = async (phone: string) => {
    console.log("Signing in with phone:", phone);
    try {
      // First try Supabase's built-in phone auth
      const { error: supabaseError } = await supabase.auth.signInWithOtp({
        phone,
      });

      // If Supabase auth fails, use our custom edge function
      if (supabaseError) {
        console.error("Supabase auth error, trying custom function:", supabaseError);
        
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          "phone-verify",
          {
            body: {
              action: "send",
              phone: phone,
            },
          }
        );

        if (functionError) {
          console.error("Custom function error:", functionError);
          throw functionError;
        }

        if (!functionData.success) {
          console.error("Custom function failed:", functionData.message);
          throw new Error(functionData.message);
        }

        return { data: functionData };
      }

      return { data: "OTP sent" };
    } catch (error) {
      console.error("Error sending verification code:", error);
      return { error };
    }
  };

  const verifyPhone = async (phone: string, code: string) => {
    console.log("Verifying phone:", phone, "with code:", code);
    try {
      // First try with Supabase's built-in verification
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });

      // If Supabase verification fails, use our custom edge function
      if (verifyError) {
        console.error("Supabase verification failed, trying custom function:", verifyError);
        
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          "phone-verify",
          {
            body: {
              action: "verify",
              phone: phone,
              code: code,
            },
          }
        );

        if (functionError) {
          console.error("Custom function error:", functionError);
          throw functionError;
        }

        if (!functionData.success) {
          console.error("Custom function failed:", functionData.message);
          throw new Error(functionData.message);
        }

        return { data: functionData };
      }

      return { data: verifyData };
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
        loading, // Add loading to the context value
        signIn,
        signUp,
        signOut,
        updateUser,
        resetPassword,
        signInWithGoogle,
        signInWithPhone,
        verifyPhone,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
