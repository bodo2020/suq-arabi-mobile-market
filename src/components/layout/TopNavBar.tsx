import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Grid, Heart, Home, Package } from 'lucide-react';
import './home-header-motion.css';
import SearchBar from '@/components/ui/SearchBar';
import CustomerNotificationBell from '@/components/CustomerNotificationBell';
import HeaderBrand from './header/HeaderBrand';
import HeaderDelivery from './header/HeaderDelivery';
import HeaderActions from './header/HeaderActions';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

/** A page asks for a *purpose*, not a pile of visual hide/show flags.
 * Legacy flags remain supported while the rest of the app migrates.
 */
export type CustomerHeaderVariant = 'hero' | 'catalog' | 'search' | 'title';

interface TopNavBarProps {
  variant?: CustomerHeaderVariant;
  searchPlaceholder?: string;
  onSearchFocus?: () => void;
  searchProps?: Partial<React.ComponentProps<typeof SearchBar>>;
  hideLogo?: boolean;
  hideSearch?: boolean;
  hideCart?: boolean;
  pageTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
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
  variant,
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
  const headerRef = React.useRef<HTMLElement | null>(null);
  const expandedHeaderHeightRef = React.useRef(0);
  const scrollFrameRef = React.useRef<number | null>(null);
  const [homeCollapsed, setHomeCollapsed] = React.useState(false);

  const pageIsSearch = location.pathname === '/search';
  const canShowHero = location.pathname === '/' || location.pathname === '/categories';
  const mode: CustomerHeaderVariant = variant ||
    (homeHero && canShowHero && !hideSearch ? 'hero' :
      pageIsSearch ? 'search' : hideSearch ? 'title' : 'catalog');
  const isHero = mode === 'hero';
  const isSearch = mode === 'search';
  const isTitle = mode === 'title';
  const needsBack = showBackButton || isSearch;
  // Only the mobile home and categories hero headers collapse; all other
  // routes keep the original header. Categories retains its back action.
  const collapsibleHome = isHero && (location.pathname === '/' || location.pathname === '/categories');

  React.useEffect(() => {
    if (!collapsibleHome) return;
    const update = () => {
      scrollFrameRef.current = null;
      if (window.innerWidth >= 768) {
        setHomeCollapsed(false);
        return;
      }
      const offset = Math.max(window.scrollY, document.scrollingElement?.scrollTop || 0);
      // Hysteresis prevents header chatter when the user pauses at the boundary.
      setHomeCollapsed(previous => previous ? offset > 36 : offset >= 112);
    };
    const scheduleUpdate = () => {
      if (scrollFrameRef.current === null) {
        scrollFrameRef.current = window.requestAnimationFrame(update);
      }
    };
    update(); // Restored scroll position / browser Back.
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [collapsibleHome]);

  const goBack = () => {
    if (onBack) onBack();
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };
  const openSearch = () => {
    if (onSearchFocus) onSearchFocus();
    else if (!pageIsSearch) navigate('/search');
  };
  const openAddress = onAddressClick || (() => navigate('/address-manager'));
  const showBrandOnCompact = !isSearch && !isTitle;
  const showSearch = !isTitle && !hideSearch;
  const signedIn = Boolean(user);

  // Always measure the actual fixed header. Switching search, keyboard,
  // orientation or delivery address never leaves page content under it.
  React.useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => {
      const height = Math.ceil(header.getBoundingClientRect().height);
      // Keep the original homepage content offset stable while its fixed
      // header changes size. Otherwise the page jumps and re-triggers scroll.
      if (collapsibleHome && window.innerWidth < 768) {
        if (!homeCollapsed) expandedHeaderHeightRef.current = height;
        const reserved = Math.max(height, expandedHeaderHeightRef.current);
        document.documentElement.style.setProperty('--top-nav-height', `${reserved}px`);
      } else {
        document.documentElement.style.setProperty('--top-nav-height', `${height}px`);
      }
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(header);
    window.addEventListener('orientationchange', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('orientationchange', update);
    };
  }, [mode, pageTitle, needsBack, collapsibleHome, homeCollapsed]);

  const search = (appearance: 'hero' | 'category' | 'compact' | 'default') => (
    <SearchBar
      placeholder={appearance === 'compact' ? 'ابحث في سوبر ماركو…' : searchPlaceholder}
      {...searchProps}
      readOnly={isSearch ? false : true}
      animatedSuggestions={(appearance === 'hero' || appearance === 'compact') && !isSearch}
      appearance={appearance}
      showBarcode={true}
      onFocus={isSearch ? undefined : openSearch}
    />
  );

  return (
    <header
      ref={headerRef}
      data-customer-header={mode}
      data-home-collapsed={collapsibleHome ? String(homeCollapsed) : undefined}
      className={`native-safe-top fixed inset-x-0 top-0 z-50 border-b text-[#005931] ${
        collapsibleHome ? 'home-top-nav' : ''
      } ${
        isHero && !(collapsibleHome && homeCollapsed)
          ? 'border-[#d6eee0] bg-gradient-to-b from-[#e6f9ee] via-[#f1fbf5] to-white md:bg-white'
          : 'border-emerald-100 bg-white'
      }`}
    >
      {isHero && !(collapsibleHome && homeCollapsed) && (
        <div className={`mx-auto max-w-7xl px-3 pb-3 pt-3 sm:px-5 md:hidden ${collapsibleHome ? 'home-header-expanded' : ''}`}>
          <div className="flex min-h-[66px] items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1 pt-2">
              {needsBack && (
                <button type="button" onClick={goBack} aria-label="رجوع" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 active:bg-emerald-50">
                  <ArrowRight size={19} />
                </button>
              )}
              <HeaderBrand category={needsBack} />
            </div>
            <div className={`min-w-0 ${needsBack ? 'max-w-[50%]' : 'max-w-[55%]'}`}>
              <HeaderDelivery
                addressLabel={addressLabel}
                addressLoading={addressLoading}
                onAddressClick={openAddress}
                deliveryEstimateMinutes={deliveryEstimateMinutes}
                compact={needsBack}
              />
            </div>
          </div>
          <div className="mt-2">{search('hero')}</div>
        </div>
      )}

      {collapsibleHome && homeCollapsed && (
        <div className="home-header-compact mx-auto max-w-7xl px-3 py-2 sm:px-5 md:hidden">
          <div className="flex h-[52px] min-w-0 items-center gap-1.5 rounded-full border border-[#b8d8c8] bg-white px-1.5 shadow-[0_4px_14px_rgba(0,89,49,.08)]">
            {needsBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="رجوع"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#005931] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#005931]"
              >
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 flex-1">{search('compact')}</div>
          </div>
        </div>
      )}

      <div className={isHero ? 'hidden md:block' : 'block'}>
        <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4">
          <div className="flex min-h-11 items-center gap-2">
            {needsBack && (
              <button type="button" onClick={goBack} aria-label="رجوع" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 active:bg-emerald-100">
                <ArrowRight size={21} />
              </button>
            )}
            {showBrandOnCompact && (
              <span className={`shrink-0 ${hideLogo ? 'md:hidden' : ''}`}>
                <span className="md:hidden"><HeaderBrand compact iconOnly /></span>
                <span className="hidden md:inline-flex"><HeaderBrand compact iconOnly={hideLogo} /></span>
              </span>
            )}
            {isTitle ? (
              <>
                <h1 className="min-w-0 flex-1 truncate text-center text-base font-extrabold text-slate-900 sm:text-lg">
                  {pageTitle || 'سوبر ماركو'}
                </h1>
                <HeaderBrand compact iconOnly />
              </>
            ) : showSearch ? (
              <div className="min-w-0 flex-1 md:max-w-2xl">
                {search(isSearch ? 'default' : 'category')}
              </div>
            ) : null}
            {!isSearch && !isTitle && signedIn && <CustomerNotificationBell />}
            {!isTitle && !isSearch && <HeaderActions cartCount={getTotalItems()} signedIn={signedIn} showCart={!hideCart} />}
          </div>
          <nav className="mt-2 hidden items-center gap-1 border-t border-gray-100 pt-2 md:flex" aria-label="التنقل الرئيسي">
            {desktopLinks.filter(item => !item.authOnly || signedIn).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={location.pathname === to ? 'page' : undefined}
                className={`flex min-h-8 items-center gap-2 rounded-xl px-3 text-sm transition-colors ${
                  location.pathname === to ? 'bg-emerald-50 font-bold text-[#005931]' : 'text-slate-600 hover:bg-emerald-50'
                }`}
              >
                <Icon size={16} aria-hidden="true" />{label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default React.memo(TopNavBar);
