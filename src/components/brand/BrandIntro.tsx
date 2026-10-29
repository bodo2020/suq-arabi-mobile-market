import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';
import BrandWordmark from './BrandWordmark';
import BrandLoader from '@/components/ui/BrandLoader';

type IntroMode = 'intro' | 'refresh' | null;

function initialIntroMode(): IntroMode {
  if (typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  // A browser reload gets the lighter refresh animation; a new app session
  // gets the full brand assembly. Neither runs on ordinary route changes.
  const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const isReload = navigation?.type === 'reload';
  try {
    const seen = sessionStorage.getItem('super-marko-intro-v2');
    if (!seen) sessionStorage.setItem('super-marko-intro-v2', '1');
    if (isReload) return 'refresh';
    return seen ? null : 'intro';
  } catch {
    return isReload ? 'refresh' : 'intro';
  }
}

/** Intro is visual only: never intercepts taps, routes, or data fetching.
 * Uses the exact homepage wordmark and the transparent official SVG mark. */
export default function BrandIntro() {
  const [mode, setMode] = useState<IntroMode>(initialIntroMode);

  // Always recreate the timer after StrictMode cleanup.
  useEffect(() => {
    if (!mode) return;
    const timer = window.setTimeout(() => setMode(null), mode === 'intro' ? 1900 : 1350);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (!mode) return null;
  return (
    <div className={`brand-intro brand-intro--${mode}`} aria-hidden="true" dir="rtl">
      <div className="brand-intro__stack">
        {mode === 'intro' ? (
          <BrandMark variant="mark" motion="reveal" className="brand-intro__mark" />
        ) : (
          <BrandLoader size="lg" label="جاري تحديث الصفحة" className="brand-intro__refresh-loader" />
        )}
        <BrandWordmark className="brand-name--home brand-name--intro" />
        {mode === 'refresh' && <span className="brand-intro__refresh-caption">جاري التحديث…</span>}
      </div>
    </div>
  );
}
