import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

const TOKEN_KEY = 'elmadawy.push.token';
const DEVICE_KEY = 'elmadawy.push.device-key';
const NATIVE_PUSH_CONFIGURED = String(import.meta.env.VITE_NATIVE_PUSH_CONFIGURED || '').toLowerCase() === 'true';

type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

type PushNotificationPayload = {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
};

type PushAction = {
  notification?: PushNotificationPayload;
  actionId?: string;
};

type ListenerHandle = { remove: () => Promise<void> };

interface PushNotificationsPlugin {
  checkPermissions(): Promise<{ receive: PermissionState }>;
  requestPermissions(): Promise<{ receive: PermissionState }>;
  register(): Promise<void>;
  unregister(): Promise<void>;
  createChannel(options: {
    id: string;
    name: string;
    description?: string;
    importance?: number;
    visibility?: number;
    vibration?: boolean;
  }): Promise<void>;
  addListener(eventName: 'registration', callback: (token: { value: string }) => void): Promise<ListenerHandle>;
  addListener(eventName: 'registrationError', callback: (error: { error?: string }) => void): Promise<ListenerHandle>;
  addListener(eventName: 'pushNotificationReceived', callback: (notification: PushNotificationPayload) => void): Promise<ListenerHandle>;
  addListener(eventName: 'pushNotificationActionPerformed', callback: (action: PushAction) => void): Promise<ListenerHandle>;
}

const PushNotifications = registerPlugin<PushNotificationsPlugin>('PushNotifications');

export type CustomerPushEvent = {
  title?: string;
  body?: string;
  actionUrl?: string | null;
  data?: Record<string, unknown>;
};

export type CustomerPushPermissionResult = 'granted' | 'denied' | 'unsupported';

function nativePushAvailable() {
  return NATIVE_PUSH_CONFIGURED
    && Capacitor.isNativePlatform()
    && Boolean((Capacitor as any).isPluginAvailable?.('PushNotifications'));
}

function getOrCreateDeviceKey() {
  const current = localStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, generated);
  return generated;
}

function getActionUrl(data?: Record<string, unknown>) {
  const raw = data?.action_url;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value.startsWith('/') ? value : null;
}

async function registerTokenOnServer(token: string, retry = 0): Promise<void> {
  const platform = Capacitor.getPlatform();
  if (!['android', 'ios'].includes(platform)) return;

  const { error } = await (supabase as any).rpc('register_push_device_v2', {
    p_token: token,
    p_platform: platform,
    p_app_kind: 'customer',
    p_device_key: getOrCreateDeviceKey(),
    p_locale: 'ar-EG',
  });

  if (!error) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  // The customer row can be created a few seconds after first authentication.
  if (String(error.message || '').includes('CUSTOMER_PROFILE_REQUIRED') && retry < 5) {
    await new Promise(resolve => window.setTimeout(resolve, 4000));
    return registerTokenOnServer(token, retry + 1);
  }

  throw error;
}

async function createAndroidChannels() {
  if (Capacitor.getPlatform() !== 'android') return;
  const channels = [
    { id: 'orders', name: 'متابعة الطلبات', description: 'حالة الطلب والتجهيز والتوصيل', importance: 4 },
    { id: 'offers', name: 'العروض والتذكيرات', description: 'العروض وتذكير السلة', importance: 3 },
    { id: 'general', name: 'إشعارات المعداوي ماركت', description: 'الإشعارات العامة', importance: 3 },
  ];
  for (const channel of channels) {
    try {
      await PushNotifications.createChannel({ ...channel, vibration: true });
    } catch (error) {
      console.warn('Unable to create push channel', channel.id, error);
    }
  }
}

export async function initializeCustomerPushNotifications(callbacks?: {
  onReceived?: (event: CustomerPushEvent) => void;
  onAction?: (event: CustomerPushEvent) => void;
  onError?: (error: unknown) => void;
}) {
  if (!nativePushAvailable()) {
    if (Capacitor.isNativePlatform()) console.info('PushNotifications is disabled because Firebase client config is unavailable in this build.');
    return () => undefined;
  }

  const handles: ListenerHandle[] = [];
  handles.push(await PushNotifications.addListener('registration', token => {
    void registerTokenOnServer(token.value).catch(error => callbacks?.onError?.(error));
  }));
  handles.push(await PushNotifications.addListener('registrationError', error => {
    callbacks?.onError?.(error.error || 'PUSH_REGISTRATION_FAILED');
  }));
  handles.push(await PushNotifications.addListener('pushNotificationReceived', notification => {
    callbacks?.onReceived?.({
      title: notification.title,
      body: notification.body,
      actionUrl: getActionUrl(notification.data),
      data: notification.data,
    });
  }));
  handles.push(await PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const notification = action.notification || {};
    callbacks?.onAction?.({
      title: notification.title,
      body: notification.body,
      actionUrl: getActionUrl(notification.data),
      data: notification.data,
    });
  }));

  await createAndroidChannels();

  const permission = await PushNotifications.checkPermissions();
  // If permission was already granted, refresh the token without showing another prompt.
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  return async () => {
    await Promise.all(handles.map(handle => handle.remove().catch(() => undefined)));
  };
}

export async function requestCustomerPushPermissionAndRegister(): Promise<CustomerPushPermissionResult> {
  if (!nativePushAvailable()) return 'unsupported';

  await createAndroidChannels();
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return 'denied';

  // The bootstrap listener owns the server registration callback.
  await PushNotifications.register();
  return 'granted';
}

export async function getNativePushPermission(): Promise<CustomerPushPermissionResult | 'prompt'> {
  if (!nativePushAvailable()) return 'unsupported';
  const permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'granted') return 'granted';
  if (permission.receive === 'denied') return 'denied';
  return 'prompt';
}

export async function deactivateCurrentPushDevice() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await (supabase as any).rpc('unregister_push_device_v2', { p_token: token });
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function getMyPushDeviceStatus() {
  const { data, error } = await (supabase as any).rpc('get_my_push_device_status_v2');
  if (error) throw error;
  return data as {
    registered?: boolean;
    device_count?: number;
    platforms?: string[];
    providers?: string[];
  };
}
