import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Home, Grid, User, Heart, ShoppingCart, Package, MapPin, Zap } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import BrandWordmark from '@/components/brand/BrandWordmark';
import CustomerNotificationBell from '@/components/CustomerNotificationBell';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

interface TopNavBarProps {
  searchPlaceholder?: string;
  onSearchFocus?: () => void;
  searchProps?: Partial<React.ComponentProps<typeof SearchBar>>;
  hideLogo?: boolean;
  hideSearch?: boolean;
  hideCart?: boolean;
  pageTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  // The home and categories headers share the delivery selector and search style.
  homeHero?: boolean;
  addressLabel?: string;
  addressLoading?: boolean;
  onAddressClick?: () => void;
  deliveryEstimateMinutes?: number | null;
}

const desktopLinks = [
  { to: '/', label: 'الرئيسية', icon: Home },
  { to: '/categories', label: 'الأقسام', icon: Grid },
  { to: '/favorites', label: 'المفضلة', icon: Heart, authOnly: true },
  { to: '/orders', label: 'طلباتي', icon: Package, authOnly: true },
];

const TopNavBar: React.FC<TopNavBarProps> = ({
  searchPlaceholder = 'دور على منتج أو قسم…',
  onSearchFocus,
  searchProps = {},
  hideLogo = false,
  hideSearch = false,
  hideCart = false,
  pageTitle,
  showBackButton = false,
  onBack,
  homeHero = false,
  addressLabel,
  addressLoading = false,
  onAddressClick,
  deliveryEstimateMinutes,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { user } = useUser();
  const cartCount = getTotalItems();
  const headerRef = React.useRef<HTMLElement | null>(null);
  const searchPage = location.pathname === '/search';
  const showHomeHero = homeHero && !hideSearch;
  const focus = () => {
    if (onSearchFocus) onSearchFocus();
    else if (!searchPage) navigate('/search');
  };
  const eta = Number.isFinite(deliveryEstimateMinutes) && Number(deliveryEstimateMinutes) > 0
    ? Math.round(Number(deliveryEstimateMinutes))
    : null;

  React.useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const publishHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--top-nav-height', `${height}px`);
    };
    publishHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(publishHeight) : null;
    observer?.observe(header);
    window.addEventListener('resize', publishHeight);
    window.addEventListener('orientationchange', publishHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', publishHeight);
      window.removeEventListener('orientationchange', publishHeight);
    };
  }, [hideLogo, hideSearch, pageTitle, showBackButton, user, showHomeHero]);

  return (
    <header
      ref={headerRef}
      className={`native-safe-top fixed inset-x-0 top-0 z-50 text-primary ${
        showHomeHero
          ? 'border-b border-[#d6eee0] bg-gradient-to-b from-[#e6f9ee] via-[#f1fbf5] to-white md:bg-white'
          : 'border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur-xl'
      }`}
    >
      {showHomeHero && (
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-3 sm:px-5 md:hidden">
          <div className="flex min-h-[70px] items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 pt-2">
              {showBackButton && (
                <button
                  type="button"
                  onClick={onBack || (() => navigate(-1))}
                  aria-label="رجوع"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#005931] shadow-sm active:bg-[#e0f3e9]"
                >
                  <ArrowRight size={19} />
                </button>
              )}
              <Link to="/" className="min-w-0" aria-label="سوبر ماركو، الرئيسية">
                <BrandWordmark className={showBackButton ? "brand-name--home brand-name--categories" : "brand-name--home"} />
              </Link>
            </div>
            <div className={`flex min-w-0 ${showBackButton ? 'max-w-[49%]' : 'max-w-[55%]'} flex-col items-end gap-2 text-left`}>
              <div className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-2xl border border-[#c4e5d2] bg-white/85 px-3 py-1.5 text-xs font-extrabold text-[#005931] shadow-[0_2px_10px_rgba(0,89,49,.04)]">
                <Zap size={17} className="shrink-0 text-[#dda500]" fill="currentColor" strokeWidth={1.8} />
                <span className="truncate">{eta ? `توصيل خلال ${eta} دقيقة` : 'توصيل سريع لحد بابك'}</span>
              </div>
              <button
                type="button"
                onClick={onAddressClick || (() => navigate('/address-manager'))}
                className="flex max-w-full items-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-[#29624b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]"
                title={addressLabel || 'حدد عنوان التوصيل'}
                aria-label={addressLabel ? `تغيير عنوان التوصيل: ${addressLabel}` : 'تحديد عنوان التوصيل'}
              >
                <MapPin size={15} className="shrink-0 text-[#005931]" />
                <span className="min-w-0 truncate" dir="auto">
                  {addressLoading ? 'جاري تحميل عنوانك…' : addressLabel || 'حدد عنوان التوصيل'}
                </span>
                <ChevronDown size={14} className="shrink-0" />
              </button>
            </div>
          </div>
          <div className="mt-3">
            <SearchBar
              placeholder={searchPlaceholder}
              readOnly
              onFocus={focus}
              appearance="hero"
              animatedSuggestions
              showBarcode={false}
            />
          </div>
        </div>
      )}

      <div className={showHomeHero ? 'hidden md:block' : 'block'}>
        <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4">
          <div className="flex min-h-11 items-center gap-2.5">
            {showBackButton && (
              <button
                onClick={onBack || (() => navigate(-1))}
                aria-label="رجوع"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-cream active:scale-95"
              ><ArrowRight size={21} /></button>
            )}
            {!hideLogo && (
              <Link to="/" aria-label="الرئيسية" className="shrink-0 rounded-xl active:scale-95">
                <BrandWordmark className="brand-name--header" />
              </Link>
            )}
            {pageTitle && hideSearch
              ? <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{pageTitle}</h1>
              : !hideSearch && (
                <div className="min-w-0 flex-1 md:max-w-2xl">
                  <SearchBar
                    placeholder={searchPlaceholder}
                    onFocus={focus}
                    readOnly={!searchPage}
                    {...searchProps}
                  />
                </div>
              )}
            {user && <CustomerNotificationBell />}
            <div className="mr-auto hidden items-center gap-1 md:flex">
              {!hideCart && (
                <Link to="/cart" className="relative flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-brand-cream">
                  <ShoppingCart size={19} />
                  السلة
                  {cartCount > 0 && <span className="rounded-full bg-white px-1.5 text-xs text-primary">{cartCount}</span>}
                </Link>
              )}
              <Link to={user ? '/account' : '/phone-login'} className="flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-brand-cream">
                <User size={19} />{user ? 'حسابي' : 'دخول'}
              </Link>
            </div>
          </div>
          <nav className="mt-2 hidden items-center gap-1 border-t border-gray-100 pt-2 md:flex" aria-label="التنقل الرئيسي">
            {desktopLinks.filter(item => !item.authOnly || user).map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${location.pathname === to ? 'bg-brand-cream font-bold' : 'text-gray-600 hover:bg-brand-cream'}`}>
                <Icon size={17} />{label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default React.memo(TopNavBar);
