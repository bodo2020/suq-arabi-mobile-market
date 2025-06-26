
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingCart, User } from 'lucide-react';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children
}) => {
  const location = useLocation();
  const path = location.pathname;
  const { getTotalItems } = useCart();
  const isMobile = useIsMobile();
  const cartCount = getTotalItems();

  React.useEffect(() => {
    document.body.dir = "rtl";

    // Hide Lovable badge by removing it from DOM if present
    const hideLovableBadge = () => {
      const badges = document.querySelectorAll('a[href*="lovable.dev"]');
      badges.forEach(badge => {
        if (badge.parentNode) {
          badge.parentNode.removeChild(badge);
        }
      });
    };

    // Run immediately and after a small delay to catch any badges added dynamically
    hideLovableBadge();
    setTimeout(hideLovableBadge, 1000);

    // Create a MutationObserver to remove any badges that might be added after load
    const observer = new MutationObserver(mutations => {
      hideLovableBadge();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    return () => observer.disconnect();
  }, []);

  const isActive = (route: string) => {
    return path === route;
  };

  return (
    <div className="pb-16 md:pb-0 min-h-screen bg-gray-50 hide-scrollbar" dir="rtl">
      {/* Main content */}
      <main className="hide-scrollbar">
        {children}
      </main>
      
      {/* Bottom Navigation - Always show on mobile */}
      {isMobile && (
        <nav className="bottom-nav">
          <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
            <Home size={24} />
            <span>الرئيسية</span>
          </Link>

          <Link to="/categories" className={`bottom-nav-item ${isActive('/categories') ? 'active' : ''}`}>
            <Grid size={24} />
            <span>الأقسام</span>
          </Link>

          <Link to="/cart" className={`bottom-nav-item relative ${isActive('/cart') ? 'active' : ''}`}>
            <ShoppingCart size={24} />
            <span>السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 right-6 md:right-10 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <Link to="/account" className={`bottom-nav-item ${isActive('/account') ? 'active' : ''}`}>
            <User size={24} />
            <span>الحساب</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

export default MainLayout;
