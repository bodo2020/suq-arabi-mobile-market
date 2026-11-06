import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type DeviceLocation = { lat: number; lng: number; accuracy: number | null };
export type LocationFailure = 'denied' | 'off' | 'timeout' | 'unsupported' | 'error';

export class LocationError extends Error {
  constructor(public readonly kind: LocationFailure, message?: string) {
    super(message || kind);
  }
}

const OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };

function nativeFailure(error: unknown): LocationFailure {
  const code = String((error as { code?: string })?.code || '');
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  if (code.endsWith('0003') || message.includes('denied') && message.includes('permission')) return 'denied';
  // 0007: location services off · 0009: user declined the "turn on location" dialog.
  if (code.endsWith('0007') || code.endsWith('0009') || code.endsWith('0016') || message.includes('not enabled') || message.includes('disabled')) return 'off';
  if (code.endsWith('0010') || message.includes('timeout') || message.includes('in time')) return 'timeout';
  return 'error';
}

/**
 * Current device position. In the Android app this asks for the location
 * permission when needed and, if GPS is switched off, shows Android's own
 * "turn on device location" dialog. In the browser it uses the standard
 * prompt. Failures are reported as a LocationError with a simple kind.
 */
export async function getDeviceLocation(): Promise<DeviceLocation> {
  if (Capacitor.isNativePlatform()) {
    try {
      const position = await Geolocation.getCurrentPosition(OPTIONS);
      return { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy ?? null };
    } catch (error) {
      throw new LocationError(nativeFailure(error), (error as Error)?.message);
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) throw new LocationError('unsupported');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy ?? null }),
      reason => reject(new LocationError(
        reason.code === reason.PERMISSION_DENIED ? 'denied' : reason.code === reason.TIMEOUT ? 'timeout' : 'off',
        reason.message,
      )),
      OPTIONS,
    );
  });
}

export const isNativeApp = () => Capacitor.isNativePlatform();
