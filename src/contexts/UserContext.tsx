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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setAuthLoading(false);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setAuthLoading(false);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const normalizePhone = (value: string) => value.trim().replace(/\s+/g, '');

  // Sign in using the correct Supabase Auth identifier type.
  const signIn = async (username: string, password: string) => {
    try {
      const identifier = username.trim();
      const isEmail = identifier.includes('@');

      const { data, error } = isEmail
        ? await supabase.auth.signInWithPassword({ email: identifier, password })
        : await supabase.auth.signInWithPassword({ phone: normalizePhone(identifier), password });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Create an Auth account with either a real email or a real phone number.
  const signUp = async (
    email: string,
    phone: string,
    password: string,
    additionalData?: any
  ) => {
    try {
      const normalizedEmail = email.trim();
      const normalizedPhone = normalizePhone(phone);

      if (!normalizedEmail && !normalizedPhone) {
        throw new Error('Email or phone number is required');
      }

      const options = {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          ...additionalData,
          email: normalizedEmail || undefined,
          phone: normalizedPhone || undefined,
        },
      };

      const { data, error } = normalizedEmail
        ? await supabase.auth.signUp({
            email: normalizedEmail,
            password,
            options,
          })
        : await supabase.auth.signUp({
            phone: normalizedPhone,
            password,
            options,
          });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUser = async (data: any) => {
    try {
      const { data: userData, error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
      return { user: userData };
    } catch (error) {
      console.error('Error updating user:', error);
      return { error };
    }
  };

  // Password recovery is email-based. Phone users should use OTP instead.
  const resetPassword = async (username: string) => {
    try {
      const identifier = username.trim();
      if (!identifier.includes('@')) {
        throw new Error('استخدم تسجيل الدخول بكود التحقق لاستعادة حساب الهاتف');
      }

      const { data, error } = await supabase.auth.resetPasswordForEmail(identifier, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error };
    }
  };

  // Request a real Supabase phone OTP. Never return or expose the OTP in the client.
  const signInWithPhone = async (phone: string) => {
    try {
      const normalizedPhone = normalizePhone(phone);
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false },
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error sending phone OTP:', error);
      return { error };
    }
  };

  // Verify the OTP with Supabase Auth and create a real authenticated session.
  const verifyPhone = async (phone: string, code: string) => {
    try {
      const normalizedPhone = normalizePhone(phone);
      const token = code.trim();

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error verifying phone OTP:', error);
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
