import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, User, Tag } from 'lucide-react';
import BrandBagIcon from '@/components/brand/BrandBagIcon';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

const links=[{to:'/',label:'الرئيسية',icon:Home},{to:'/categories',label:'الأقسام',icon:Grid},{to:'/offers',label:'العروض',icon:Tag},{to:'/cart',label:'الشنطة',icon:BrandBagIcon},{to:'/account',label:'الحساب',icon:User}];

// Last cart count the nav showed (across page changes), so the bag only hops
// when something was actually added, not on every navigation.
let lastNavCartCount: number | null = null;
// Tab the bubble sat behind on the previous page: each page mounts its own
// nav, so start there and slide to the new tab instead of jumping.
let lastNavIndex: number | null = null;

const MainLayout: React.FC<{children:React.ReactNode; hideBottomNav?:boolean}> = ({children,hideBottomNav=false}) => {
 const {pathname}=useLocation(); const {getTotalItems}=useCart(); const mobile=useIsMobile(); const count=getTotalItems();
 React.useEffect(()=>{document.body.dir='rtl';},[]);
 const bagHop=lastNavCartCount!==null&&count>lastNavCartCount;
 React.useEffect(()=>{lastNavCartCount=count;},[count]);
 const active=(to:string)=>to==='/'?pathname==='/':to==='/offers'?(pathname==='/offers'||pathname==='/flash-sale'):pathname.startsWith(to);
 const activeIndex = links.findIndex(link => active(link.to));
 const [bubbleIndex, setBubbleIndex] = React.useState(() => (lastNavIndex !== null && lastNavIndex >= 0 && activeIndex >= 0 ? lastNavIndex : activeIndex));
 React.useEffect(() => {
  const frame = window.requestAnimationFrame(() => setBubbleIndex(activeIndex));
  lastNavIndex = activeIndex;
  return () => window.cancelAnimationFrame(frame);
 }, [activeIndex]);
 return <div className={`app-main-layout min-h-screen bg-[#f6f8f7] ${hideBottomNav?'pb-6':'pb-24 md:pb-0'}`} dir="rtl"><main>{children}</main>{mobile&&!hideBottomNav&&(
  <nav className="bottom-nav" aria-label="التنقل السفلي">
   {/* Green bubble that slides behind the current tab. */}
   <span aria-hidden="true" className={`bottom-nav__indicator ${activeIndex < 0 ? 'is-hidden' : ''}`} style={{ '--i': Math.max(0, bubbleIndex) } as React.CSSProperties} />
   {links.map(({to,label,icon:Icon})=>{
    const isActive = active(to);
    return (
     <Link key={to} to={to} aria-current={isActive?'page':undefined} className={`bottom-nav-item ${isActive?'active':''}`}>
      <span className="bottom-nav-item__icon">
       {to==='/cart'
        // The cart is the brand bag itself, in the logo's colours (white and
        // yellow inside the green bubble), with a little hop when items are added.
        ?<BrandBagIcon key={count} size={23} strokeWidth={isActive?2.4:2} tone={isActive?'onGreen':count>0?'brand':'mono'} className={bagHop?'brand-bag-hop':undefined}/>
        :<Icon size={21} strokeWidth={isActive?2.5:2}/>}
       {to==='/cart'&&count>0&&<span key={`n${count}`} className={`${bagHop?'brand-quantity-pop ':''}bottom-nav__badge`}>{count>99?'99+':count}</span>}
      </span>
      <span className="bottom-nav-item__label">{label}</span>
     </Link>
    );
   })}
  </nav>
 )}</div>;
};
export default MainLayout;
