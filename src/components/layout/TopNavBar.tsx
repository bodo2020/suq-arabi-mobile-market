import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Grid, Heart, Home, Package } from 'lucide-react';
import './home-header-motion.css';
import './header/app-header.css';
import BrandBagIcon from '@/components/brand/BrandBagIcon';
import BrandText from '@/components/brand/BrandText';
import SearchBar from '@/components/ui/SearchBar';
import CustomerNotificationBell from '@/components/CustomerNotificationBell';
import HeaderBrand from './header/HeaderBrand';
import HeaderDelivery from './header/HeaderDelivery';
import HeaderActions from './header/HeaderActions';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

// Page-level flags on <html> replacing `:has()` selectors on html/.app-main-layout.
// Those made every DOM change re-check the whole document and re-style ~3000
// elements per frame while swiping product sheets. Counted, because the
// catalog header and an overlay's header can be mounted at the same time.
const htmlFlagCounts: Record<string, number> = {};
function useHtmlFlag(flag: string, active: boolean) {
  React.useLayoutEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    htmlFlagCounts[flag] = (htmlFlagCounts[flag] || 0) + 1;
    root.classList.add(flag);
    return () => {
      htmlFlagCounts[flag] = Math.max(0, (htmlFlagCounts[flag] || 1) - 1);
      if (!htmlFlagCounts[flag]) root.classList.remove(flag);
    };
  }, [flag, active]);
}

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
  const collapseDistanceRef = React.useRef(84);
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
  // routes keep the original header. Categories is a bottom-nav tab, so like
  // home it has no back action.
  const collapsibleHome = isHero && (location.pathname === '/' || location.pathname === '/categories');
  useHtmlFlag('has-customer-header', true);
  useHtmlFlag('has-home-top-nav', collapsibleHome);

  // The hero is part of the document scroll, not a second fixed viewport.
  // Update CSS variables per animation frame so swipes do not rerender the page.
  React.useLayoutEffect(() => {
    if (!collapsibleHome) return;
    const header = headerRef.current;
    if (!header) return;

    const update = () => {
      scrollFrameRef.current = null;
      if (window.innerWidth >= 768) {
        header.style.removeProperty('--home-scroll-progress');
        setHomeCollapsed(false);
        return;
      }

      const offset = Math.max(0, window.scrollY, document.scrollingElement?.scrollTop || 0);
      const progress = Math.min(1, offset / collapseDistanceRef.current);
      header.style.setProperty('--home-scroll-progress', progress.toFixed(4));
      // A small dead zone stops rapid focus/animation changes near the midpoint.
      setHomeCollapsed(previous => previous ? progress > 0.56 : progress >= 0.72);
    };

    const scheduleUpdate = () => {
      if (scrollFrameRef.current === null) {
        scrollFrameRef.current = window.requestAnimationFrame(update);
      }
    };

    const measure = () => {
      if (window.innerWidth < 768) {
        const safeTop = Number.parseFloat(window.getComputedStyle(header).paddingTop) || 0;
        // Keep only the 68px compact search rail visible after the hero scrolls away.
        // Measuring the real height also handles dynamic text and Android safe areas.
        collapseDistanceRef.current = Math.max(1, Math.ceil(header.getBoundingClientRect().height - safeTop - 68));
        header.style.setProperty('--home-collapse-distance', `${collapseDistanceRef.current}px`);
      }
      scheduleUpdate();
    };

    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(header);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('orientationchange', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
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
  const cartCount = getTotalItems();

  // Other routes still reserve the height of their fixed navbar.
  // The home/categories sticky hero owns its height in normal document flow.
  React.useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => {
      if (collapsibleHome && window.innerWidth < 768) return;
      const height = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--top-nav-height', `${height}px`);
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(header);
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, [mode, pageTitle, needsBack, collapsibleHome]);

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
      className={`native-safe-top fixed inset-x-0 top-0 z-50 border-b text-[#005931] ${collapsibleHome ? 'home-top-nav' : ''} ${
        isHero
          ? 'home-hero-bg border-transparent'
          : 'app-header border-transparent'
      }`}
    >
      {isHero && (
        <div aria-hidden={collapsibleHome && homeCollapsed} inert={collapsibleHome && homeCollapsed} className={`mx-auto max-w-7xl px-3 pb-3 pt-3 sm:px-5 md:hidden ${collapsibleHome ? 'home-header-expanded' : ''}`}>
          <div className="flex min-h-[66px] items-start justify-between gap-2">
            <div className={`flex min-w-0 items-center gap-1 pt-2 ${collapsibleHome ? 'home-hero-brand' : ''}`}>
              {needsBack && (
                <button type="button" onClick={goBack} aria-label="رجوع" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 active:bg-emerald-50">
                  <ArrowRight size={19} />
                </button>
              )}
              <HeaderBrand category={needsBack} />
            </div>
            <div className={`min-w-0 ${needsBack ? 'max-w-[50%]' : 'max-w-[55%]'} ${collapsibleHome ? 'home-hero-delivery' : ''}`}>
              <HeaderDelivery
                addressLabel={addressLabel}
                addressLoading={addressLoading}
                onAddressClick={openAddress}
                deliveryEstimateMinutes={deliveryEstimateMinutes}
                compact={needsBack}
              />
            </div>
          </div>
          <div className={`mt-2 ${collapsibleHome ? 'home-hero-search' : ''}`}>{search('hero')}</div>
        </div>
      )}

      {collapsibleHome && (
        <div aria-hidden={!homeCollapsed} inert={!homeCollapsed} className="home-header-compact mx-auto max-w-7xl px-3 py-2 sm:px-5 md:hidden">
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
            <div className="min-w-0 flex-1">{homeCollapsed && search('compact')}</div>
          </div>
        </div>
      )}

      <div className={isHero ? 'hidden md:block' : 'block'}>
        <div className="mx-auto max-w-7xl px-3 sm:px-4">
          {isTitle ? (
            /* Title pages: back · centred title · cart (or an empty slot so the title stays centred). */
            <div className="app-header__row">
              {needsBack ? (
                <button type="button" onClick={goBack} aria-label="رجوع" className="hdr-btn"><ArrowRight size={20} /></button>
              ) : <span className="hdr-spacer" aria-hidden="true" />}
              <h1 className="app-header__title"><BrandText>{pageTitle || 'سوبر ماركو'}</BrandText></h1>
              {!hideCart ? (
                <Link to="/cart" className="hdr-btn" aria-label={cartCount > 0 ? `الشنطة، ${cartCount} منتجات` : 'الشنطة'}>
                  <BrandBagIcon size={21} strokeWidth={2.2} tone={cartCount > 0 ? 'brand' : 'mono'} />
                  {cartCount > 0 && <span className="hdr-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
                </Link>
              ) : <span className="hdr-spacer" aria-hidden="true" />}
            </div>
          ) : (
            /* Catalog/search pages: back · search · notifications (+ desktop actions). */
            <div className={`app-header__row app-header__row--search ${needsBack ? '' : 'no-start'}`}>
              {needsBack && <button type="button" onClick={goBack} aria-label="رجوع" className="hdr-btn"><ArrowRight size={20} /></button>}
              <div className="flex min-w-0 items-center gap-2">
                {showBrandOnCompact && !hideLogo && <span className="hidden shrink-0 md:inline-flex"><HeaderBrand compact /></span>}
                {showSearch && <div className="min-w-0 flex-1 md:max-w-2xl">{search(isSearch ? 'default' : 'category')}</div>}
              </div>
              {!isSearch && (
                <div className="app-header__end">
                  {signedIn && <CustomerNotificationBell />}
                  <HeaderActions cartCount={cartCount} signedIn={signedIn} showCart={!hideCart} />
                </div>
              )}
            </div>
          )}
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
