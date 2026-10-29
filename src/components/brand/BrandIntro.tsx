import { useEffect, useState } from 'react';
import BrandMark from './BrandMark';

/** A one-time, nonblocking brand reveal per app session. The native Android
 * system splash remains static; this only animates after the WebView mounts. */
export default function BrandIntro() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    try {
      if (sessionStorage.getItem('super-marko-intro-v1')) return false;
      sessionStorage.setItem('super-marko-intro-v1', '1');
      return true;
    } catch {
      return false; // Disabled browser storage must not block startup.
    }
  });

  // The timeout is always recreated after React StrictMode effect cleanup,
  // rather than leaving an orphaned overlay on the first development mount.
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => setVisible(false), 880);
    return () => window.clearTimeout(timer);
  }, [visible]);

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
