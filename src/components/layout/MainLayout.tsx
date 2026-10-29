import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingCart, User, Tag } from 'lucide-react';
import { useCart } from '@/contexts/useCart';
import { useIsMobile } from '@/hooks/use-mobile';

const links=[{to:'/',label:'الرئيسية',icon:Home},{to:'/categories',label:'الأقسام',icon:Grid},{to:'/offers',label:'العروض',icon:Tag},{to:'/cart',label:'السلة',icon:ShoppingCart},{to:'/account',label:'الحساب',icon:User}];

const MainLayout: React.FC<{children:React.ReactNode; hideBottomNav?:boolean}> = ({children,hideBottomNav=false}) => {
 const {pathname}=useLocation(); const {getTotalItems}=useCart(); const mobile=useIsMobile(); const count=getTotalItems();
 React.useEffect(()=>{document.body.dir='rtl';},[]);
 const active=(to:string)=>to==='/'?pathname==='/':to==='/offers'?(pathname==='/offers'||pathname==='/flash-sale'):pathname.startsWith(to);
 return <div className={`app-main-layout min-h-screen bg-[#f6f8f7] ${hideBottomNav?'pb-6':'pb-24 md:pb-0'}`} dir="rtl"><main>{children}</main>{mobile&&!hideBottomNav&&<nav className="bottom-nav" aria-label="التنقل السفلي">{links.map(({to,label,icon:Icon})=><Link key={to} to={to} aria-current={active(to)?'page':undefined} className={`bottom-nav-item ${active(to)?'active':''}`}><span className="relative flex h-8 min-w-11 items-center justify-center rounded-xl"><Icon size={21} strokeWidth={active(to)?2.5:2}/>{to==='/cart'&&count>0&&<span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">{count>99?'99+':count}</span>}</span><span>{label}</span></Link>)}</nav>}</div>;
};
export default MainLayout;
