import { Capacitor } from '@capacitor/core';

/**
 * Live updates (Capgo): ship web fixes to installed apps without waiting for
 * Google Play review. Automatic updates stay OFF (capacitor.config.ts) until a
 * Capgo channel is set up; telling the plugin the app started fine is still
 * required so a broken update would be rolled back automatically.
 */
export function confirmAppStarted() {
  if (!Capacitor.isNativePlatform()) return;
  void import('@capgo/capacitor-updater')
    .then(({ CapacitorUpdater }) => CapacitorUpdater.notifyAppReady())
    .catch(() => { /* plugin missing in older native builds */ });
}
