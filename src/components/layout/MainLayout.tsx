
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Layers, ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();
  const path = location.pathname;
  const { getTotalItems } = useCart();
  const isMobile = useIsMobile();
  const cartCount = getTotalItems();

  const isActive = (route: string) => {
    return path === route;
  };

  return (
    <div className="pb-16 md:pb-0 min-h-screen bg-gray-50">
      {/* Main content */}
      <main className="container mx-auto px-4 md:max-w-6xl">
        {!isMobile && (
          <div className="hidden md:flex justify-between items-center py-4 mb-4 border-b">
            <Link to="/" className="text-xl font-bold">سوق عربي</Link>
            <div className="flex space-x-6">
              <Link 
                to="/" 
                className={`flex items-center text-sm ${isActive('/') ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}`}
              >
                <Home size={20} className="ml-1" />
                <span>الرئيسية</span>
              </Link>
              <Link 
                to="/categories" 
                className={`flex items-center text-sm ${isActive('/categories') ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}`}
              >
                <Layers size={20} className="ml-1" />
                <span>الأقسام</span>
              </Link>
              <Link 
                to="/cart" 
                className={`flex items-center text-sm relative ${isActive('/cart') ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}`}
              >
                <ShoppingCart size={20} className="ml-1" />
                <span>السلة</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link 
                to="/account" 
                className={`flex items-center text-sm ${isActive('/account') ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'}`}
              >
                <User size={20} className="ml-1" />
                <span>الحساب</span>
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* Bottom Navigation - only shown on mobile */}
      {isMobile && (
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
            className={`bottom-nav-item relative ${isActive('/cart') ? 'active' : ''}`}
          >
            <ShoppingCart size={24} />
            <span>السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <Link 
            to="/account" 
            className={`bottom-nav-item ${isActive('/account') ? 'active' : ''}`}
          >
            <User size={24} />
            <span>الحساب</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default MainLayout;
