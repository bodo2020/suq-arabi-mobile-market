import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Home, Grid, User, Heart, ShoppingCart, Package } from 'lucide-react';
import SearchBar from '@/components/ui/SearchBar';
import { useCart } from '@/contexts/useCart';
import { useUser } from '@/contexts/UserContext';

interface TopNavBarProps { searchPlaceholder?: string; onSearchFocus?: () => void; searchProps?: any; hideLogo?: boolean; hideSearch?: boolean; hideCart?: boolean; pageTitle?: string; showBackButton?: boolean; onBack?: () => void; }
const desktopLinks = [
  { to: '/', label: 'الرئيسية', icon: Home }, { to: '/categories', label: 'الأقسام', icon: Grid },
  { to: '/favorites', label: 'المفضلة', icon: Heart, authOnly: true }, { to: '/orders', label: 'طلباتي', icon: Package, authOnly: true },
];
const TopNavBar: React.FC<TopNavBarProps> = ({ searchPlaceholder='دور على منتج أو قسم…', onSearchFocus, searchProps={}, hideLogo=false, hideSearch=false, hideCart=false, pageTitle, showBackButton=false, onBack }) => {
  const navigate=useNavigate(); const location=useLocation(); const { getTotalItems }=useCart(); const { user }=useUser(); const cartCount=getTotalItems();
  const searchPage=location.pathname==='/search';
  const focus=()=>{ if(onSearchFocus) onSearchFocus(); else if(!searchPage) navigate('/search'); };
  return <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#005931]/95 text-white shadow-[0_8px_28px_rgba(0,50,28,.22)] backdrop-blur-xl">
    <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-4">
      <div className="flex min-h-11 items-center gap-2.5">
        {showBackButton && <button onClick={onBack||(()=>navigate(-1))} aria-label="رجوع" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95"><ArrowRight size={21}/></button>}
        {!hideLogo && <Link to="/" aria-label="الرئيسية" className="shrink-0 rounded-xl active:scale-95"><img src="/elmadawy-logo.png" alt="المعداوي ماركت" className="h-10 w-10 rounded-xl object-contain md:h-11 md:w-11" width="44" height="44" /></Link>}
        {pageTitle && hideSearch ? <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold">{pageTitle}</h1> : !hideSearch && <div className="min-w-0 flex-1 md:max-w-2xl"><SearchBar placeholder={searchPlaceholder} onFocus={focus} readOnly={!searchPage} {...searchProps}/></div>}
        {!hideCart && <Link to="/cart" aria-label={`السلة، ${cartCount} منتج`} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 md:hidden"><ShoppingCart size={21}/>{cartCount>0&&<span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-primary">{cartCount>99?'99+':cartCount}</span>}</Link>}
        <div className="mr-auto hidden items-center gap-1 md:flex">
          {!hideCart&&<Link to="/cart" className="relative flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-white/10"><ShoppingCart size={19}/>السلة{cartCount>0&&<span className="rounded-full bg-white px-1.5 text-xs text-primary">{cartCount}</span>}</Link>}
          <Link to={user?'/account':'/phone-login'} className="flex h-11 items-center gap-2 rounded-xl px-3 font-semibold hover:bg-white/10"><User size={19}/>{user?'حسابي':'دخول'}</Link>
        </div>
      </div>
      <nav className="mt-2 hidden items-center gap-1 border-t border-white/10 pt-2 md:flex" aria-label="التنقل الرئيسي">{desktopLinks.filter(x=>!x.authOnly||user).map(({to,label,icon:Icon})=><Link key={to} to={to} aria-current={location.pathname===to?'page':undefined} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm ${location.pathname===to?'bg-white/15 font-bold':'text-white/90 hover:bg-white/10'}`}><Icon size={17}/>{label}</Link>)}</nav>
    </div>
  </header>;
};
export default React.memo(TopNavBar);
