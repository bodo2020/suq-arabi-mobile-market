import { useEffect } from 'react';
import { useNavigate, type Location, type NavigateFunction, type NavigateOptions, type To } from 'react-router-dom';

/**
 * Navigation for very common leaf components (product cards, favourite
 * buttons) without subscribing them to the router.
 *
 * `useNavigate()` and `<Link>` read the location context, so every mounted
 * product card re-rendered on *every* route change: swiping between product
 * sheets re-rendered the whole catalog behind the sheet (~100–200 cards,
 * ~200ms per swipe on a mid-range phone). These helpers read the current
 * location from the browser at click time instead.
 */
let navigateRef: NavigateFunction | null = null;

/** Mount once inside the router. */
export function NavigationBridge() {
  const navigate = useNavigate();
  useEffect(() => {
    navigateRef = navigate;
    return () => { if (navigateRef === navigate) navigateRef = null; };
  }, [navigate]);
  return null;
}

export function appNavigate(to: To | number, options?: NavigateOptions) {
  if (navigateRef) {
    if (typeof to === 'number') navigateRef(to);
    else navigateRef(to, options);
    return;
  }
  if (typeof to === 'number') window.history.go(to);
  else window.location.assign(typeof to === 'string' ? to : `${to.pathname || ''}${to.search || ''}${to.hash || ''}`);
}

/** The router's current location, read from the browser history entry. */
export function currentRouterLocation(): Location {
  const entry = (window.history.state || {}) as { usr?: unknown; key?: string };
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: entry.usr ?? null,
    key: entry.key || 'default',
  };
}
