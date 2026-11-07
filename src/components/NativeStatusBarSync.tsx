import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// Matches the light green top of the home/categories hero header and the
// Android theme's launch color, so there is no jump on first paint.
const FALLBACK = '#E6F9EE';
// The light page under the product sheet's 50% slate backdrop.
const SHEET_DIM = '#757C80';

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
  // The pull-to-refresh panel ignores pointer events, so elementFromPoint
  // would see past it; while it is open the top of the screen is mint.
  if (document.querySelector('.brand-pull-panel')) return document.documentElement.classList.contains('dark') ? '#101713' : FALLBACK;
  // The launch intro is brand green, continuing the native splash.
  if (document.querySelector('.brand-intro')) return '#005931';
  // Full-bleed home banner behind a see-through header: elementFromPoint only
  // finds the header, so use the current banner's edge colour directly (set
  // the moment the slide changes) until the header turns white on collapse.
  const root = document.documentElement;
  if (root.classList.contains('has-hero-bleed')) {
    const header = document.querySelector<HTMLElement>('.home-top-nav[data-customer-header="hero"]');
    const progress = Number.parseFloat(header?.style.getPropertyValue('--home-scroll-progress') || '0') || 0;
    if (progress < 0.75) return root.style.getPropertyValue('--hero-edge').trim() || FALLBACK;
    return root.classList.contains('dark') ? '#171C1A' : '#FFFFFF';
  }
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
    // A product sheet dims the page behind it, so the bar takes the dimmed
    // tone (light icons). A fixed colour also avoids sampling, which forced
    // style/layout on every swipe because each product is its own route.
    if (location.pathname.startsWith('/product/')) {
      void StatusBar.setBackgroundColor({ color: SHEET_DIM }).catch(() => {});
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      return;
    }
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
    // Pull-to-refresh opens/closes without scrolling the page.
    window.addEventListener('brand-pull-change', schedule);
    window.addEventListener('brand-intro-done', schedule);
    // The tinted header eases to the new banner colour over 0.6s (see
    // hero-banner.css), so sample again once that transition has finished;
    // otherwise the bar keeps the previous banner's colour.
    let tintTimer: number | null = null;
    const onTint = () => {
      schedule();
      if (tintTimer != null) window.clearTimeout(tintTimer);
      tintTimer = window.setTimeout(schedule, 650);
    };
    window.addEventListener('hero-tint-change', onTint);
    // Light / dark switch: recolour the bar and its icons.
    const themeObserver = new MutationObserver(schedule);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      timers.forEach(window.clearTimeout);
      if (frame != null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('brand-pull-change', schedule);
      window.removeEventListener('brand-intro-done', schedule);
      window.removeEventListener('hero-tint-change', onTint);
      if (tintTimer != null) window.clearTimeout(tintTimer);
      themeObserver.disconnect();
    };
  }, [location.pathname, location.search]);

  return null;
}
