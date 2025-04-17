
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, ShoppingCart, User } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route: string) => {
    return path === route;
  };

  return (
    <div className="pb-16 min-h-screen bg-gray-50">
      {/* Main content */}
      <main className="container mx-auto px-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link 
          to="/" 
          className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
        >
          <Home size={24} />
          <span>الرئيسية</span>
        </Link>

        <Link 
          to="/categories" 
          className={`bottom-nav-item ${isActive('/categories') ? 'active' : ''}`}
        >
          <Layers size={24} />
          <span>الأقسام</span>
        </Link>

        <Link 
          to="/cart" 
          className={`bottom-nav-item ${isActive('/cart') ? 'active' : ''}`}
        >
          <ShoppingCart size={24} />
          <span>السلة</span>
        </Link>

        <Link 
          to="/account" 
          className={`bottom-nav-item ${isActive('/account') ? 'active' : ''}`}
        >
          <User size={24} />
          <span>الحساب</span>
        </Link>
      </nav>
    </div>
  );
};

export default MainLayout;
