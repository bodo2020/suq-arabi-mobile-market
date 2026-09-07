import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Home, Grid, User, Heart, ShoppingCart, Package } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

interface TopNavBarProps {
  searchPlaceholder?: string;
  onSearchFocus?: () => void;
  searchProps?: any;
  hideLogo?: boolean;
  hideSearch?: boolean;
  hideCart?: boolean;
  pageTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const desktopLinks = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/categories', label: 'الأقسام', icon: Grid },
  { to: '/favorites', label: 'المفضلة', icon: Heart, authOnly: true },
  { to: '/orders', label: 'طلباتي', icon: Package, authOnly: true },
];

const TopNavBar: React.FC<TopNavBarProps> = ({
  searchPlaceholder = "البحث عن منتجات، أقسام...",
  onSearchFocus,
  searchProps = {},
  hideLogo = false,
  hideSearch = false,
  hideCart = false,
  pageTitle,
  showBackButton = false,
  onBack
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { user } = useUser();
  const cartCount = getTotalItems();

  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
    } else {
      navigate('/search');
    }
  };

  const isActive = (to: string) => location.pathname === to;

  return (
    <header className="fixed top-0 left-0 right-0 bg-primary text-primary-foreground shadow-lg rounded-b-3xl z-50">
      <div className="mx-auto w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl px-4 py-4">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          {showBackButton}

          {/* Logo */}
          {!hideLogo && (
            <Link to="/" className="shrink-0 transition-transform duration-200 hover:scale-105">
              <img
                src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png"
                alt="الشعار"
                className="h-10 w-auto md:h-12"
                width={120}
                height={48}
                decoding="async"
              />
            </Link>
          )}

          {/* Page Title in center when logo and search are hidden */}
          {pageTitle && hideLogo && hideSearch && (
            <div className="flex-1 text-center">
              <h1 className="text-xl font-bold">{pageTitle}</h1>
            </div>
          )}

          {/* Search Bar */}
          {!hideSearch && (
            <div className="flex-1 max-w-2xl">
              <SearchBar placeholder={searchPlaceholder} onFocus={handleSearchFocus} {...searchProps} />
            </div>
          )}

          {/* Desktop-only actions */}
          <div className="hidden md:flex items-center gap-1 mr-auto">
            {!hideCart && (
              <Link
                to="/cart"
                className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-white/10"
              >
                <ShoppingCart size={20} />
                <span>السلة</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-white text-primary text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              to={user ? '/account' : '/phone-login'}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-white/10"
            >
              <User size={20} />
              <span>{user ? 'حسابي' : 'دخول'}</span>
            </Link>
          </div>
        </div>

        {/* Desktop navigation row */}
        <nav className="hidden md:flex items-center gap-1 mt-3 border-t border-white/15 pt-2">
          {desktopLinks
            .filter(link => !link.authOnly || !!user)
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors duration-200 hover:bg-white/10 ${
                  isActive(to) ? 'bg-white/15 font-bold' : 'font-medium'
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
};

export default React.memo(TopNavBar);

