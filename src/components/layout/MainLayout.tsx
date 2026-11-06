import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, User, Tag } from 'lucide-react';
import BrandBagIcon from '@/components/brand/BrandBagIcon';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

const links=[{to:'/',label:'الرئيسية',icon:Home},{to:'/categories',label:'الأقسام',icon:Grid},{to:'/offers',label:'العروض',icon:Tag},{to:'/cart',label:'السلة',icon:BrandBagIcon},{to:'/account',label:'الحساب',icon:User}];

// Last cart count the nav showed (across page changes), so the bag only hops
// when something was actually added, not on every navigation.
let lastNavCartCount: number | null = null;

const MainLayout: React.FC<{children:React.ReactNode; hideBottomNav?:boolean}> = ({children,hideBottomNav=false}) => {
 const {pathname}=useLocation(); const {getTotalItems}=useCart(); const mobile=useIsMobile(); const count=getTotalItems();
 React.useEffect(()=>{document.body.dir='rtl';},[]);
 const bagHop=lastNavCartCount!==null&&count>lastNavCartCount;
 React.useEffect(()=>{lastNavCartCount=count;},[count]);
 const active=(to:string)=>to==='/'?pathname==='/':to==='/offers'?(pathname==='/offers'||pathname==='/flash-sale'):pathname.startsWith(to);
 return <div className={`app-main-layout min-h-screen bg-[#f6f8f7] ${hideBottomNav?'pb-6':'pb-24 md:pb-0'}`} dir="rtl"><main>{children}</main>{mobile&&!hideBottomNav&&<nav className="bottom-nav" aria-label="التنقل السفلي">{links.map(({to,label,icon:Icon})=><Link key={to} to={to} aria-current={active(to)?'page':undefined} className={`bottom-nav-item ${active(to)?'active':''}`}><span className="relative flex h-8 min-w-11 items-center justify-center rounded-xl">{to==='/cart'
   // The cart is the brand bag itself: gold handle and smile once it has items,
   // and a little hop each time the count changes.
   ?<BrandBagIcon key={count} size={23} strokeWidth={active(to)?2.4:2} accent={count>0||active(to)?'#E0A800':'currentColor'} className={bagHop?'brand-bag-hop':undefined}/>
   :<Icon size={21} strokeWidth={active(to)?2.5:2}/>}{to==='/cart'&&count>0&&<span key={`n${count}`} className={`${bagHop?'brand-quantity-pop ':''}absolute -left-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFC120] px-1 text-[10px] font-black text-[#005931] ring-2 ring-white`}>{count>99?'99+':count}</span>}</span><span>{label}</span></Link>)}</nav>}</div>;
};
export default MainLayout;
