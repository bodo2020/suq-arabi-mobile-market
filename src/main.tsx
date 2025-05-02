
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Add hide-scrollbar class to main elements to hide scrollbars while allowing scrolling
document.documentElement.classList.add('hide-scrollbar');
document.body.classList.add('hide-scrollbar');

// Hide Lovable badge - more aggressive approach
const hideLovableBadge = () => {
  // Style to hide badge
  const style = document.createElement('style');
  style.textContent = `
    a[href*="lovable.dev"], 
    a[href*="lovable.app"],
    [class*="lovable"],
    [class*="lovable-badge"],
    [id*="lovable"],
    [data-lovable],
    [aria-label*="lovable"],
    [aria-label*="Lovable"] {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      position: absolute !important;
      pointer-events: none !important;
      width: 0 !important;
      height: 0 !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      margin: -1px !important;
      padding: 0 !important;
      border: 0 !important;
    }
  `;
  document.head.appendChild(style);

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
  
  // Run immediately and periodically
  removeBadges();
  setInterval(removeBadges, 500);
};

// Run badge hiding function
hideLovableBadge();

// Create MutationObserver to watch for dynamically added elements
const observer = new MutationObserver(() => {
  hideLovableBadge();
});

// Start observing the document with the configured parameters
observer.observe(document.body, { 
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['class', 'style', 'id']
});

const root = document.getElementById("root");
if (root) {
  root.classList.add('hide-scrollbar');
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
