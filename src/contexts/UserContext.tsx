import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type PhoneOtpOptions = {
  shouldCreateUser?: boolean;
};

type UserContextType = {
  user: User | null;
  session: Session | null;
  authLoading: boolean;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (email: string, phone: string, password: string, additionalData?: any) => Promise<any>;
  completePhoneRegistration: (email: string, password: string, additionalData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  updateUser: (data: any) => Promise<any>;
  resetPassword: (username: string) => Promise<any>;
  signInWithPhone: (phone: string, options?: PhoneOtpOptions) => Promise<any>;
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

  // Supabase phone auth expects an E.164-style number including the leading +.
  const normalizePhone = (value: string) => {
    const digits = value.trim().replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  };

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

  // Legacy/fallback signup helper. The preferred customer flow is phone OTP first,
  // followed by completePhoneRegistration so a second Auth user is never created.
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
        ? await supabase.auth.signUp({ email: normalizedEmail, password, options })
        : await supabase.auth.signUp({ phone: normalizedPhone, password, options });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  // Complete an account that was already authenticated by phone OTP.
  // This keeps the verified phone and the profile/password on the same Auth user.
  const completePhoneRegistration = async (
    email: string,
    password: string,
    additionalData?: any
  ) => {
    try {
      const updates: {
        email?: string;
        password: string;
        data?: any;
      } = {
        password,
        data: additionalData || {},
      };

      const normalizedEmail = email.trim();
      if (normalizedEmail) updates.email = normalizedEmail;

      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error completing phone registration:', error);
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

  // Request a real Supabase phone OTP. OTP values are never generated or returned by the client.
  const signInWithPhone = async (phone: string, options: PhoneOtpOptions = {}) => {
    try {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) throw new Error('رقم الهاتف مطلوب');

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          shouldCreateUser: options.shouldCreateUser ?? false,
        },
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('Error sending phone OTP:', error);
      return { error };
    }
  };

  const verifyPhone = async (phone: string, code: string) => {
    try {
      const normalizedPhone = normalizePhone(phone);
      const token = code.trim();

      if (!/^\d{6}$/.test(token)) {
        throw new Error('رمز التحقق يجب أن يتكون من 6 أرقام');
      }

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
        completePhoneRegistration,
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
