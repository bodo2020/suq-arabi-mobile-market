import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Home, Grid, User, Heart, ShoppingCart, Package } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import CustomerNotificationBell from '@/components/CustomerNotificationBell';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

interface TopNavBarProps { searchPlaceholder?: string; onSearchFocus?: () => void; searchProps?: any; hideLogo?: boolean; hideSearch?: boolean; hideCart?: boolean; pageTitle?: string; showBackButton?: boolean; onBack?: () => void; }
const desktopLinks = [
  { to: '/', label: 'الرئيسية', icon: Home }, { to: '/categories', label: 'الأقسام', icon: Grid },
  { to: '/favorites', label: 'المفضلة', icon: Heart, authOnly: true }, { to: '/orders', label: 'طلباتي', icon: Package, authOnly: true },
];
const TopNavBar: React.FC<TopNavBarProps> = ({ searchPlaceholder='دور على منتج أو قسم…', onSearchFocus, searchProps={}, hideLogo=false, hideSearch=false, hideCart=false, pageTitle, showBackButton=false, onBack }) => {
  const navigate=useNavigate(); const location=useLocation(); const { getTotalItems }=useCart(); const { user }=useUser(); const cartCount=getTotalItems();
  const headerRef = React.useRef<HTMLElement | null>(null);
  const searchPage=location.pathname==='/search';
  const focus=()=>{ if(onSearchFocus) onSearchFocus(); else if(!searchPage) navigate('/search'); };

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
  }, [hideLogo, hideSearch, pageTitle, showBackButton, user]);

  return <header ref={headerRef} className="native-safe-top fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 text-[#005931] shadow-sm backdrop-blur-xl">
    <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4">
      <div className="flex min-h-11 items-center gap-2.5">
        {showBackButton && <button onClick={onBack||(()=>navigate(-1))} aria-label="رجوع" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 active:scale-95"><ArrowRight size={21}/></button>}
        {!hideLogo && <Link to="/" aria-label="الرئيسية" className="shrink-0 rounded-xl active:scale-95"><img src="/elmadawy-logo.png" alt="المعداوي ماركت" className="h-10 w-10 rounded-xl object-contain md:h-11 md:w-11" width="44" height="44" /></Link>}
        {pageTitle && hideSearch ? <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{pageTitle}</h1> : !hideSearch && <div className="min-w-0 flex-1 md:max-w-2xl"><SearchBar placeholder={searchPlaceholder} onFocus={focus} readOnly={!searchPage} {...searchProps}/></div>}
        {user && <CustomerNotificationBell />}
        <div className="mr-auto hidden items-center gap-1 md:flex">
          {!hideCart&&<Link to="/cart" className="relative flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-green-50"><ShoppingCart size={19}/>السلة{cartCount>0&&<span className="rounded-full bg-white px-1.5 text-xs text-primary">{cartCount}</span>}</Link>}
          <Link to={user?'/account':'/phone-login'} className="flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-green-50"><User size={19}/>{user?'حسابي':'دخول'}</Link>
        </div>
      </div>
      <nav className="mt-2 hidden items-center gap-1 border-t border-gray-100 pt-2 md:flex" aria-label="التنقل الرئيسي">{desktopLinks.filter(x=>!x.authOnly||user).map(({to,label,icon:Icon})=><Link key={to} to={to} aria-current={location.pathname===to?'page':undefined} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${location.pathname===to?'bg-green-50 font-bold':'text-gray-600 hover:bg-green-50'}`}><Icon size={17}/>{label}</Link>)}</nav>
    </div>
  </header>;
};
export default React.memo(TopNavBar);
