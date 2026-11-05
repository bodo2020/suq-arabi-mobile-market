import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import BrandMark from './BrandMark';
import BrandWordmark from './BrandWordmark';

const THRESHOLD = 96;
// Little brand-coloured pieces that pop around the logo once the pull is far enough.
const CONFETTI = [
  { x: -150, y: -30, r: 20, c: '#FFC120' }, { x: -168, y: 10, r: -15, c: '#005931' },
  { x: -132, y: 26, r: 45, c: '#9ED9B6' }, { x: 150, y: -28, r: -25, c: '#005931' },
  { x: 168, y: 12, r: 30, c: '#FFC120' }, { x: 134, y: 28, r: 10, c: '#9ED9B6' },
  { x: -60, y: -46, r: 45, c: '#9ED9B6' }, { x: 40, y: -48, r: -10, c: '#FFC120' },
  { x: -10, y: -54, r: 35, c: '#005931' },
];
const SETTLE_MS = 280;

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

  // A new route must never inherit a spinner from the previous page.
  useEffect(() => {
    setPull(0);
    setRefreshing(false);
    refreshingRef.current = false;
  }, [pathname]);

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
      pullRef.current = Math.min(150, dy * .55);
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          if (!disposed) setPull(pullRef.current);
        });
      }
    };

    const end = () => {
      const shouldRefresh = pullRef.current >= THRESHOLD && navigator.onLine && !refreshingRef.current;
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

  // The whole app slides down with the finger (like a native pull-to-refresh)
  // and reveals the brand panel behind it. The transform is removed entirely
  // when idle so fixed headers/bottom nav go back to normal positioning.
  // On release the page slides straight back; the refresh runs in the background.
  const offset = pull;
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    if (offset > 0) {
      setPanelVisible(true);
      const dragging = pull > 0;
      root.dataset.pull = dragging ? 'drag' : 'settle';
      root.style.setProperty('--pull-offset', `${offset}px`);
      root.style.transition = dragging ? 'none' : `transform ${SETTLE_MS}ms cubic-bezier(.2,.8,.2,1)`;
      root.style.transform = `translate3d(0, ${offset}px, 0)`;
      return;
    }
    if (!root.style.transform) return;
    root.dataset.pull = 'settle';
    root.style.setProperty('--pull-offset', '0px');
    root.style.transition = `transform ${SETTLE_MS}ms cubic-bezier(.2,.8,.2,1)`;
    root.style.transform = 'translate3d(0, 0, 0)';
    const timer = window.setTimeout(() => {
      delete root.dataset.pull;
      root.style.removeProperty('--pull-offset');
      root.style.transition = '';
      root.style.transform = '';
      setPanelVisible(false);
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [offset, pull]);

  // Let the native status bar re-sample its colour when the panel opens/closes.
  useEffect(() => {
    window.dispatchEvent(new Event('brand-pull-change'));
  }, [panelVisible]);

  useEffect(() => () => {
    const root = document.getElementById('root');
    if (root) { delete root.dataset.pull; root.style.removeProperty('--pull-offset'); root.style.transition = ''; root.style.transform = ''; }
  }, []);

  if (!enabled || (!panelVisible && !pull)) return null;
  const progress = Math.min(1, pull / THRESHOLD);
  const label = pull >= THRESHOLD ? 'سيب وهنحدّثلك' : 'اسحب لتحت عشان تحدّث';
  return createPortal(
    <div
      className="brand-pull-panel"
      style={{ height: `calc(var(--safe-area-top, 0px) + ${Math.max(offset, 0)}px)`, '--pull-progress': progress } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <div className="brand-pull-panel__content">
        <span className="brand-pull-panel__brand">
          {pull >= THRESHOLD && (
            <span className="brand-pull-panel__confetti" aria-hidden="true">
              {CONFETTI.map((piece, index) => (
                <i
                  key={index}
                  style={{ '--x': `${piece.x}px`, '--y': `${piece.y}px`, '--r': `${piece.r}deg`, background: piece.c, animationDelay: `${index * 18}ms` } as CSSProperties}
                />
              ))}
            </span>
          )}
          <BrandMark className="brand-pull-panel__mark" />
          <BrandWordmark className="brand-name--home brand-pull-panel__wordmark" />
        </span>
        <span className="brand-pull-panel__label">{label}</span>
      </div>
    </div>,
    document.body,
  );
}
