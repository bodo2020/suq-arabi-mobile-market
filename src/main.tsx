import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App.tsx'
import './index.css'
import { installThmanyahFont } from './lib/installThmanyahFont'
import './styles/product-card-layout.css'
// Dark counterparts of hard-coded colours (generated) + runtime-colour pieces. Must load last.
import './styles/dark-theme.generated.css'
import './styles/dark-theme.custom.css'
import { QueryClient, onlineManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { DEVICE_CACHE_BUSTER, DEVICE_CACHE_MAX_AGE, deviceQueryPersister, isSavedOnDevice, keepSavedQueriesInMemory } from './lib/deviceQueryCache'

// Bundled font faces are provided inside the app, not via public /fonts URLs.
installThmanyahFont()

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

// Shopping screens are kept on the phone (IndexedDB) and restored on launch, so
// the app opens instantly and can be browsed offline; see deviceQueryCache.
keepSavedQueriesInMemory(queryClient)
// React Query assumes it starts online and only listens for changes; when the
// app is opened offline it must know, so it shows saved copies instead of failing.
if (typeof navigator !== 'undefined') onlineManager.setOnline(navigator.onLine)
// The old 4 MB localStorage snapshot is replaced by the device cache.
try { localStorage.removeItem('elmadawy_public_catalog_cache_v1') } catch { /* optional */ }

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: deviceQueryPersister,
        maxAge: DEVICE_CACHE_MAX_AGE,
        buster: DEVICE_CACHE_BUSTER,
        dehydrateOptions: { shouldDehydrateQuery: isSavedOnDevice },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  );
}
