import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import BrandMark from './BrandMark';
import BrandWordmark from './BrandWordmark';
import BrandLoader from '@/components/ui/BrandLoader';
import IntroGroceries from './IntroGroceries';

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
    try {
      window.sessionStorage.setItem('super-marko-intro-v2', '1');
    } catch {
      // Restricted storage must not interrupt the animation.
    }
    const timer = window.setTimeout(() => {
      setMode(null);
      // Let the status bar return to the page colour right away.
      window.setTimeout(() => window.dispatchEvent(new Event('brand-intro-done')), 0);
    }, mode === 'intro' ? 2700 : 1350);
    return () => window.clearTimeout(timer);
  }, [mode]);

  if (!mode) return null;
  // In the Android app the native splash already shows the full mark at the
  // same size and place, so continue from it instead of redrawing it.
  const native = Capacitor.isNativePlatform();
  return (
    <div className={`brand-intro brand-intro--${mode} ${native ? 'brand-intro--native' : ''}`} aria-hidden="true" dir="rtl">
      {mode === 'intro' && <>
        <span className="brand-intro__blob brand-intro__blob--gold" />
        <span className="brand-intro__blob brand-intro__blob--white" />
      </>}
      <div className="brand-intro__stack">
        {mode === 'intro' ? (
          <span className="brand-intro__hero">
            <span className="brand-intro__trail"><i /><i /><i /></span>
            <span className="brand-intro__sparks">
              {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => <i key={angle} style={{ '--a': `${angle}deg` } as React.CSSProperties} />)}
            </span>
            <span className="brand-intro__bag">
              <IntroGroceries />
              <BrandMark variant="mark" tone="onGreen" motion="reveal" className="brand-intro__mark" />
            </span>
          </span>
        ) : (
          <BrandLoader size="lg" tone="onGreen" label="جاري تحديث الصفحة" className="brand-intro__refresh-loader" />
        )}
        <BrandWordmark className="brand-name--intro" />
        {mode === 'intro' && <span className="brand-intro__slogan">شنطتك مليانة… وجاية لحد بابك</span>}
        {mode === 'refresh' && <span className="brand-intro__refresh-caption">جاري التحديث…</span>}
      </div>
    </div>
  );
}
