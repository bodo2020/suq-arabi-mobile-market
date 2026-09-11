import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { deactivateCurrentPushDevice } from '@/services/pushNotifications';

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
  signInWithPhone: (phone: string, shouldCreateUser?: boolean) => Promise<any>;
  verifyPhone: (phone: string, code: string) => Promise<any>;
};

type TestOtpResponse = {
  testNumber?: boolean;
  sent?: boolean;
  verified?: boolean;
  error?: string;
  session?: {
    access_token: string;
    refresh_token: string;
  };
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const normalizePhone = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`;
  return `+${trimmed.replace(/\D/g, '')}`;
};

const invokeTestOtp = async (
  action: 'send' | 'verify',
  phone: string,
  code?: string,
): Promise<{ data: TestOtpResponse | null; error: any }> => {
  const result = await supabase.functions.invoke<TestOtpResponse>('customer-test-otp', {
    body: {
      action,
      phone,
      ...(code ? { code } : {}),
    },
  });

  return { data: result.data ?? null, error: result.error };
};

const testOtpErrorMessage = (code?: string) => {
  switch (code) {
    case 'TOO_MANY_ATTEMPTS':
      return 'تم إدخال رمز غير صحيح عدة مرات. حاول مرة أخرى بعد 15 دقيقة.';
    case 'TEST_OTP_EXPIRED':
      return 'انتهت صلاحية رقم الاختبار. حدّث إعداد الاختبار ثم حاول مرة أخرى.';
    case 'INVALID_CODE':
      return 'رمز التحقق غير صحيح.';
    default:
      return 'تعذر التحقق من رمز الاختبار. حاول مرة أخرى.';
  }
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, nextSession: Session | null) => {
        if (_event === 'SIGNED_OUT') {
          for (const key of ['userAddress', 'userArea', 'userNeighborhood', 'selectedAddress']) localStorage.removeItem(key);
        }
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

  const signUp = async (
    email: string,
    phone: string,
    password: string,
    additionalData?: any
  ) => {
    try {
      const cleanEmail = email.trim();
      const normalizedPhone = normalizePhone(phone);
      const metadata = {
        ...additionalData,
        email: cleanEmail || undefined,
        phone: normalizedPhone,
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;

      if (currentUser && normalizePhone(currentUser.phone || '') === normalizedPhone) {
        const { data, error } = await supabase.auth.updateUser({
          ...(cleanEmail ? { email: cleanEmail } : {}),
          password,
          data: metadata,
        });

        if (error) throw error;
        return { data: { user: data.user, session: sessionData.session } };
      }

      if (cleanEmail) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: metadata,
          },
        });

        if (error) throw error;
        return { data };
      }

      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: {
          channel: 'sms',
          data: metadata,
        },
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
      try {
        await deactivateCurrentPushDevice();
      } catch (pushError) {
        console.warn('Unable to detach push device before sign out:', pushError);
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUser = async (data: any) => {
    try {
      const { data: result, error } = await supabase.auth.updateUser({ data });
      if (error) throw error;
      return { user: result.user };
    } catch (error) {
      console.error('Error updating user:', error);
      return { error };
    }
  };

  const resetPassword = async (username: string) => {
    try {
      const identifier = username.trim();
      if (!identifier.includes('@')) {
        return {
          error: new Error('استعادة كلمة المرور برقم الهاتف تتم من خلال رمز التحقق'),
        };
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

  const signInWithPhone = async (phone: string, shouldCreateUser = true) => {
    try {
      const normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone || normalizedPhone.length < 8) {
        throw new Error('رقم الهاتف غير صحيح');
      }

      // Test numbers are resolved only on the server. No test phone or fixed code is bundled in the app.
      try {
        const testResult = await invokeTestOtp('send', normalizedPhone);
        if (!testResult.error && testResult.data?.testNumber) {
          return { data: { testOtp: true } };
        }
      } catch (testOtpError) {
        console.warn('Test OTP probe unavailable; falling back to regular phone OTP.', testOtpError);
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          channel: 'sms',
          shouldCreateUser,
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

      try {
        const testResult = await invokeTestOtp('verify', normalizedPhone, token);
        if (!testResult.error && testResult.data?.testNumber) {
          if (!testResult.data.verified || !testResult.data.session) {
            throw new Error(testOtpErrorMessage(testResult.data.error));
          }

          const { data, error } = await supabase.auth.setSession({
            access_token: testResult.data.session.access_token,
            refresh_token: testResult.data.session.refresh_token,
          });
          if (error) throw error;
          return { data };
        }
      } catch (testOtpError) {
        if (testOtpError instanceof Error && /رمز|اختبار|دقيقة/.test(testOtpError.message)) {
          throw testOtpError;
        }
        console.warn('Test OTP verifier unavailable; trying regular Supabase OTP.', testOtpError);
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
