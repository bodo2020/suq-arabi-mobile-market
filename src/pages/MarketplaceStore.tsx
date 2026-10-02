import { useEffect,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search,Store } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import TopNavBar from '@/components/layout/TopNavBar';
import BrandLoader from '@/components/ui/BrandLoader';
import MainCategoryProductSections from '@/components/sections/MainCategoryProductSections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMarketplaceStore,getMarketplaceStoreCatalog } from '@/lib/marketplace';

export default function MarketplaceStore(){
 const {branchId=''}=useParams();const navigate=useNavigate();
 const [search,setSearch]=useState(''),[query,setQuery]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),250);return()=>clearTimeout(timer)},[search]);
 useEffect(()=>{setSearch('');setQuery('')},[branchId]);
 const storeQuery=useQuery({queryKey:['marketplace-store',branchId],queryFn:()=>getMarketplaceStore(branchId),enabled:!!branchId,staleTime:15_000,retry:1});
 const productsQuery=useQuery({queryKey:['marketplace-store-products',branchId,query],queryFn:()=>getMarketplaceStoreCatalog(branchId,query,500),enabled:!!branchId&&!!storeQuery.data,staleTime:10_000,retry:1});
 if(storeQuery.isLoading)return <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle="المتجر" showBackButton onBack={()=>navigate(-1)}/><div className="flex min-h-[70vh] items-center justify-center"><BrandLoader size="lg"/></div></MainLayout>;
 const store=storeQuery.data;
 if(!store)return <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle="المتجر" showBackButton onBack={()=>navigate(-1)}/><main className="mx-auto max-w-xl px-4 py-16 text-center" dir="rtl"><Store className="mx-auto h-12 w-12 text-primary"/><h1 className="mt-4 text-xl font-black">المتجر غير متاح لعنوانك الحالي</h1><p className="mt-2 text-sm text-gray-500">ممكن يكون خارج نطاق التوصيل أو متوقف مؤقتًا.</p><Button className="mt-5" onClick={()=>navigate('/stores')}>عرض المتاجر المتاحة</Button></main></MainLayout>;
 return <MainLayout><TopNavBar hideLogo hideSearch hideCart pageTitle={store.merchant_name} showBackButton onBack={()=>navigate(-1)}/><main className="mx-auto max-w-7xl pb-24 pt-1" dir="rtl">
  <div className="px-3 sm:px-5"><section className="relative mb-4 min-h-[135px] overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-l from-[#eefaf4] to-[#ecf8f2] sm:min-h-[145px] sm:rounded-[28px]"><div className="relative flex min-h-[135px] flex-col justify-center p-4 sm:min-h-[145px] sm:p-6"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-primary shadow-sm"><Store size={18}/></div><h1 className="break-words text-xl font-black leading-tight text-slate-950 sm:text-2xl">{store.merchant_name}</h1><p className="mt-1.5 text-xs font-medium text-slate-600 sm:text-sm">{store.branch_name}</p><p className="mt-2 text-xs font-bold text-primary">{productsQuery.data?.length||0} منتج · تسوق حسب الأقسام</p></div></section>
  <div className="relative mb-4"><Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"/><Input aria-label="ابحث داخل المتجر" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث داخل المتجر" className="h-12 rounded-2xl pr-12"/></div></div>
  <div className="px-3 sm:px-5">{productsQuery.isLoading?<div className="flex justify-center py-16"><BrandLoader size="lg"/></div>:productsQuery.isError?<div role="alert" className="rounded-2xl bg-red-50 p-5 text-center text-red-700">تعذر تحميل منتجات المتجر.<Button variant="ghost" onClick={()=>void productsQuery.refetch()}>إعادة المحاولة</Button></div>:!productsQuery.data?.length?<div className="rounded-2xl border border-dashed p-8 text-center text-gray-500">مفيش منتجات مطابقة للبحث حاليًا.</div>:<MainCategoryProductSections key={branchId} products={productsQuery.data}/>}</div></main></MainLayout>;
}
