import { Capacitor } from '@capacitor/core';

export const ANDROID_PACKAGE = 'com.elmadawy.market.customer';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;

/** True only in an Android phone browser: not the installed app, not iOS, not desktop. */
export function isAndroidWebBrowser(): boolean {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return false;
  return /Android/i.test(navigator.userAgent);
}
