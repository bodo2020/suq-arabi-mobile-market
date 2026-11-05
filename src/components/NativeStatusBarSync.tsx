import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Matches the light green top of the home/categories hero header and the
// Android theme's launch color, so there is no jump on first paint.
const FALLBACK = '#E6F9EE';

type Rgba = [number, number, number, number];

function parseColor(value: string | null | undefined): Rgba | null {
  const match = value?.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(n => !Number.isFinite(n))) return null;
  return [parts[0], parts[1], parts[2], Number.isFinite(parts[3]) ? parts[3] : 1];
}

const toHex = ([r, g, b]: Rgba) =>
  `#${[r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

// The page colour right under the status bar: the first opaque background
// (or the first stop of a gradient) found from the top-centre element upward.
function colorAtTop(): string {
  let el = document.elementFromPoint(window.innerWidth / 2, 1) as HTMLElement | null;
  while (el) {
    const style = getComputedStyle(el);
    const solid = parseColor(style.backgroundColor);
    if (solid && solid[3] > 0.5) return toHex(solid);
    if (style.backgroundImage.includes('gradient')) {
      const stop = parseColor(style.backgroundImage);
      if (stop && stop[3] > 0.5) return toHex(stop);
    }
    el = el.parentElement;
  }
  return FALLBACK;
}

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

/**
 * Keeps the Android status bar the same colour as the app header on every
 * screen (mint on home/categories, white elsewhere) instead of a fixed dark
 * green bar, with dark icons on light backgrounds.
 */
export default function NativeStatusBarSync() {
  const location = useLocation();

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let last = '';
    let frame: number | null = null;

    const apply = () => {
      frame = null;
      const color = colorAtTop();
      if (color === last) return;
      last = color;
      void StatusBar.setBackgroundColor({ color }).catch(() => {});
      void StatusBar.setStyle({ style: isLight(color) ? Style.Light : Style.Dark }).catch(() => {});
    };
    const schedule = () => {
      if (frame == null) frame = window.requestAnimationFrame(apply);
    };

    // Lazy routes and the collapsing home header paint after navigation, so
    // re-check shortly after, and on scroll/resize.
    schedule();
    const timers = [120, 450, 1200].map(ms => window.setTimeout(schedule, ms));
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      timers.forEach(window.clearTimeout);
      if (frame != null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [location.pathname, location.search]);

  return null;
}
