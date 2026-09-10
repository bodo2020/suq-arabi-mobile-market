import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { hydrateOfflineCatalog, subscribeOfflineCatalog } from './lib/offlineCatalogCache'

// Create a client. Queries stay paused while the device is offline and refetch
// automatically when connectivity returns; mutations are never forced offline.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: failureCount => (typeof navigator === 'undefined' || navigator.onLine) && failureCount < 2,
      refetchOnReconnect: true,
    },
    mutations: {
      networkMode: 'online',
      retry: false,
    },
  },
})

// Restore only non-sensitive public shopping data so a previously opened store
// can still show categories/products when Android starts without connectivity.
hydrateOfflineCatalog(queryClient)
subscribeOfflineCatalog(queryClient)

// Mark the native runtime once so shared UI can adapt to Android/iOS safe areas.
if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform();
  document.documentElement.classList.add('native-platform', `native-${platform}`);
}

// Add hide-scrollbar class to main elements to hide scrollbars while allowing scrolling
if (document.documentElement && document.documentElement.classList) {
  document.documentElement.classList.add('hide-scrollbar');
}
if (document.body && document.body.classList) {
  document.body.classList.add('hide-scrollbar');
}

// Hide Lovable badge - additional runtime hiding
const hideLovableBadge = () => {
  // Remove any existing badges
  const removeBadges = () => {
    const selectors = [
      'a[href*="lovable.dev"]',
      'a[href*="lovable.app"]',
      '[class*="lovable-badge"]',
      '[class*="lovable"]',
      '[id*="lovable"]',
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    });
  };

  // The observer invokes this after DOM changes; never create recurring timers here.
  removeBadges();
};

// Run badge hiding function
hideLovableBadge();

// Create MutationObserver to watch for dynamically added elements
const observer = new MutationObserver(() => {
  hideLovableBadge();
});

// Start observing the document with the configured parameters
if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'id']
  });
}

const root = document.getElementById("root");
if (root) {
  if (root.classList) {
    root.classList.add('hide-scrollbar');
  }
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
