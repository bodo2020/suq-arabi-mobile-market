import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';

/** A one-time nonblocking brand reveal per app session. Android's native
 * system splash remains static; this runs only after the WebView mounts. */
export default function BrandIntro() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (sessionStorage.getItem('super-marko-intro-v1')) return;
      sessionStorage.setItem('super-marko-intro-v1', '1');
    } catch {
      return; // Restricted browser storage should never block app startup.
    }
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 880);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return (
    <div className="brand-intro" aria-hidden="true" dir="rtl">
      <div className="brand-intro__stack">
        <BrandMark variant="badge" motion="reveal" className="brand-intro__mark" />
        <span className="brand-intro__title">سوبر ماركو</span>
      </div>
    </div>
  );
}
