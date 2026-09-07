import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Home, Grid, User, Heart, ShoppingCart, Package } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/button';
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
  searchPlaceholder = 'ابحث عن منتج أو قسم...',
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
  const isSearchPage = location.pathname === '/search';

  const handleSearchFocus = () => {
    if (onSearchFocus) {
      onSearchFocus();
      return;
    }

    if (!isSearchPage) {
      navigate('/search');
    }
  };

  const isActive = (to: string) => location.pathname === to;
  const resolvedSearchProps = {
    readOnly: !isSearchPage,
    ...searchProps,
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 rounded-b-[24px] border-b border-white/10 bg-primary/95 text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl md:rounded-b-2xl">
      <div className="mx-auto w-full max-w-md px-3 py-3 sm:px-4 md:max-w-5xl lg:max-w-6xl xl:max-w-7xl">
        <div className="flex min-h-12 items-center gap-2.5 sm:gap-3 md:gap-4">
          {showBackButton && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onBack || (() => navigate(-1))}
              className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/10 text-primary-foreground shadow-sm transition-all duration-200 hover:bg-white/20 hover:text-primary-foreground active:scale-95"
              aria-label="الرجوع"
            >
              <ArrowRight size={21} strokeWidth={2.2} />
            </Button>
          )}

          {!hideLogo && (
            <Link
              to="/"
              className="flex h-11 shrink-0 items-center rounded-xl px-0.5 transition-all duration-200 hover:bg-white/5 active:scale-95"
              aria-label="العودة للرئيسية"
            >
              <img
                src="/lovable-uploads/d10815b8-8471-477d-a779-2950224513a7.png"
                alt="المعداوي ماركت"
                className="h-9 w-auto object-contain md:h-10"
                width={120}
                height={48}
                decoding="async"
              />
            </Link>
          )}

          {pageTitle && hideLogo && hideSearch && (
            <div className="min-w-0 flex-1 px-2 text-center">
              <h1 className="truncate text-lg font-bold sm:text-xl">{pageTitle}</h1>
            </div>
          )}

          {!hideSearch && (
            <div className="min-w-0 flex-1 md:max-w-2xl">
              <SearchBar
                placeholder={searchPlaceholder}
                onFocus={handleSearchFocus}
                {...resolvedSearchProps}
              />
            </div>
          )}

          <div className="mr-auto hidden items-center gap-1.5 md:flex">
            {!hideCart && (
              <Link
                to="/cart"
                className="relative flex h-11 items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-semibold transition-all duration-200 hover:border-white/10 hover:bg-white/10 active:scale-[0.98]"
              >
                <ShoppingCart size={20} strokeWidth={2} />
                <span>السلة</span>
                {cartCount > 0 && (
                  <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary shadow-sm">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              to={user ? '/account' : '/phone-login'}
              className="flex h-11 items-center gap-2 rounded-xl border border-transparent px-3 text-sm font-semibold transition-all duration-200 hover:border-white/10 hover:bg-white/10 active:scale-[0.98]"
            >
              <User size={20} strokeWidth={2} />
              <span>{user ? 'حسابي' : 'دخول'}</span>
            </Link>
          </div>
        </div>

        <nav className="mt-2.5 hidden items-center gap-1 border-t border-white/10 pt-2 md:flex" aria-label="التنقل الرئيسي">
          {desktopLinks
            .filter(link => !link.authOnly || !!user)
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition-all duration-200 hover:bg-white/10 active:scale-[0.98] ${
                  isActive(to) ? 'bg-white/15 font-bold shadow-sm' : 'font-medium text-white/90'
                }`}
              >
                <Icon size={18} strokeWidth={isActive(to) ? 2.3 : 2} />
                {label}
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
};

export default React.memo(TopNavBar);
