
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

const root = document.getElementById("root");
if (root) {
  root.classList.add('hide-scrollbar');
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
