
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// إضافة نمط hide-scrollbar إلى العنصر الرئيسي
document.documentElement.classList.add('hide-scrollbar');
document.body.classList.add('hide-scrollbar');

const root = document.getElementById("root");
if (root) {
  root.classList.add('hide-scrollbar');
  createRoot(root).render(<App />);
}
