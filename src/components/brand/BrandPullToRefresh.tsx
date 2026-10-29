import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BrandLoader from '@/components/ui/BrandLoader';

/** Native-only pull indicator: regular Chrome already implements pull-to-reload.
 * Refresh active read queries without navigating, remounting or touching carts.
 * Avoid payment/auth and modal interactions entirely. */
export default function BrandPullToRefresh() {
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  const enabled = pathname === '/' || pathname === '/categories' ||
    pathname.startsWith('/category/') || pathname === '/offers' ||
    pathname.startsWith('/stores') || pathname === '/orders' ||
    pathname === '/favorites' || pathname === '/notifications';

  useEffect(() => {
    if (!enabled || !document.documentElement.classList.contains('native-platform')) return;
    let startX: number | null = null;
    let startY: number | null = null;
    let disposed = false;
    let finishTimer: number | undefined;

    const resetGesture = () => {
      startX = null;
      startY = null;
      pullRef.current = 0;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      setPull(0);
    };

    const start = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1 ||
          window.scrollY > 0 || (document.scrollingElement?.scrollTop ?? 0) > 0) return;
      const target = event.target;
      if (!(target instanceof Element) ||
          target.closest('button, a, input, textarea, select, [contenteditable="true"], [role="dialog"], [data-vaul-drawer], [data-no-pull-refresh]')) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const move = (event: TouchEvent) => {
      if (startY === null || startX === null || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - startY;
      const dx = Math.abs(event.touches[0].clientX - startX);
      if (dy < 8 || dx > dy * .7 ||
          window.scrollY > 0 || (document.scrollingElement?.scrollTop ?? 0) > 0) return;
      if (event.cancelable) event.preventDefault();
      pullRef.current = Math.min(110, dy * .55);
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          if (!disposed) setPull(pullRef.current);
        });
      }
    };

    const end = () => {
      const shouldRefresh = pullRef.current >= 75 && navigator.onLine && !refreshingRef.current;
      resetGesture();
      if (!shouldRefresh) return;
      refreshingRef.current = true;
      setRefreshing(true);
      const started = Date.now();
      void queryClient.invalidateQueries({ refetchType: 'active' })
        .catch(() => { /* The page keeps its own data-error presentation. */ })
        .finally(() => {
          const remaining = Math.max(0, 650 - (Date.now() - started));
          finishTimer = window.setTimeout(() => {
            refreshingRef.current = false;
            if (!disposed) setRefreshing(false);
          }, remaining);
        });
    };

    const cancel = () => resetGesture();
    document.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener('touchstart', start);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('touchend', end);
      document.removeEventListener('touchcancel', cancel);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      pullRef.current = 0;
      refreshingRef.current = false;
    };
  }, [enabled, queryClient, pathname]);

  if (!enabled || (!pull && !refreshing)) return null;
  return (
    <div className="brand-pull-refresh" role="status" aria-live="polite">
      <BrandLoader size="md" label={refreshing ? 'جاري تحديث البيانات' : 'اسحب للتحديث'} />
      <span>{refreshing ? 'جاري التحديث…' : pull >= 75 ? 'افلت للتحديث' : 'اسحب للتحديث'}</span>
    </div>
  );
}
