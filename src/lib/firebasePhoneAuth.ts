import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { supabase } from '@/lib/supabase';

const firebaseConfig = {
  apiKey: 'AIzaSyArD7ytRzpc3RDW85AoUNUJixuvwLA8FzM',
  authDomain: 'elmadawy-c165b.firebaseapp.com',
  projectId: 'elmadawy-c165b',
  storageBucket: 'elmadawy-c165b.firebasestorage.app',
  messagingSenderId: '168326873858',
  appId: '1:168326873858:web:6768af63201e689dc8b81b',
};

const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);

let verificationId = '';
let automaticallyVerified = false;
let shouldCreateSupabaseUser = true;
let recaptchaVerifier: RecaptchaVerifier | null = null;

const removeListeners = async (handles: PluginListenerHandle[]) => {
  await Promise.allSettled(handles.map((handle) => handle.remove()));
};

const prepareRecaptcha = () => {
  recaptchaVerifier?.clear();
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, 'firebase-phone-recaptcha', {
    size: 'invisible',
  });
  return recaptchaVerifier;
};

export async function sendFirebasePhoneOtp(
  phoneNumber: string,
  resendCode = false,
  shouldCreateUser = true,
) {
  verificationId = '';
  automaticallyVerified = false;
  shouldCreateSupabaseUser = shouldCreateUser;

  const handles: PluginListenerHandle[] = [];
  let timeoutId = 0;
  let settled = false;
  let resolveResult!: () => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<void>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  const finish = async (callback: () => void) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    await removeListeners(handles);
    callback();
  };

  try {
    handles.push(
      await FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
        verificationId = event.verificationId;
        void finish(resolveResult);
      }),
      await FirebaseAuthentication.addListener('phoneVerificationCompleted', () => {
        automaticallyVerified = true;
        void finish(resolveResult);
      }),
      await FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
        void finish(() => rejectResult(new Error(event.message)));
      }),
    );

    timeoutId = window.setTimeout(() => {
      void finish(() => rejectResult(new Error('انتهت مهلة إرسال رمز التحقق. حاول مرة أخرى.')));
    }, 90_000);

    await FirebaseAuthentication.signInWithPhoneNumber({
      phoneNumber,
      resendCode: Capacitor.isNativePlatform() ? resendCode : undefined,
      recaptchaVerifier: Capacitor.isNativePlatform() ? undefined : prepareRecaptcha(),
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    await removeListeners(handles);
    throw error;
  }

  await result;
}

export async function verifyFirebasePhoneOtp(code: string) {
  if (!automaticallyVerified) {
    if (!verificationId) throw new Error('اطلب رمز تحقق جديدًا ثم حاول مرة أخرى.');
    await FirebaseAuthentication.confirmVerificationCode({
      verificationId,
      verificationCode: code,
    });
  }

  const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
  if (!token) throw new Error('تعذر تأكيد جلسة Firebase.');

  const { data: exchange, error: exchangeError } = await supabase.functions.invoke(
    'firebase-auth-exchange',
    { body: { firebaseToken: token, shouldCreateUser: shouldCreateSupabaseUser } },
  );

  if (exchangeError) throw exchangeError;
  if (!exchange?.access_token || !exchange?.refresh_token) {
    throw new Error(exchange?.error || 'تعذر إنشاء جلسة الدخول.');
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: exchange.access_token,
    refresh_token: exchange.refresh_token,
  });
  if (error) throw error;

  verificationId = '';
  automaticallyVerified = false;
  shouldCreateSupabaseUser = true;
  return data;
}

export async function signOutFirebase() {
  try {
    await FirebaseAuthentication.signOut();
  } catch (error) {
    console.warn('Unable to sign out of Firebase:', error);
  }
}
