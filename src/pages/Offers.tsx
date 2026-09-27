import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, Search, Tag, Clock3 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import ProductCard from '@/components/ui/ProductCard';
import BrandLoader from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { getCategories, getProducts } from '@/lib/supabase';
import { productUnitPrice } from '@/lib/productPurchase';
import { getCatalogCampaigns, campaignState, countdown } from '@/lib/catalogCampaigns';
export default function Offers() {
 const location=useLocation(),navigate=useNavigate(),flash=location.pathname==='/flash-sale';
 const [now,setNow]=useState(Date.now()),[search,setSearch]=useState(''),[category,setCategory]=useState(''),[seller,setSeller]=useState(''),[sort,setSort]=useState('discount'),[campaignId,setCampaignId]=useState(''),[limit,setLimit]=useState(40);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[]);
 useEffect(()=>{setCampaignId('');setLimit(40)},[flash]);
 useEffect(()=>setLimit(40),[search,category,seller,sort,campaignId]);
 const products=useQuery({queryKey:['offers-catalog'],queryFn:()=>getProducts(),staleTime:15000,refetchInterval:60000});
 const campaigns=useQuery({queryKey:['catalog-campaigns'],queryFn:getCatalogCampaigns,staleTime:15000,refetchInterval:60000});
 const categories=useQuery({queryKey:['categories'],queryFn:getCategories});
 const relevant=(campaigns.data||[]).filter(c=>c.kind===(flash?'flash':'offer')&&campaignState(c,now)!=='ended');
 const live=relevant.filter(c=>campaignState(c,now)==='live');
 const liveIds=new Set((campaignId?live.filter(c=>c.id===campaignId):live).flatMap(c=>c.product_ids));
 const sellers=useMemo(()=>[...new Map((products.data||[]).filter(p=>p.merchant_id).map(p=>[p.merchant_id!,p.merchant_name||'متجر شريك'])).entries()],[products.data]);
 const discount=(p:NonNullable<typeof products.data>[number])=>Math.round((1-productUnitPrice(p)/Number(p.price))*100);
 const visible=(products.data||[]).filter(p=>p.quantity>0&&productUnitPrice(p)<Number(p.price)&&(!flash||liveIds.has(p.id))&&(!campaignId||liveIds.has(p.id))&&(!category||p.main_category_id===category)&&(!seller||(seller==='owned'?p.commerce_source!=='marketplace':p.merchant_id===seller))&&p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a,b)=>sort==='low'?productUnitPrice(a)-productUnitPrice(b):sort==='high'?productUnitPrice(b)-productUnitPrice(a):discount(b)-discount(a));
 const loading=products.isLoading||(flash&&campaigns.isLoading),error=products.isError||(flash&&campaigns.isError);
 return <MainLayout><TopNavBar hideLogo hideSearch pageTitle={flash?'الفلاش سيل':'العروض'} showBackButton onBack={()=>navigate(-1)}/><main className="mx-auto max-w-7xl px-3 pb-10 pt-4">
 <section className={'mb-5 rounded-3xl p-6 text-white '+(flash?'bg-gradient-to-l from-orange-600 to-rose-600':'bg-gradient-to-l from-emerald-800 to-emerald-600')}>
 <div className="flex items-center gap-3">{flash?<Flame size={32}/>:<Tag size={32}/>}<div><h1 className="text-2xl font-black">{flash?'عروض محدودة الوقت':'وفر في كل طلب'}</h1><p className="mt-1 text-sm opacity-90">عروض المعداوي والمحلات الشريكة المتاحة لعنوانك</p></div></div>
 <nav className="mt-5 flex gap-3"><Link className={'rounded-full px-4 py-2 '+(!flash?'bg-white text-emerald-800':'bg-white/15')} to="/offers">كل العروض</Link><Link className={'rounded-full px-4 py-2 '+(flash?'bg-white text-orange-700':'bg-white/15')} to="/flash-sale">الفلاش سيل ⚡</Link></nav></section>
 {relevant.length>0&&<div className="mb-5 flex gap-3 overflow-x-auto pb-2">{relevant.map(c=>{const state=campaignState(c,now);return <button key={c.id} disabled={state!=='live'} onClick={()=>setCampaignId(v=>v===c.id?'':c.id)} className={'min-w-60 rounded-2xl border bg-white p-4 text-right '+(campaignId===c.id?'border-primary':'border-slate-100')}><strong className="block">{c.title}</strong><p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.description}</p><span className="mt-3 flex items-center gap-2 text-xs font-bold text-orange-600"><Clock3 size={14}/>{state==='upcoming'?'يبدأ بعد ':'ينتهي بعد '}<span dir="ltr">{countdown(state==='upcoming'?c.starts_at:c.ends_at,now)}</span></span></button>})}</div>}
 <div className="mb-5 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-4"><label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400"/><input aria-label="بحث في العروض" className="h-10 w-full rounded-xl border pr-9" placeholder="ابحث عن عرض" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="القسم" className="rounded-xl border p-2" value={category} onChange={e=>setCategory(e.target.value)}><option value="">كل الأقسام</option>{categories.data?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select aria-label="البائع" className="rounded-xl border p-2" value={seller} onChange={e=>setSeller(e.target.value)}><option value="">كل البائعين</option><option value="owned">ماركت المعداوي</option>{sellers.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><select aria-label="ترتيب العروض" className="rounded-xl border p-2" value={sort} onChange={e=>setSort(e.target.value)}><option value="discount">أعلى خصم</option><option value="low">الأقل سعرًا</option><option value="high">الأعلى سعرًا</option></select></div>
 {loading?<div className="flex justify-center py-16"><BrandLoader size="lg"/></div>:error?<div className="rounded-2xl bg-red-50 p-6 text-center"><p>تعذر تحميل العروض</p><Button onClick={()=>{void products.refetch();void campaigns.refetch()}}>إعادة المحاولة</Button></div>:!visible.length?<div className="rounded-3xl bg-white p-10 text-center"><Tag className="mx-auto text-slate-300" size={40}/><h2 className="mt-3 font-bold">{flash&&!live.length?'لا يوجد فلاش سيل نشط الآن':'لا توجد عروض مطابقة حاليًا'}</h2><p className="mt-2 text-sm text-slate-500">{flash?'تابع العروض القادمة أو تصفح باقي الخصومات':'جرّب قسمًا أو بائعًا آخر'}</p>{flash&&<Link to="/offers" className="mt-4 block text-primary">تصفح كل العروض</Link>}</div>:<><p className="mb-3 text-sm text-slate-500">{visible.length} عرض متاح</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visible.slice(0,limit).map(p=><ProductCard key={p.id} product={p}/>)}</div>{visible.length>limit&&<Button className="mx-auto mt-6 block" variant="outline" onClick={()=>setLimit(v=>v+40)}>عرض المزيد</Button>}</>}
 <p className="mt-6 text-xs text-slate-400">الأسعار والتوفر تُراجع عند إتمام الطلب. انتهاء الحملة يُنهي ظهورها في الفلاش سيل، والسعر يتبع تسعير المنتج الحالي.</p>
 </main></MainLayout>;
}

