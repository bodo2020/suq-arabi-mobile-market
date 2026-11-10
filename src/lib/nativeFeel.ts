import { Capacitor } from '@capacitor/core';
import { onlineManager } from '@tanstack/react-query';

/** A light tap the customer feels when something lands in the bag (phones only). */
export function tapFeedback(kind: 'light' | 'success' = 'light') {
  if (!Capacitor.isNativePlatform()) return;
  void import('@capacitor/haptics').then(({ Haptics, ImpactStyle, NotificationType }) => {
    if (kind === 'success') return Haptics.notification({ type: NotificationType.Success });
    return Haptics.impact({ style: ImpactStyle.Light });
  }).catch(() => { /* vibration is optional */ });
}

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();
let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let started = false;

function set(next: boolean) {
  if (next === online) return;
  online = next;
  onlineManager.setOnline(next); // queries pause offline and refetch when back
  listeners.forEach(listener => listener(next));
}

/**
 * Connection state from the phone itself (Capacitor Network) — more reliable
 * than the browser's online flag inside the app — with the browser events as
 * fallback on the web.
 */
export function watchNetwork(listener: Listener): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    window.addEventListener('online', () => set(true));
    window.addEventListener('offline', () => set(false));
    if (Capacitor.isNativePlatform()) {
      void import('@capacitor/network').then(async ({ Network }) => {
        set((await Network.getStatus()).connected);
        await Network.addListener('networkStatusChange', status => set(status.connected));
      }).catch(() => { /* browser events still work */ });
    }
  }
  listener(online);
  return () => { listeners.delete(listener); };
}
