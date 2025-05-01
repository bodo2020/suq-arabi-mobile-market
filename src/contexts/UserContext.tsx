
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserContextType = {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<any>;
  signUp: (phone: string, password: string, additionalData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateUser: (data: any) => Promise<any>;
  resetPassword: (phone: string) => Promise<any>;
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
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setLoading(false);
    };

    getSession();

    supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'INITIAL_SESSION') {
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setLoading(false);
    });
  }, []);

  // Function to sign in with phone as email and password
  const signIn = async (phone: string, password: string) => {
    try {
      // Use the phone number as the email for authentication
      const formattedPhone = formatPhoneAsEmail(phone);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formattedPhone,
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

  // Function to sign up with phone as email and password
  const signUp = async (phone: string, password: string, additionalData?: any) => {
    try {
      // Use the phone number as the email for authentication
      const formattedPhone = formatPhoneAsEmail(phone);
      
      const { data, error } = await supabase.auth.signUp({
        email: formattedPhone,
        password,
        options: {
          data: {
            ...additionalData,
            phone: phone,
            phone_as_email: formattedPhone,
          },
        },
      });

      if (error) {
        throw error;
      }

      // Since we're not requiring email verification, we can immediately sign in the user
      if (data.user && !data.session) {
        const signInResult = await signIn(phone, password);
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
  const resetPassword = async (phone: string) => {
    try {
      const formattedPhone = formatPhoneAsEmail(phone);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(formattedPhone, {
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

  // Helper function to format phone as email
  const formatPhoneAsEmail = (phone: string): string => {
    // Clean the phone number (remove any non-digit characters)
    const cleanPhone = phone.replace(/\D/g, '');
    // Format as an email-like string
    return `${cleanPhone}@phone.user`;
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
