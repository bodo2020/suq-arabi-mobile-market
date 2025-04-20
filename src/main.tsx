
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add hide-scrollbar class to main elements to hide scrollbars while allowing scrolling
document.documentElement.classList.add('hide-scrollbar');
document.body.classList.add('hide-scrollbar');

const root = document.getElementById("root");
if (root) {
  root.classList.add('hide-scrollbar');
  createRoot(root).render(<App />);
}
