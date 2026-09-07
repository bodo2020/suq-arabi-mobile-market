import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ChevronLeft, MapPin, Sparkles, PackageCheck, Clock3 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import CategoryItem from '@/components/ui/CategoryItem';
import StoreStructuredData from '@/components/seo/StoreStructuredData';
import { getCategories, supabase, MainCategory } from '@/lib/supabase';
import BannerSkeleton from '@/components/ui/BannerSkeleton';
import CategorySkeleton from '@/components/ui/CategorySkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
const ProductCollectionsSection=lazy(()=>import('@/components/sections/ProductCollectionsSection'));
const BannersContainer=lazy(()=>import('@/components/ui/BannersContainer'));

const Index=()=>{
 const navigate=useNavigate(); const [address,setAddress]=useState('');
 const categoriesQuery=useQuery({queryKey:['categories'],queryFn:getCategories,staleTime:300000,refetchOnWindowFocus:false});
 const bannersQuery=useQuery({queryKey:['active-banners'],queryFn:async()=>{const {data,error}=await supabase.from('banners').select('*').eq('active',true).order('position');if(error)throw error;return data||[];},staleTime:300000,refetchOnWindowFocus:false});
 useEffect(()=>{try{const selected=JSON.parse(localStorage.getItem('selectedAddress')||'null');setAddress(selected?.address||localStorage.getItem('userAddress')||localStorage.getItem('userArea')||'');}catch{setAddress(localStorage.getItem('userAddress')||'');}},[]);
 const categories=categoriesQuery.data||[];
 const category=(cat:MainCategory)=>navigate(`/category/${cat.id}`);
 return <MainLayout><StoreStructuredData/><TopNavBar onSearchFocus={()=>navigate('/search')}/>
  <div className="mx-auto max-w-7xl px-3 pb-10 pt-4 sm:px-4 md:pt-6">
   <section className="mb-4 overflow-hidden rounded-3xl bg-gradient-to-l from-[#005931] to-[#087545] px-5 py-5 text-white shadow-sm sm:px-7 sm:py-7">
    <div className="flex items-center gap-2 text-xs font-semibold text-green-100"><Sparkles size={15}/>مش مجرد ماركت</div>
    <h1 className="mt-2 text-2xl font-bold leading-relaxed sm:text-3xl">احتياجات بيتك أقرب وأسهل</h1>
    <p className="mt-1 max-w-xl text-sm leading-6 text-green-50/90">اختار منتجاتك، راجع سلتك، وحدد عنوان التوصيل في خطوات بسيطة.</p>
    <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><PackageCheck size={14}/>اختيارات واضحة</span><span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><Clock3 size={14}/>طلب أسرع</span></div>
   </section>
   <button onClick={()=>navigate('/address-manager')} className="mb-5 flex min-h-16 w-full items-center gap-3 rounded-2xl border border-green-100 bg-white p-4 text-right shadow-sm hover:border-green-200" aria-label={address?'تغيير عنوان التوصيل':'إضافة عنوان توصيل'}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-primary"><MapPin size={20}/></span><span className="min-w-0 flex-1"><span className="block text-xs text-gray-500">التوصيل إلى</span><strong className="block truncate text-sm text-gray-900">{address||'اختار عنوان التوصيل'}</strong></span><ChevronLeft size={20} className="text-primary"/>
   </button>
   {bannersQuery.isLoading?<BannerSkeleton/>:(bannersQuery.data?.length||0)>0&&<Suspense fallback={<BannerSkeleton/>}><div className="mb-7 overflow-hidden rounded-3xl shadow-sm"><BannersContainer banners={bannersQuery.data!}/></div></Suspense>}
   <section className="mb-8 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
    <div className="mb-4 flex items-center justify-between"><div><h2 className="text-xl font-bold">تسوق حسب القسم</h2><p className="mt-1 text-xs text-gray-500">وصل للي محتاجه بسرعة</p></div><Link to="/categories" className="flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-green-50">عرض الكل<ChevronLeft size={17}/></Link></div>
    {categoriesQuery.isLoading?<div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">{Array.from({length:7}).map((_,i)=><CategorySkeleton key={i}/>)}</div>:categoriesQuery.isError?<div className="rounded-2xl bg-gray-50 p-6 text-center"><p className="mb-3 text-sm text-gray-600">تعذّر تحميل الأقسام</p><Button variant="outline" onClick={()=>categoriesQuery.refetch()}>إعادة المحاولة</Button></div>:<div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 scrollbar-hide md:grid md:grid-cols-6 md:overflow-visible lg:grid-cols-8">{categories.slice(0,8).map(cat=><div key={cat.id} className="w-24 shrink-0 snap-start md:w-auto"><CategoryItem category={cat} onClick={category}/></div>)}</div>}
   </section>
   <section><div className="mb-4"><h2 className="text-xl font-bold">مختارات المعداوي</h2><p className="mt-1 text-xs text-gray-500">منتجات مختارة عشان تسوقك يبقى أسهل</p></div><Suspense fallback={<div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-64 rounded-2xl"/>)}</div>}><ProductCollectionsSection/></Suspense></section>
  </div>
 </MainLayout>;
};
export default Index;
